"use client";

import { Button } from "@bbrc/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { Textarea } from "@bbrc/ui/components/textarea";
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
import { GripVertical, Trash2 } from "lucide-react";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	AdminSeriesPreviewAside,
	AdminSeriesWorkspacePanel,
	AdminSeriesWorkspaceShell,
} from "@/components/blocks/admin-series-workspace-shell";
import { SeriesDetailBooks } from "@/components/blocks/series-detail-books";
import { useRouter } from "@/i18n/navigation";
import { orpc, queryClient } from "@/utils/orpc";

type BookRow = {
	slug: string;
	title: string;
	authors: string[];
	coverId?: number | null;
	publishedIn: number;
};

function SortableSeriesBookRow({
	id,
	row,
	onRemove,
}: {
	id: string;
	row: { position: number; book: BookRow };
	onRemove: () => void;
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
		<li
			ref={setNodeRef}
			style={style}
			className="flex list-none items-stretch border-border border-b bg-card last:border-b-0"
		>
			<button
				type="button"
				className="flex w-10 shrink-0 cursor-grab touch-none items-center justify-center border-border border-r text-muted-foreground active:cursor-grabbing"
				aria-label="Drag to reorder"
				{...attributes}
				{...listeners}
			>
				<GripVertical className="size-4" />
			</button>
			<span className="flex w-[3.25rem] shrink-0 items-center justify-center border-border border-r bg-muted/35 font-medium text-muted-foreground tabular-nums">
				{row.position}
			</span>
			<div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-3 py-2.5">
				<p className="truncate font-medium text-sm">{row.book.title}</p>
				<p className="truncate text-muted-foreground text-xs">
					{row.book.authors.join(", ")}
				</p>
			</div>
			<div className="flex shrink-0 items-center pr-1">
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					aria-label="Remove from series"
					onClick={onRemove}
				>
					<Trash2 className="size-4" />
				</Button>
			</div>
		</li>
	);
}

type AdminSeriesEditorProps = {
	seriesSlug: string;
};

