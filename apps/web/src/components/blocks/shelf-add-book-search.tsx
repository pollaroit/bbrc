"use client";

import { MAX_BOOKS_PER_SHELF } from "@bbrc/shared";
import { Input } from "@bbrc/ui/components/input";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { authClient } from "@/lib/auth-client";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { orpc, queryClient } from "@/utils/orpc";

type ShelfAddBookSearchProps = {
	username: string;
	shelfSlug: string;
	bookCount: number;
	onShelfSlugs: Set<string>;
};

export function ShelfAddBookSearch({
	username,
	shelfSlug,
	bookCount,
	onShelfSlugs,
}: ShelfAddBookSearchProps) {
	const { data: session } = authClient.useSession();
	const [searchInput, setSearchInput] = useState("");
	const debouncedQuery = useDebouncedValue(searchInput, 300);
	const trimmed = debouncedQuery.trim();

	const atCap = bookCount >= MAX_BOOKS_PER_SHELF;

	const booksQuery = useQuery({
		...orpc.book.getBookList.queryOptions({
			input: {
				limit: 10,
				sortBy: "title",
				sortDirection: "asc",
				...(trimmed.length > 0 ? { search: trimmed } : {}),
			},
		}),
		enabled: !atCap && trimmed.length >= 2,
	});

	const shelfKey = orpc.shelf.getBySlug.queryKey({
		input: { username, shelfSlug },
	});
	/** Book details for the optimistic row, keyed by slug, set right before mutating. */
	const pendingBooksRef = useRef(
		new Map<
			string,
			{ slug: string; title: string; authors: string[]; coverId: number | null }
		>(),
	);

	const addMutation = useMutation(
		orpc.shelf.addBook.mutationOptions({
			// Adds to this shelf run one at a time, in click order.
			scope: { id: `shelf-${shelfSlug}` },
			onMutate: async (variables) => {
				await queryClient.cancelQueries({ queryKey: shelfKey });
				const previous = queryClient.getQueryData(shelfKey);
				const book = pendingBooksRef.current.get(variables.bookSlug);

				if (previous && book) {
					queryClient.setQueryData(shelfKey, {
						...previous,
						bookCount: previous.bookCount + 1,
						books: [
							...previous.books,
							{
								position: previous.books.length,
								notes: null,
								addedAt: new Date(),
								addedBy: session?.user
									? {
											username: session.user.username,
											name: session.user.name,
											image: session.user.image ?? null,
										}
									: null,
								updatedBy: null,
								book,
							},
						],
					});
				}

				return { previous };
			},
			onError: (error, variables, context) => {
				// Only roll back this book, so other quick adds stay in place.
				queryClient.setQueryData(shelfKey, (current) =>
					current
						? {
								...current,
								bookCount: Math.max(0, current.bookCount - 1),
								books: current.books.filter(
									(entry) => entry.book.slug !== variables.bookSlug,
								),
							}
						: (context?.previous ?? current),
				);
				toast.error(error.message ?? "Could not add book.");
			},
			onSettled: () => {
				void queryClient.invalidateQueries({ queryKey: shelfKey });
				void queryClient.invalidateQueries({
					queryKey: orpc.shelf.listByUsername.key(),
				});
				void queryClient.invalidateQueries({
					queryKey: orpc.shelf.listForBook.key(),
				});
			},
		}),
	);

	const books = useMemo(() => {
		const items = booksQuery.data?.items ?? [];
		return items.filter((book) => !onShelfSlugs.has(book.slug));
	}, [booksQuery.data?.items, onShelfSlugs]);

	return (
		<section
			aria-labelledby="shelf-add-books-heading"
			className="space-y-3 border border-border p-4"
		>
			<div className="space-y-1">
				<h2 id="shelf-add-books-heading" className="font-semibold text-sm">
					Add books
				</h2>
				<p className="text-muted-foreground text-xs leading-relaxed">
					Search the club library, then tap a book to add it.{" "}
					{atCap ? (
						<span className="text-foreground">
							This shelf is full ({MAX_BOOKS_PER_SHELF} books).
						</span>
					) : (
						<>
							{bookCount}/{MAX_BOOKS_PER_SHELF} books on this shelf.
						</>
					)}
				</p>
			</div>

			<div className="relative">
				<Search
					className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
					aria-hidden
				/>
				<Input
					value={searchInput}
					onChange={(event) => setSearchInput(event.target.value)}
					placeholder="Search library…"
					className="ps-8"
					autoComplete="off"
					disabled={atCap}
				/>
			</div>

			{!atCap && trimmed.length > 0 && trimmed.length < 2 ? (
				<p className="text-muted-foreground text-xs">
					Type at least 2 characters to search.
				</p>
			) : null}

			{!atCap && trimmed.length >= 2 ? (
				<ul className="max-h-64 overflow-y-auto border border-border">
					{booksQuery.isPending ? (
						<li className="p-3 text-muted-foreground text-sm">Searching…</li>
					) : books.length === 0 ? (
						<li className="p-3 text-muted-foreground text-sm">
							No matching books, or they are already on this shelf.{" "}
							<Link
								href={"/books" as Route}
								className="text-foreground underline"
							>
								Browse library
							</Link>
						</li>
					) : (
						books.map((book) => {
							const coverSrc = bookCoverUrl(book.coverId);
							return (
								<li
									key={book.slug}
									className="border-border border-b last:border-b-0"
								>
									<button
										type="button"
										aria-label={`Add ${book.title} to shelf`}
										className="flex min-h-14 w-full items-center gap-3 p-2 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none disabled:opacity-60"
										onClick={() => {
											pendingBooksRef.current.set(book.slug, {
												slug: book.slug,
												title: book.title,
												authors: book.authors,
												coverId: book.coverId ?? null,
											});
											addMutation.mutate({
												ownerUsername: username,
												shelfSlug,
												bookSlug: book.slug,
											});
										}}
									>
										<span className="relative block aspect-2/3 w-10 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
											{coverSrc ? (
												<Image
													src={coverSrc}
													alt=""
													fill
													className="object-cover"
													sizes="40px"
												/>
											) : null}
										</span>
										<span className="min-w-0 flex-1">
											<span className="block truncate font-medium text-sm">
												{book.title}
											</span>
											<span className="block truncate text-muted-foreground text-xs">
												{formatBookAuthors(book.authors)}
											</span>
										</span>
										<Plus
											className="size-4 shrink-0 text-muted-foreground"
											aria-hidden
										/>
									</button>
								</li>
							);
						})
					)}
				</ul>
			) : null}

			{!atCap && searchInput.trim().length === 0 ? (
				<p className="text-muted-foreground text-xs">
					Tip: you can also add books from any{" "}
					<Link href={"/books" as Route} className="text-foreground underline">
						book page
					</Link>{" "}
					with Add to shelf.
				</p>
			) : null}
		</section>
	);
}
