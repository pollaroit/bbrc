"use client";

/**
 * Where a book goes in an existing series.
 *
 * Props
 * - `seriesSlug`      the series to place the book in (its books are loaded here).
 * - `newBookTitle`    the title shown on the marker for the book being placed.
 * - `value`           `{ position, shiftLater }`. `position: null` means "at the end".
 *                     This is exactly what the API takes as `seriesPosition` and
 *                     `shiftLater` (add) or `series.position` / `series.shiftLater` (edit).
 * - `onChange`        called with the next value.
 * - `excludeBookSlug` edit mode: the book being moved, hidden from the list so it
 *                     can be dropped into a new slot.
 *
 * Drag the marker (or use the arrows, or the "Place" menu on a phone). The list
 * shows the numbers every book will have afterwards.
 */

import {
	formatSeriesNumber,
	placementToSlot,
	previewSeriesPlacement,
	type SeriesPlacementBook,
	type SeriesPlacementValue,
	slotToPlacement,
	sortSeriesBooks,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { Switch } from "@bbrc/ui/components/switch";
import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const NEW_ID = "__new__";

export type SeriesPositionPickerProps = {
	seriesSlug: string;
	newBookTitle: string;
	value: SeriesPlacementValue;
	onChange: (value: SeriesPlacementValue) => void;
	excludeBookSlug?: string;
	className?: string;
};

function Row({
	id,
	number,
	title,
	isNew,
	moved,
	previousNumber,
}: {
	id: string;
	number: number;
	title: string;
	isNew: boolean;
	moved: boolean;
	previousNumber: number | null;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id, disabled: !isNew });

	return (
		<li
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
			className={cn(
				"flex items-center gap-3 border-border border-b px-3 py-2 last:border-b-0",
				isNew && "bg-primary/10",
				isDragging && "relative z-10 shadow-sm ring-1 ring-primary",
			)}
		>
			{isNew ? (
				<button
					type="button"
					className="-ms-1 flex size-7 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing"
					aria-label={`Move “${title}” in the series. Press space, then the arrow keys.`}
					{...attributes}
					{...listeners}
				>
					<GripVertical className="size-4" aria-hidden />
				</button>
			) : (
				<span className="size-6 shrink-0" aria-hidden />
			)}
			<span
				className={cn(
					"w-10 shrink-0 font-medium text-sm tabular-nums",
					isNew ? "text-primary" : "text-muted-foreground",
				)}
			>
				{formatSeriesNumber(number)}
			</span>
			<span
				className={cn(
					"min-w-0 flex-1 truncate text-sm",
					isNew && "font-medium",
				)}
			>
				{title}
				{isNew ? (
					<span className="ms-2 font-normal text-muted-foreground text-xs">
						this book
					</span>
				) : null}
			</span>
			{moved && previousNumber != null ? (
				<span className="shrink-0 text-warning-ink text-xs tabular-nums">
					was {formatSeriesNumber(previousNumber)}, moves down
				</span>
			) : null}
		</li>
	);
}

