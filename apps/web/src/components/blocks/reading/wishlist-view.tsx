"use client";

import { Button } from "@bbrc/ui/components/button";
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
import { useMutation, useQuery } from "@tanstack/react-query";
import { BookOpen, Dices, GripVertical, Lock, Play, X } from "lucide-react";
import type { Route } from "next";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BookAuthorLinks } from "@/components/blocks/book-author-links";
import { PickForMe } from "@/components/blocks/reading/pick-for-me";
import { Link } from "@/i18n/navigation";
import { bookCoverUrl } from "@/lib/book-cover";
import { useMyReadings } from "@/lib/reading/use-reading";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

// The edition picker is only needed when "Start reading" is pressed.
const StartReadingDialog = dynamic(
	() =>
		import("@/components/blocks/reading/start-reading-dialog").then(
			(mod) => mod.StartReadingDialog,
		),
	{ ssr: false },
);

type ShelfDetail = NonNullable<ReturnType<typeof useShelfDetail>["data"]>;
type WishlistBook = ShelfDetail["books"][number]["book"];

function useShelfDetail(username: string, shelfSlug: string | undefined) {
	return useQuery({
		...orpc.shelf.getBySlug.queryOptions({
			input: { username, shelfSlug: shelfSlug ?? "wishlist" },
		}),
		enabled: shelfSlug != null,
	});
}

function WishlistRow({
	book,
	rank,
	reading,
	onRemove,
	onStart,
}: {
	book: WishlistBook;
	rank: number;
	reading: boolean;
	onRemove: () => void;
	onStart: () => void;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: book.slug });
	const src = bookCoverUrl(book.coverId, "M");

	return (
		<li
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
			className={cn(
				"flex items-center gap-3 border-border border-b bg-card p-3 last:border-b-0",
				isDragging && "relative z-10 shadow-md ring-1 ring-ring",
			)}
		>
			<button
				type="button"
				className="-ms-1 touch-none p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
				aria-label={`Move ${book.title}. Use the arrow keys after pressing space.`}
				{...attributes}
				{...listeners}
			>
				<GripVertical className="size-4" aria-hidden />
			</button>
			<span
				className="w-5 shrink-0 text-center font-semibold text-muted-foreground text-sm tabular-nums"
				aria-hidden
			>
				{rank}
			</span>
			<Link
				href={`/books/${book.slug}` as Route}
				className="relative block aspect-2/3 w-10 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10"
				tabIndex={-1}
				aria-hidden
			>
				{src ? (
					<Image src={src} alt="" fill className="object-cover" sizes="40px" />
				) : (
					<BookOpen
						className="absolute inset-0 m-auto size-4 text-muted-foreground"
						aria-hidden
					/>
				)}
			</Link>
			<div className="min-w-0 flex-1">
				<p className="line-clamp-2 font-medium text-sm leading-snug">
					<Link
						href={`/books/${book.slug}` as Route}
						className="hover:underline"
					>
						{book.title}
					</Link>
				</p>
				<p className="truncate text-muted-foreground text-xs">
					<BookAuthorLinks authors={book.authors} />
				</p>
				{rank === 1 ? (
					<span className="mt-1 inline-block border border-primary/40 bg-primary/5 px-1.5 text-3xs text-foreground">
						Next up
					</span>
				) : null}
			</div>
			<div className="flex shrink-0 items-center gap-1">
				{reading ? (
					<span className="px-2 text-muted-foreground text-xs">Reading</span>
				) : (
					<Button type="button" size="xs" variant="outline" onClick={onStart}>
						<Play data-icon="inline-start" aria-hidden />
						<span className="max-sm:sr-only">Start reading</span>
					</Button>
				)}
				<Button
					type="button"
					size="icon-xs"
					variant="ghost"
					className="text-muted-foreground"
					aria-label={`Remove ${book.title} from your wishlist`}
					onClick={onRemove}
				>
					<X aria-hidden />
				</Button>
			</div>
		</li>
	);
}

