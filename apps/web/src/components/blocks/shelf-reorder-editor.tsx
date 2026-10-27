"use client";

import { reorderPermissionFor, resolveShelfPermissions } from "@bbrc/shared";
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
import { ArrowDown, ArrowUp } from "lucide-react";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ShelfDetailBookRow } from "@/components/blocks/shelf-detail-book-row";
import { ShelfEditorShell } from "@/components/blocks/shelf-editor-shell";
import { Link, useRouter } from "@/i18n/navigation";
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
				canRemove={false}
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

	const canReorder = shelfQuery.data
		? resolveShelfPermissions(
				shelfQuery.data.viewer.role === "owner",
				shelfQuery.data.viewer.permissions,
			).has(reorderPermissionFor(shelfQuery.data.type))
		: false;

	if (shelfQuery.isError || !shelfQuery.data || !canReorder) {
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
		<ShelfEditorShell
			title="Reorder books"
			description={
				shelf.type === "ordered"
					? "Drag books or use the arrows. Visitors will see these ranks on the shelf page."
					: "Drag books or use the arrows. The order is saved, but rank numbers stay hidden on the shelf page."
			}
			backHref={`/users/${username}/shelves/${shelfSlug}` as Route}
			backLabel="Back to shelf"
			footer={
				<>
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
					<LoadingButton
						type="button"
						disabled={order.length === 0 || unchanged}
						loading={reorderMutation.isPending}
						onClick={() => {
							reorderMutation.mutate({
								ownerUsername: username,
								shelfSlug,
								bookSlugs: order.map((b) => b.slug),
							});
						}}
					>
						Save order
					</LoadingButton>
				</>
			}
		>
			{order.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Add books before reordering.
				</p>
			) : reduceMotion ? (
				<ol className="flex flex-col gap-2">
					{order.map((book, index) => (
						<li key={book.slug} className="list-none">
							<ShelfDetailBookRow
								username={username}
								shelfSlug={shelfSlug}
								rank={index + 1}
								showRank
								canRemove={false}
								book={book}
								actions={
									<span className="flex shrink-0 gap-1">
										<Button
											type="button"
											variant="outline"
											size="icon-sm"
											disabled={index === 0}
											aria-label={`Move ${book.title} up`}
											onClick={() => move(index, -1)}
										>
											<ArrowUp className="size-4" />
										</Button>
										<Button
											type="button"
											variant="outline"
											size="icon-sm"
											disabled={index === order.length - 1}
											aria-label={`Move ${book.title} down`}
											onClick={() => move(index, 1)}
										>
											<ArrowDown className="size-4" />
										</Button>
									</span>
								}
							/>
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
		</ShelfEditorShell>
	);
}
