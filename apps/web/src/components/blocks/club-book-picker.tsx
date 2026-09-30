"use client";

import type { GetBookListOutput } from "@bbrc/api/modules/book/book.schema";
import { Button } from "@bbrc/ui/components/button";
import { Input } from "@bbrc/ui/components/input";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export type ClubBookPickerValue = GetBookListOutput["items"][number] | null;

type ClubBookPickerProps = {
	value: ClubBookPickerValue;
	onChange: (book: ClubBookPickerValue) => void;
	id?: string;
	className?: string;
};

export function ClubBookPicker({
	value,
	onChange,
	id = "club-book-picker-search",
	className,
}: ClubBookPickerProps) {
	const [searchInput, setSearchInput] = useState("");
	const debouncedQuery = useDebouncedValue(searchInput, 300);
	const trimmed = debouncedQuery.trim();

	const booksQuery = useQuery({
		...orpc.book.getBookList.queryOptions({
			input: {
				limit: 8,
				sortBy: "title",
				sortDirection: "asc",
				...(trimmed.length > 0 ? { search: trimmed } : {}),
			},
		}),
		enabled: trimmed.length > 0,
	});

	const books = booksQuery.data?.items ?? [];

	return (
		<div className={cn("flex flex-col gap-2", className)}>
			<div className="relative">
				<Search
					className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
					aria-hidden
				/>
				<Input
					id={id}
					value={searchInput}
					onChange={(event) => setSearchInput(event.target.value)}
					placeholder="Search club books to attach…"
					className="ps-8"
					autoComplete="off"
					disabled={value != null}
				/>
			</div>

			{value ? (
				<div className="flex items-center gap-3 rounded-none border bg-muted/20 p-2">
					<div className="relative aspect-2/3 w-10 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
						{(() => {
							const coverSrc = bookCoverUrl(value.coverId);
							return coverSrc ? (
								<Image
									src={coverSrc}
									alt=""
									fill
									className="object-cover"
									sizes="40px"
								/>
							) : null;
						})()}
					</div>
					<div className="min-w-0 flex-1">
						<p className="truncate font-medium text-sm">{value.title}</p>
						<p className="truncate text-muted-foreground text-xs">
							{formatBookAuthors(value.authors)}
						</p>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label="Remove attached book"
						onClick={() => onChange(null)}
					>
						<X className="size-4" />
					</Button>
				</div>
			) : null}

			{!value && trimmed.length > 0 ? (
				<ul className="max-h-48 overflow-y-auto rounded-none border">
					{booksQuery.isPending ? (
						<li className="p-2">
							<Skeleton className="h-10 w-full" />
						</li>
					) : books.length === 0 ? (
						<li className="p-3 text-muted-foreground text-sm">
							No books match your search.
						</li>
					) : (
						books.map((book) => {
							const coverSrc = bookCoverUrl(book.coverId);

							return (
								<li key={book.slug}>
									<button
										type="button"
										className="flex w-full items-center gap-3 p-2 text-left transition-colors hover:bg-muted/40"
										onClick={() => {
											onChange(book);
											setSearchInput("");
										}}
									>
										<div className="relative aspect-2/3 w-8 shrink-0 overflow-hidden bg-muted">
											{coverSrc ? (
												<Image
													src={coverSrc}
													alt=""
													fill
													className="object-cover"
													sizes="32px"
												/>
											) : null}
										</div>
										<div className="min-w-0">
											<p className="truncate text-sm">{book.title}</p>
											<p className="truncate text-muted-foreground text-xs">
												{formatBookAuthors(book.authors)}
											</p>
										</div>
									</button>
								</li>
							);
						})
					)}
				</ul>
			) : null}

			{!value && searchInput.trim().length === 0 ? (
				<p className="text-muted-foreground text-xs">
					Optional — search by title to link a book from the{" "}
					<Link href={"/books" as Route} className="text-foreground underline">
						library
					</Link>
					.
				</p>
			) : null}
		</div>
	);
}