/** Your wishlist, in priority order. Drag to reorder; the top book is "next up". */
export function WishlistView({ username }: { username: string }) {
	const wishlist = useQuery({
		...orpc.reading.wishlist.get.queryOptions(),
		staleTime: 30_000,
	});
	const shelfSlug = wishlist.data?.slug;
	const shelf = useShelfDetail(username, shelfSlug);
	const readings = useMyReadings();
	const readingSlugs = useMemo(
		() => new Set((readings.data?.items ?? []).map((item) => item.book.slug)),
		[readings.data],
	);
	const prefs = useQuery(orpc.reading.preferences.queryOptions());
	const [starting, setStarting] = useState<WishlistBook | null>(null);
	const [pickOpen, setPickOpen] = useState(false);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const shelfKey = orpc.shelf.getBySlug.queryKey({
		input: { username, shelfSlug: shelfSlug ?? "wishlist" },
	});
	const books = shelf.data?.books ?? [];

	const reorder = useMutation(
		orpc.shelf.reorderBooks.mutationOptions({
			// The rollback lives in `onDragEnd`, which holds the previous order.
			onError: (error) => toast.error(error.message),
			onSettled: () => {
				void queryClient.invalidateQueries({
					queryKey: orpc.reading.wishlist.get.key(),
				});
			},
		}),
	);

	function onDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id || !shelfSlug || !shelf.data) return;
		const from = books.findIndex((row) => row.book.slug === active.id);
		const to = books.findIndex((row) => row.book.slug === over.id);
		if (from < 0 || to < 0) return;
		const previous = shelf.data;
		const moved = arrayMove(books, from, to).map((row, index) => ({
			...row,
			position: index,
		}));
		// The new order shows at once; it rolls back if the server refuses.
		queryClient.setQueryData(shelfKey, { ...previous, books: moved });
		reorder.mutate(
			{
				ownerUsername: username,
				shelfSlug,
				bookSlugs: moved.map((row) => row.book.slug),
			},
			{
				onError: () => queryClient.setQueryData(shelfKey, previous),
			},
		);
	}

	const remove = useMutation(
		orpc.reading.wishlist.remove.mutationOptions({
			onMutate: async ({ bookSlug }) => {
				await queryClient.cancelQueries({ queryKey: shelfKey });
				const previous = queryClient.getQueryData(shelfKey);
				if (previous) {
					queryClient.setQueryData(shelfKey, {
						...previous,
						books: previous.books.filter((row) => row.book.slug !== bookSlug),
						bookCount: Math.max(0, previous.bookCount - 1),
					});
				}
				return { previous };
			},
			onError: (error, _input, context) => {
				if (context?.previous) {
					queryClient.setQueryData(shelfKey, context.previous);
				}
				toast.error(error.message);
			},
			onSettled: () => {
				void queryClient.invalidateQueries({
					queryKey: orpc.reading.wishlist.get.key(),
				});
				void queryClient.invalidateQueries({
					queryKey: orpc.reading.state.key(),
				});
			},
		}),
	);

	const setPrivacy = useMutation(
		orpc.reading.setPreferences.mutationOptions({
			onMutate: async (input) => {
				const key = orpc.reading.preferences.queryKey();
				await queryClient.cancelQueries({ queryKey: key });
				const previous = queryClient.getQueryData(key);
				if (previous && input.wishlistPrivate !== undefined) {
					queryClient.setQueryData(key, {
						...previous,
						wishlistPrivate: input.wishlistPrivate,
					});
				}
				return { previous };
			},
			onError: (error, _input, context) => {
				if (context?.previous) {
					queryClient.setQueryData(
						orpc.reading.preferences.queryKey(),
						context.previous,
					);
				}
				toast.error(error.message);
			},
			onSettled: () => {
				void queryClient.invalidateQueries({
					queryKey: orpc.reading.preferences.key(),
				});
				void queryClient.invalidateQueries({ queryKey: shelfKey });
			},
		}),
	);

	const isPrivate = prefs.data?.wishlistPrivate ?? true;

	if (wishlist.isPending || shelf.isPending) {
		return (
			<div className="flex flex-col gap-3" aria-hidden>
				<Skeleton className="h-16 w-full" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-5">
			<header className="flex flex-wrap items-start justify-between gap-4">
				<div className="min-w-0">
					<h2 className="font-semibold text-xl tracking-tight">Wishlist</h2>
					<p className="text-muted-foreground text-sm">
						{books.length === 0
							? "Books you want to read."
							: `${books.length} ${books.length === 1 ? "book" : "books"}, in the order you want to read them.`}
					</p>
				</div>
				<Button
					type="button"
					variant="outline"
					disabled={books.length < 2}
					onClick={() => setPickOpen(true)}
				>
					<Dices data-icon="inline-start" aria-hidden />
					Pick for me
				</Button>
			</header>

			<label
				htmlFor="wishlist-private"
				className="flex cursor-pointer items-start justify-between gap-4 border border-border p-3"
			>
				<span className="flex items-start gap-2.5">
					<Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
					<span className="flex flex-col gap-0.5">
						<span className="font-medium text-sm">
							{isPrivate
								? "Only you can see this list"
								: "Anyone can see this list"}
						</span>
						<span className="text-muted-foreground text-xs">
							{isPrivate
								? "Members only see how many people want a book, never who."
								: "Your wishlist is public. Turn this on to keep it to yourself."}
						</span>
					</span>
				</span>
				<Switch
					id="wishlist-private"
					checked={isPrivate}
					onCheckedChange={(checked) =>
						setPrivacy.mutate({ wishlistPrivate: checked })
					}
					aria-label="Keep my wishlist private"
				/>
			</label>

			{books.length === 0 ? (
				<div className="flex flex-col items-center gap-3 border border-border border-dashed px-6 py-12 text-center">
					<p className="font-medium">Your wishlist is empty</p>
					<p className="max-w-sm text-muted-foreground text-sm">
						Open any book and use the arrow next to "Mark as read" to add it
						here.
					</p>
					<Button
						render={<Link href={"/books" as Route} />}
						nativeButton={false}
					>
						Browse the library
					</Button>
				</div>
			) : (
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={onDragEnd}
				>
					<SortableContext
						items={books.map((row) => row.book.slug)}
						strategy={verticalListSortingStrategy}
					>
						<ol className="border border-border">
							{books.map((row, index) => (
								<WishlistRow
									key={row.book.slug}
									book={row.book}
									rank={index + 1}
									reading={readingSlugs.has(row.book.slug)}
									onRemove={() => remove.mutate({ bookSlug: row.book.slug })}
									onStart={() => setStarting(row.book)}
								/>
							))}
						</ol>
					</SortableContext>
				</DndContext>
			)}

			{starting ? (
				<StartReadingDialog
					bookSlug={starting.slug}
					bookTitle={starting.title}
					bookPages={0}
					open
					onOpenChange={(open) => {
						if (!open) setStarting(null);
					}}
				/>
			) : null}

			{pickOpen ? (
				<PickForMe
					books={books.map((row) => row.book)}
					open={pickOpen}
					onOpenChange={setPickOpen}
					onStart={(book) => {
						setPickOpen(false);
						setStarting(book);
					}}
				/>
			) : null}
		</div>
	);
}
