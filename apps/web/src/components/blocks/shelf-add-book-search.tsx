"use client";

import { MAX_BOOKS_PER_SHELF } from "@bbrc/shared";
import { Input } from "@bbrc/ui/components/input";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
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

	const addMutation = useMutation(
		orpc.shelf.addBook.mutationOptions({
			onSuccess: async () => {
				toast.success("Book added to shelf.");
				setSearchInput("");
				await queryClient.invalidateQueries({
					queryKey: orpc.shelf.getBySlug.key({
						input: { username, shelfSlug },
					}),
				});
				await queryClient.invalidateQueries({
					queryKey: orpc.shelf.listByUsername.key(),
				});
				await queryClient.invalidateQueries({
					queryKey: orpc.shelf.listForBook.key(),
				});
			},
			onError: (error) => {
				toast.error(error.message ?? "Could not add book.");
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
					Search the club library by title or author.{" "}
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
									<div className="flex items-center gap-3 p-2">
										<div className="relative aspect-2/3 w-10 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
											{coverSrc ? (
												<Image
													src={coverSrc}
													alt=""
													fill
													className="object-cover"
													sizes="40px"
												/>
											) : null}
										</div>
										<div className="min-w-0 flex-1">
											<p className="truncate font-medium text-sm">
												{book.title}
											</p>
											<p className="truncate text-muted-foreground text-xs">
												{formatBookAuthors(book.authors)}
											</p>
										</div>
										<LoadingButton
											type="button"
											size="sm"
											variant="outline"
											loading={addMutation.isPending}
											onClick={() => {
												addMutation.mutate({
													shelfSlug,
													bookSlug: book.slug,
												});
											}}
										>
											Add
										</LoadingButton>
									</div>
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