export function SeriesPositionPicker({
	seriesSlug,
	newBookTitle,
	value,
	onChange,
	excludeBookSlug,
	className,
}: SeriesPositionPickerProps) {
	const uid = useId();
	const [halfNotice, setHalfNotice] = useState(false);
	const query = useQuery(
		orpc.series.getBySlug.queryOptions({ input: { slug: seriesSlug } }),
	);

	const books = useMemo<SeriesPlacementBook[]>(
		() =>
			sortSeriesBooks(
				(query.data?.books ?? [])
					.filter((entry) => entry.book.slug !== excludeBookSlug)
					.map((entry) => ({
						slug: entry.book.slug,
						title: entry.book.title,
						position: entry.position,
					})),
			),
		[query.data?.books, excludeBookSlug],
	);

	const title = newBookTitle.trim() || "This book";
	const preview = previewSeriesPlacement(books, value, title);
	const slot = placementToSlot(books, value);
	const halfStep = value.position != null && !Number.isInteger(value.position);
	const previousByBook = new Map(
		books.map((book) => [book.slug, book.position]),
	);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const rowIds = useMemo(() => {
		const ids = preview.rows.map((row) => row.slug ?? NEW_ID);
		return ids;
	}, [preview.rows]);

	function moveToSlot(nextSlot: number, wantHalf = halfStep) {
		const bounded = Math.max(0, Math.min(books.length, nextSlot));
		const next = slotToPlacement(books, bounded, wantHalf);
		if (!next) {
			setHalfNotice(true);
			return;
		}
		setHalfNotice(false);
		onChange(next);
	}

	function onDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) return;
		const from = rowIds.indexOf(String(active.id));
		const to = rowIds.indexOf(String(over.id));
		if (from < 0 || to < 0) return;
		const moved = arrayMove(rowIds, from, to);
		// Existing books never reorder here; only where the marker sits matters.
		moveToSlot(moved.indexOf(NEW_ID));
	}

	if (query.isPending) {
		return <Skeleton className={cn("h-40 w-full", className)} aria-hidden />;
	}

	if (query.isError) {
		return (
			<p className="text-destructive text-sm">
				Could not load this series. Check your connection and try again.
			</p>
		);
	}

	const placeOptions = [
		...books.map((book, index) => ({
			value: String(index),
			label: `Before ${formatSeriesNumber(book.position)} ${book.title}`,
		})),
		{ value: String(books.length), label: "At the end" },
	];

	return (
		<div className={cn("flex flex-col gap-3", className)}>
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div className="flex min-w-0 flex-col gap-1.5">
					<label htmlFor={`${uid}-place`} className="font-medium text-sm">
						Place in the series
					</label>
					<Select
						value={String(slot)}
						onValueChange={(next) => moveToSlot(Number(next))}
					>
						<SelectTrigger id={`${uid}-place`} className="w-full sm:w-72">
							<SelectValue>
								{placeOptions.find((option) => option.value === String(slot))
									?.label ?? "At the end"}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{placeOptions.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex gap-1.5">
					<Button
						type="button"
						variant="outline"
						size="icon-sm"
						aria-label="Move this book earlier in the series"
						disabled={slot <= 0}
						onClick={() => moveToSlot(slot - 1)}
					>
						<ArrowUp aria-hidden />
					</Button>
					<Button
						type="button"
						variant="outline"
						size="icon-sm"
						aria-label="Move this book later in the series"
						disabled={slot >= books.length}
						onClick={() => moveToSlot(slot + 1)}
					>
						<ArrowDown aria-hidden />
					</Button>
				</div>
			</div>

			{books.length === 0 ? (
				<p className="border border-border border-dashed px-3 py-4 text-muted-foreground text-sm">
					This series has no other books yet, so this one will be{" "}
					{formatSeriesNumber(preview.position)}.
				</p>
			) : (
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={onDragEnd}
				>
					<SortableContext
						items={rowIds}
						strategy={verticalListSortingStrategy}
					>
						<ol
							className="border border-border"
							aria-label="Series order after saving"
						>
							{preview.rows.map((row) => (
								<Row
									key={row.slug ?? NEW_ID}
									id={row.slug ?? NEW_ID}
									number={row.position}
									title={row.title}
									isNew={row.isNew}
									moved={row.moved}
									previousNumber={
										row.slug ? (previousByBook.get(row.slug) ?? null) : null
									}
								/>
							))}
						</ol>
					</SortableContext>
				</DndContext>
			)}

			<label htmlFor={`${uid}-half`} className="flex items-start gap-3 text-sm">
				<Switch
					id={`${uid}-half`}
					checked={halfStep}
					disabled={books.length === 0}
					onCheckedChange={(checked) => moveToSlot(slot, checked)}
					className="mt-0.5"
				/>
				<span className="flex flex-col gap-0.5">
					<span className="font-medium">
						Use a half step instead of moving later books
					</span>
					<span className="text-muted-foreground text-xs leading-relaxed">
						For a novella or prequel that sits between two volumes, like #1.5.
						Nothing else gets renumbered.
					</span>
				</span>
			</label>

			{halfNotice ? (
				<p className="text-warning-ink text-xs" role="status">
					There is no room for a half step there. Pick a slot between two books
					that are at least a whole number apart, or turn the half step off.
				</p>
			) : null}

			{preview.error ? (
				<div
					className="flex flex-wrap items-center gap-3 border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive text-sm"
					role="alert"
				>
					<span className="min-w-0 flex-1">{preview.error}</span>
					{value.position != null && Number.isInteger(value.position) ? (
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={() => onChange({ ...value, shiftLater: true })}
						>
							Move later books down
						</Button>
					) : null}
				</div>
			) : (
				<p className="text-muted-foreground text-xs" aria-live="polite">
					{value.position == null
						? `Goes last, as ${formatSeriesNumber(preview.position)}.`
						: `Will be ${formatSeriesNumber(preview.position)}${
								preview.rows.some((row) => row.moved)
									? "; the books after it move down by one."
									: "."
							}`}
				</p>
			)}
		</div>
	);
}
