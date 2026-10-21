"use client";

import { Button } from "@bbrc/ui/components/button";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
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
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowUp } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ShelfDetailBookRow } from "@/components/blocks/shelf-detail-book-row";
import { orpc, queryClient } from "@/utils/orpc";

type ShelfReorderEditorProps = {
	username: string;
	shelfSlug: string;
};

type BookRow = {
	slug: string;
	title: string;
	authors: string[];
	coverId: number | null;
};

function SortableBookRow({
	id,
	username,
	shelfSlug,
	rank,
	book,
	isFirst,
	isLast,
	onMove,
}: {
	id: string;
	username: string;
	shelfSlug: string;
	rank: number;
	book: BookRow;
	isFirst: boolean;
	isLast: boolean;
	onMove: (direction: -1 | 1) => void;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.85 : 1,
	};

	return (
		<li ref={setNodeRef} style={style} className="list-none">
			<ShelfDetailBookRow
				username={username}
				shelfSlug={shelfSlug}
				rank={rank}
				showRank
				isOwner={false}
				book={book}
				sortable
				dragHandleProps={{ ...attributes, ...listeners }}
				actions={
					<span className="flex shrink-0 gap-1">
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							disabled={isFirst}
							aria-label={`Move ${book.title} up`}
							onClick={() => onMove(-1)}
						>
							<ArrowUp className="size-4" />
						</Button>
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							disabled={isLast}
							aria-label={`Move ${book.title} down`}
							onClick={() => onMove(1)}
						>
							<ArrowDown className="size-4" />
						</Button>
					</span>
				}
			/>
		</li>
	);
}

export function ShelfReorderEditor({
	username,
	shelfSlug,
}: ShelfReorderEditorProps) {
	const router = useRouter();
	const [reduceMotion, setReduceMotion] = useState(false);

	useEffect(() => {
		const media = window.matchMedia("(prefers-reduced-motion: reduce)");
		setReduceMotion(media.matches);
		const onChange = () => setReduceMotion(media.matches);
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	}, []);

	const shelfQuery = useQuery(
		orpc.shelf.getBySlug.queryOptions({
			input: { username, shelfSlug },
		}),
	);

	const [order, setOrder] = useState<BookRow[]>([]);

	useEffect(() => {
		if (!shelfQuery.data) return;
		setOrder(
			shelfQuery.data.books.map(
				(row): BookRow => ({
					slug: row.book.slug,
					title: row.book.title,
					authors: row.book.authors,
					coverId: row.book.coverId ?? null,
				}),
			),
		);
	}, [shelfQuery.data]);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const reorderMutation = useMutation(
		orpc.shelf.reorderBooks.mutationOptions({
			onSuccess: async () => {
				toast.success("Order saved.");
				await queryClient.invalidateQueries({
					queryKey: orpc.shelf.getBySlug.key({
						input: { username, shelfSlug },
					}),
				});
				router.push(`/users/${username}/shelves/${shelfSlug}` as Route);
				router.refresh();
			},
			onError: (error) => {
				toast.error(error.message ?? "Could not save order.");
			},
		}),
	);

	const itemIds = useMemo(() => order.map((book) => book.slug), [order]);

	function move(index: number, direction: -1 | 1) {
		const next = index + direction;
		if (next < 0 || next >= order.length) return;
		setOrder((current) => arrayMove(current, index, next));
	}

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) return;
		setOrder((current) => {
			const oldIndex = current.findIndex((book) => book.slug === active.id);
			const newIndex = current.findIndex((book) => book.slug === over.id);
			if (oldIndex < 0 || newIndex < 0) return current;
			return arrayMove(current, oldIndex, newIndex);
		});
	}

	if (shelfQuery.isPending) {
		return <Skeleton className="h-48 w-full" />;
	}

	if (shelfQuery.isError || !shelfQuery.data?.isOwner) {
		return (
			<p className="text-destructive text-sm" role="alert">
				{shelfQuery.error?.message ?? "You cannot reorder this shelf."}
			</p>
		);
	}

	const shelf = shelfQuery.data;
	const unchanged =
		order.length === shelf.books.length &&
		order.every((book, index) => book.slug === shelf.books[index]?.book.slug);

	return (
		<div className="flex flex-col gap-6">
			<Link
				href={`/users/${username}/shelves/${shelfSlug}` as Route}
				className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
			>
				<ArrowLeft className="size-4" />
				Back to shelf
			</Link>

			<div className="space-y-1">
				<h1 className="font-bold text-xl tracking-tight">Reorder books</h1>
				<p className="text-muted-foreground text-sm">
					{shelf.type === "ordered"
						? "Visitors will see these ranks on the public shelf page."
						: "Order is saved but rank numbers stay hidden on the public page."}
				</p>
			</div>

			{order.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Add books before reordering.
				</p>
			) : reduceMotion ? (
				<ol className="flex flex-col gap-2">
					{order.map((book, index) => (
						<li key={book.slug} className="list-none">
							<div className="flex items-center gap-2">
								<div className="flex shrink-0 flex-col gap-1">
									<Button
										type="button"
										variant="outline"
										size="icon-sm"
										disabled={index === 0}
										aria-label="Move up"
										onClick={() => move(index, -1)}
									>
										<ArrowUp className="size-4" />
									</Button>
									<Button
										type="button"
										variant="outline"
										size="icon-sm"
										disabled={index === order.length - 1}
										aria-label="Move down"
										onClick={() => move(index, 1)}
									>
										<ArrowDown className="size-4" />
									</Button>
								</div>
								<div className="min-w-0 flex-1">
									<ShelfDetailBookRow
										username={username}
										shelfSlug={shelfSlug}
										rank={index + 1}
										showRank
										isOwner={false}
										book={book}
									/>
								</div>
							</div>
						</li>
					))}
				</ol>
			) : (
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={handleDragEnd}
				>
					<SortableContext
						items={itemIds}
						strategy={verticalListSortingStrategy}
					>
						<ol className="flex flex-col gap-2">
							{order.map((book, index) => (
								<SortableBookRow
									key={book.slug}
									id={book.slug}
									username={username}
									shelfSlug={shelfSlug}
									rank={index + 1}
									book={book}
									isFirst={index === 0}
									isLast={index === order.length - 1}
									onMove={(direction) => move(index, direction)}
								/>
							))}
						</ol>
					</SortableContext>
				</DndContext>
			)}

			<div className="flex flex-wrap gap-3 border-border border-t pt-4 md:sticky md:bottom-0 md:bg-background md:py-3">
				<LoadingButton
					type="button"
					disabled={order.length === 0 || unchanged}
					loading={reorderMutation.isPending}
					onClick={() => {
						reorderMutation.mutate({
							shelfSlug,
							bookSlugs: order.map((b) => b.slug),
						});
					}}
				>
					Save order
				</LoadingButton>
				<Button
					type="button"
					variant="outline"
					render={
						<Link href={`/users/${username}/shelves/${shelfSlug}` as Route} />
					}
					nativeButton={false}
				>
					Cancel
				</Button>
			</div>
		</div>
	);
}
