"use client";

import type { AuthorBookItem } from "@bbrc/api/modules/author/author.schema";
import { Button } from "@bbrc/ui/components/button";
import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowDownAZ, ArrowUpAZ, BookCheck } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { formatBookSeriesCardLabel } from "@/lib/book-cover";
import { orpc } from "@/utils/orpc";
import { AuthorPageCover } from "./author-page-bits";

type SortBy =
	| "title"
	| "publishedIn"
	| "averageRating"
	| "readCount"
	| "createdAt";

const SORTS: {
	value: SortBy;
	label: string;
	defaultDirection: "asc" | "desc";
}[] = [
	{ value: "publishedIn", label: "Year published", defaultDirection: "asc" },
	{ value: "title", label: "Title", defaultDirection: "asc" },
	{ value: "averageRating", label: "Club rating", defaultDirection: "desc" },
	{ value: "readCount", label: "Most read", defaultDirection: "desc" },
	{ value: "createdAt", label: "Recently added", defaultDirection: "desc" },
];

const gridClassName =
	"grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";

function BooksSkeleton() {
	return (
		<div className={gridClassName} aria-hidden>
			{Array.from({ length: 12 }, (_, index) => (
				<div key={index} className="flex flex-col gap-2">
					<Skeleton className="aspect-[2/3] w-full" />
					<Skeleton className="h-4 w-3/4" />
				</div>
			))}
		</div>
	);
}

function AuthorBookTile({ book }: { book: AuthorBookItem }) {
	const meta = [
		book.publishedIn > 0 ? String(book.publishedIn) : null,
		book.averageRating != null ? `${book.averageRating.toFixed(1)} / 5` : null,
		book.readCount > 0
			? `${book.readCount} ${book.readCount === 1 ? "read" : "reads"}`
			: null,
	].filter(Boolean);

	return (
		<Link
			href={`/books/${book.slug}` as Route}
			className="group flex flex-col gap-1.5"
		>
			<div className="relative">
				<AuthorPageCover
					coverId={book.coverId}
					title={book.title}
					sizes="(max-width: 640px) 45vw, 180px"
				/>
				{book.readByMe ? (
					<span
						className="absolute top-1.5 right-1.5 grid size-6 place-items-center bg-success text-background"
						title="You have read this"
					>
						<BookCheck className="size-3.5" aria-hidden />
						<span className="sr-only">You have read this</span>
					</span>
				) : null}
			</div>
			<span className="line-clamp-2 font-medium text-sm leading-snug group-hover:underline">
				{book.title}
			</span>
			{book.series ? (
				<span className="line-clamp-1 text-muted-foreground text-xs">
					{formatBookSeriesCardLabel(book.series)}
				</span>
			) : null}
			{book.coAuthors.length > 0 ? (
				<span className="line-clamp-1 text-muted-foreground text-xs">
					with {book.coAuthors.map((author) => author.name).join(", ")}
				</span>
			) : null}
			{meta.length > 0 ? (
				<span className="text-muted-foreground text-xs tabular-nums">
					{meta.join(" · ")}
				</span>
			) : null}
		</Link>
	);
}

export function AuthorPageBooks({ slug }: { slug: string }) {
	const [sortBy, setSortBy] = useState<SortBy>("publishedIn");
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

	const {
		data,
		error,
		fetchNextPage,
		hasNextPage,
		isError,
		isFetchingNextPage,
		isPending,
		refetch,
	} = useInfiniteQuery(
		orpc.author.books.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (lastPage) => lastPage.metadata.nextCursor ?? undefined,
			input: (pageCursor) => ({
				slug,
				sortBy,
				sortDirection,
				limit: 24,
				...(pageCursor != null ? { cursor: pageCursor } : {}),
			}),
		}),
	);

	const items = data?.pages.flatMap((page) => page.items) ?? [];
	const total = data?.pages[0]?.metadata.total;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<p className="text-muted-foreground text-sm tabular-nums">
					{total != null ? `${total} ${total === 1 ? "book" : "books"}` : " "}
				</p>
				<div className="flex items-end gap-2">
					<div className="flex flex-col gap-1">
						<label
							htmlFor="author-books-sort"
							className="text-muted-foreground text-xs"
						>
							Sort by
						</label>
						<Select
							value={sortBy}
							onValueChange={(value) => {
								const next = SORTS.find((sort) => sort.value === value);
								if (next) {
									setSortBy(next.value);
									setSortDirection(next.defaultDirection);
								}
							}}
						>
							<SelectTrigger id="author-books-sort" className="w-44">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{SORTS.map((sort) => (
									<SelectItem key={sort.value} value={sort.value}>
										{sort.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<Button
						type="button"
						variant="outline"
						size="icon"
						aria-label={
							sortDirection === "asc" ? "Ascending order" : "Descending order"
						}
						onClick={() =>
							setSortDirection((direction) =>
								direction === "asc" ? "desc" : "asc",
							)
						}
					>
						{sortDirection === "asc" ? (
							<ArrowDownAZ className="size-4" aria-hidden />
						) : (
							<ArrowUpAZ className="size-4" aria-hidden />
						)}
					</Button>
				</div>
			</div>

			<InfiniteScroll
				hasNextPage={hasNextPage}
				isFetchingNextPage={isFetchingNextPage}
				fetchNextPage={fetchNextPage}
				isPending={isPending}
				isError={isError}
				error={error}
				onRetry={() => void refetch()}
				isEmpty={items.length === 0}
				emptyTitle="No books yet"
				emptyDescription="Books by this author appear here once they are added to the library."
				loadingContent={<BooksSkeleton />}
			>
				<ul className={gridClassName}>
					{items.map((book) => (
						<li key={book.slug}>
							<AuthorBookTile book={book} />
						</li>
					))}
				</ul>
			</InfiniteScroll>
		</div>
	);
}
