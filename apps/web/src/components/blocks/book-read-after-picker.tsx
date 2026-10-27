"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Field,
	FieldDescription,
	FieldLegend,
} from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Link } from "@/i18n/navigation";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export type ReadAfterBookSelection = {
	slug: string;
	title: string;
	authors: string[];
	coverId: number | null;
};

type BookReadAfterPickerProps = {
	selected: ReadAfterBookSelection[];
	onChange: (books: ReadAfterBookSelection[]) => void;
	excludeSlug?: string;
	className?: string;
};

export function BookReadAfterPicker({
	selected,
	onChange,
	excludeSlug,
	className,
}: BookReadAfterPickerProps) {
	const [searchInput, setSearchInput] = useState("");
	const debouncedQuery = useDebouncedValue(searchInput, 300);
	const trimmed = debouncedQuery.trim();

	const selectedSlugs = useMemo(
		() => new Set(selected.map((book) => book.slug)),
		[selected],
	);

	const booksQuery = useQuery({
		...orpc.book.getBookList.queryOptions({
			input: {
				limit: 10,
				sortBy: "title",
				sortDirection: "asc",
				...(trimmed.length >= 2 ? { search: trimmed } : {}),
			},
		}),
		enabled: trimmed.length >= 2,
	});

	const searchResults = useMemo(() => {
		const items = booksQuery.data?.items ?? [];
		return items.filter(
			(book) => book.slug !== excludeSlug && !selectedSlugs.has(book.slug),
		);
	}, [booksQuery.data?.items, excludeSlug, selectedSlugs]);

	const addBook = (book: {
		slug: string;
		title: string;
		authors: string[];
		coverId?: number | null;
	}) => {
		onChange([
			...selected,
			{
				slug: book.slug,
				title: book.title,
				authors: book.authors,
				coverId: book.coverId ?? null,
			},
		]);
		setSearchInput("");
	};

	const removeAt = (index: number) => {
		onChange(selected.filter((_, i) => i !== index));
	};

	return (
		<Field className={cn("gap-3", className)}>
			<div className="space-y-1">
				<FieldLegend variant="label">Read after</FieldLegend>
				<FieldDescription>
					Club must finish these books before this title can appear on sitting
					polls. Search the catalog by title or author.
				</FieldDescription>
			</div>

			{selected.length > 0 ? (
				<ol className="flex flex-col gap-1 border border-border">
					{selected.map((book, index) => (
						<li
							key={book.slug}
							className="flex items-center gap-2 border-border border-b bg-muted/15 px-2 py-2 last:border-b-0"
						>
							<span className="w-5 shrink-0 text-center text-muted-foreground text-xs tabular-nums">
								{index + 1}
							</span>
							<div className="relative aspect-2/3 w-7 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
								{bookCoverUrl(book.coverId) ? (
									<Image
										src={bookCoverUrl(book.coverId)!}
										alt=""
										fill
										className="object-cover"
										sizes="28px"
									/>
								) : null}
							</div>
							<div className="min-w-0 flex-1">
								<Link
									href={`/books/${book.slug}` as Route}
									className="block truncate font-medium text-sm underline-offset-4 hover:underline"
									target="_blank"
									rel="noreferrer"
								>
									{book.title}
								</Link>
								<p className="truncate text-muted-foreground text-xs">
									{formatBookAuthors(book.authors)}
								</p>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon-xs"
								aria-label={`Remove ${book.title}`}
								onClick={() => removeAt(index)}
							>
								<X className="size-3.5" aria-hidden />
							</Button>
						</li>
					))}
				</ol>
			) : (
				<p className="text-muted-foreground text-xs">
					No prior reads required — this book can enter polls anytime while on
					the wishlist.
				</p>
			)}

			<div className="relative">
				<Search
					className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
					aria-hidden
				/>
				<Input
					value={searchInput}
					onChange={(event) => setSearchInput(event.target.value)}
					placeholder="Search club books to add…"
					className="ps-8"
					autoComplete="off"
				/>
			</div>

			{trimmed.length >= 2 ? (
				<div className="max-h-52 overflow-y-auto border border-border">
					{booksQuery.isPending ? (
						<p className="px-3 py-4 text-muted-foreground text-xs">
							Searching…
						</p>
					) : searchResults.length === 0 ? (
						<p className="px-3 py-4 text-muted-foreground text-xs">
							No matching books, or they are already listed.
						</p>
					) : (
						<ul>
							{searchResults.map((book) => (
								<li
									key={book.slug}
									className="border-border border-b last:border-b-0"
								>
									<button
										type="button"
										className="flex w-full items-center gap-2 px-2 py-2 text-left transition-colors hover:bg-muted/40"
										onClick={() => addBook(book)}
									>
										<div className="relative aspect-2/3 w-8 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
											{bookCoverUrl(book.coverId) ? (
												<Image
													src={bookCoverUrl(book.coverId)!}
													alt=""
													fill
													className="object-cover"
													sizes="32px"
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
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			) : (
				<p className="text-muted-foreground text-xs">
					Type at least 2 characters to search the catalog.
				</p>
			)}
		</Field>
	);
}