export function AdminSeriesEditor({ seriesSlug }: AdminSeriesEditorProps) {
	const router = useRouter();
	const [title, setTitle] = useState("");
	const [slug, setSlug] = useState("");
	const [description, setDescription] = useState("");
	const [bookSearch, setBookSearch] = useState("");
	const [order, setOrder] = useState<
		Array<{ position: number; book: BookRow }>
	>([]);

	const seriesQuery = useQuery(
		orpc.series.getBySlug.queryOptions({
			input: { slug: seriesSlug },
		}),
	);

	useEffect(() => {
		if (!seriesQuery.data) {
			return;
		}
		setTitle(seriesQuery.data.title);
		setSlug(seriesQuery.data.slug);
		setDescription(seriesQuery.data.description ?? "");
		setOrder(seriesQuery.data.books);
	}, [seriesQuery.data]);

	const bookSearchQuery = useQuery(
		orpc.book.getBookList.queryOptions({
			input: {
				search: bookSearch.trim() || undefined,
				limit: 8,
			},
			enabled: bookSearch.trim().length >= 2,
		}),
	);

	const updateMutation = useMutation(
		orpc.series.update.mutationOptions({
			onSuccess: async (result) => {
				toast.success("Series saved.");
				await queryClient.invalidateQueries({
					queryKey: orpc.series.getBySlug.key({ input: { slug: seriesSlug } }),
				});
				if (result.slug !== seriesSlug) {
					router.replace(`/admin/series/${result.slug}` as Route);
				}
				router.refresh();
			},
			onError: (error) => {
				toast.error(error.message ?? "Could not save series.");
			},
		}),
	);

	const addBookMutation = useMutation(
		orpc.series.addBook.mutationOptions({
			onSuccess: async () => {
				toast.success("Book added.");
				setBookSearch("");
				await queryClient.invalidateQueries({
					queryKey: orpc.series.getBySlug.key({ input: { slug: seriesSlug } }),
				});
				router.refresh();
			},
			onError: (error) => {
				toast.error(error.message ?? "Could not add book.");
			},
		}),
	);

	const removeBookMutation = useMutation(
		orpc.series.removeBook.mutationOptions({
			onSuccess: async () => {
				toast.success("Book removed.");
				await queryClient.invalidateQueries({
					queryKey: orpc.series.getBySlug.key({ input: { slug: seriesSlug } }),
				});
				router.refresh();
			},
			onError: (error) => {
				toast.error(error.message ?? "Could not remove book.");
			},
		}),
	);

	const reorderMutation = useMutation(
		orpc.series.reorderBooks.mutationOptions({
			onSuccess: async () => {
				toast.success("Order saved.");
				await queryClient.invalidateQueries({
					queryKey: orpc.series.getBySlug.key({ input: { slug: seriesSlug } }),
				});
				router.refresh();
			},
			onError: (error) => {
				toast.error(error.message ?? "Could not save order.");
			},
		}),
	);

	const deleteMutation = useMutation(
		orpc.series.delete.mutationOptions({
			onSuccess: () => {
				toast.success("Series deleted.");
				router.push("/admin/series/list" as Route);
				router.refresh();
			},
			onError: (error) => {
				toast.error(error.message ?? "Could not delete series.");
			},
		}),
	);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const itemIds = useMemo(() => order.map((row) => row.book.slug), [order]);

	const memberSlugs = useMemo(
		() => new Set(order.map((row) => row.book.slug)),
		[order],
	);

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) {
			return;
		}
		setOrder((current) => {
			const oldIndex = current.findIndex((row) => row.book.slug === active.id);
			const newIndex = current.findIndex((row) => row.book.slug === over.id);
			if (oldIndex < 0 || newIndex < 0) {
				return current;
			}
			const moved = arrayMove(current, oldIndex, newIndex);
			return moved.map((row, index) => ({
				...row,
				position: index + 1,
			}));
		});
	}

	if (seriesQuery.isPending) {
		return <p className="text-muted-foreground text-sm">Loading…</p>;
	}

	if (seriesQuery.isError) {
		return (
			<p className="text-destructive text-sm" role="alert">
				{seriesQuery.error.message ?? "Series not found."}
			</p>
		);
	}

	return (
		<AdminSeriesWorkspaceShell
			title={title.trim() || "Edit series"}
			description="Save details anytime. Drag books to change order, then save order. The preview on the right matches the public page."
			publicHref={`/series/${seriesSlug}` as Route}
			aside={
				<AdminSeriesPreviewAside
					title={title}
					description={description}
					bookCount={order.length}
				>
					<SeriesDetailBooks books={order} compact />
				</AdminSeriesPreviewAside>
			}
		>
			<AdminSeriesWorkspacePanel
				title="Series details"
				description="Shown on the public series page. Changing the slug updates the URL."
			>
				<FieldGroup className="gap-4">
					<Field>
						<FieldLabel htmlFor="series-title">Title</FieldLabel>
						<Input
							id="series-title"
							value={title}
							onChange={(event) => setTitle(event.target.value)}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="series-slug">Slug</FieldLabel>
						<Input
							id="series-slug"
							value={slug}
							onChange={(event) => setSlug(event.target.value)}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="series-description">
							Description for readers
						</FieldLabel>
						<Textarea
							id="series-description"
							value={description}
							rows={5}
							onChange={(event) => setDescription(event.target.value)}
						/>
					</Field>
					<LoadingButton
						type="button"
						loading={updateMutation.isPending}
						onClick={() => {
							updateMutation.mutate({
								slug: seriesSlug,
								title: title.trim(),
								nextSlug: slug.trim() !== seriesSlug ? slug.trim() : undefined,
								description: description.trim() || null,
							});
						}}
					>
						Save details
					</LoadingButton>
				</FieldGroup>
			</AdminSeriesWorkspacePanel>

			<AdminSeriesWorkspacePanel
				title="Reading order"
				description="Search the catalog, add titles, drag the grip to reorder. Each book can belong to only one series."
			>
				<div className="flex flex-col gap-4">
					<Field>
						<FieldLabel htmlFor="series-add-book">Add from catalog</FieldLabel>
						<Input
							id="series-add-book"
							value={bookSearch}
							placeholder="Search by title (min. 2 characters)"
							onChange={(event) => setBookSearch(event.target.value)}
						/>
					</Field>
					{bookSearchQuery.data?.items.length ? (
						<ul className="flex flex-col border border-border">
							{bookSearchQuery.data.items
								.filter((book) => !memberSlugs.has(book.slug))
								.map((book) => (
									<li
										key={book.slug}
										className="border-border border-b last:border-0"
									>
										<button
											type="button"
											className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/40"
											disabled={addBookMutation.isPending}
											onClick={() => {
												addBookMutation.mutate({
													seriesSlug,
													bookSlug: book.slug,
												});
											}}
										>
											<span className="min-w-0 truncate font-medium">
												{book.title}
											</span>
											<span className="shrink-0 text-muted-foreground text-xs">
												Add
											</span>
										</button>
									</li>
								))}
						</ul>
					) : null}

					{order.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							No books yet. Search above to add the first title in the sequence.
						</p>
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
								<ol className="flex list-none flex-col border border-border">
									{order.map((row) => (
										<SortableSeriesBookRow
											key={row.book.slug}
											id={row.book.slug}
											row={row}
											onRemove={() => {
												removeBookMutation.mutate({
													seriesSlug,
													bookSlug: row.book.slug,
												});
											}}
										/>
									))}
								</ol>
							</SortableContext>
						</DndContext>
					)}

					{order.length > 0 ? (
						<LoadingButton
							type="button"
							variant="outline"
							loading={reorderMutation.isPending}
							onClick={() => {
								reorderMutation.mutate({
									seriesSlug,
									bookSlugs: order.map((row) => row.book.slug),
								});
							}}
						>
							Save order
						</LoadingButton>
					) : null}
				</div>
			</AdminSeriesWorkspacePanel>

			<AdminSeriesWorkspacePanel
				title="Delete series"
				description="Removes this reading order only. Catalog books are not deleted."
				className="border-destructive/40"
			>
				<Button
					type="button"
					variant="destructive"
					disabled={deleteMutation.isPending}
					onClick={() => {
						if (
							window.confirm(
								`Delete “${title}”? Books stay in the catalog; only series membership is removed.`,
							)
						) {
							deleteMutation.mutate({ slug: seriesSlug });
						}
					}}
				>
					Delete series
				</Button>
			</AdminSeriesWorkspacePanel>
		</AdminSeriesWorkspaceShell>
	);
}
