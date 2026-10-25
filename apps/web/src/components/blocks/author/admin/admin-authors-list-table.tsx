"use client";

import { Button } from "@bbrc/ui/components/button";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import { Input } from "@bbrc/ui/components/input";
import { Label } from "@bbrc/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@bbrc/ui/components/table";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Pencil, Search } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { AuthorStatusBadge } from "@/components/blocks/author/admin/author-status-badge";
import { AuthorCardPortrait } from "@/components/blocks/author/author-card";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
	AUTHOR_STATUS_FILTERS,
	authorSortByLabels,
	authorStatusLabels,
} from "@/lib/listing/authors-listing";
import { orpc } from "@/utils/orpc";

const PAGE_SIZE = 25;
const SORTS = [
	"name",
	"bookCount",
	"readerCount",
	"followerCount",
	"createdAt",
] as const;

export function AdminAuthorsListTable() {
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<
		"all" | (typeof AUTHOR_STATUS_FILTERS)[number]
	>("all");
	const [sortBy, setSortBy] = useState<(typeof SORTS)[number]>("createdAt");
	const [includeEmpty, setIncludeEmpty] = useState(true);
	const debounced = useDebouncedValue(search, 300).trim();

	const query = useInfiniteQuery(
		orpc.author.list.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (lastPage) => lastPage.metadata.nextCursor ?? undefined,
			input: (cursor) => ({
				...(debounced ? { search: debounced } : {}),
				...(status !== "all" ? { statuses: [status] } : {}),
				includeEmpty,
				sortBy,
				sortDirection: sortBy === "name" ? ("asc" as const) : ("desc" as const),
				limit: PAGE_SIZE,
				...(cursor != null ? { cursor } : {}),
			}),
		}),
	);

	const rows = query.data?.pages.flatMap((page) => page.items) ?? [];
	const total = query.data?.pages[0]?.metadata.total;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
				<div className="relative min-w-0 flex-1">
					<Search
						className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
						aria-hidden
					/>
					<Input
						type="search"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Search authors by name…"
						className="ps-8"
						aria-label="Search authors"
					/>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<Select
						value={status}
						onValueChange={(value) => setStatus(value as typeof status)}
					>
						<SelectTrigger className="w-48" aria-label="Status">
							<SelectValue placeholder="Status" />
						</SelectTrigger>
						<SelectContent alignItemWithTrigger={false}>
							<SelectItem value="all">Any status</SelectItem>
							{AUTHOR_STATUS_FILTERS.map((value) => (
								<SelectItem key={value} value={value}>
									{authorStatusLabels[value]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select
						value={sortBy}
						onValueChange={(value) => setSortBy(value as typeof sortBy)}
					>
						<SelectTrigger className="w-44" aria-label="Sort by">
							<SelectValue placeholder="Sort by" />
						</SelectTrigger>
						<SelectContent alignItemWithTrigger={false}>
							{SORTS.map((value) => (
								<SelectItem key={value} value={value}>
									{authorSortByLabels[value]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<div className="inline-flex items-center gap-2 text-sm">
						<Checkbox
							id="authors-include-empty"
							checked={includeEmpty}
							onCheckedChange={(checked) => setIncludeEmpty(checked === true)}
						/>
						<Label htmlFor="authors-include-empty" className="font-normal">
							Include authors without books
						</Label>
					</div>
				</div>
			</div>

			{total != null ? (
				<p className="text-muted-foreground text-sm tabular-nums">
					{total.toLocaleString()} {total === 1 ? "author" : "authors"}
				</p>
			) : null}

			{query.isPending ? (
				<Skeleton className="h-96 w-full" aria-hidden />
			) : query.isError ? (
				<p className="text-muted-foreground text-sm">Could not load authors.</p>
			) : rows.length === 0 ? (
				<p className="text-muted-foreground text-sm">No authors match.</p>
			) : (
				<div className="border border-border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Author</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="text-right">Books</TableHead>
								<TableHead className="text-right">Readers</TableHead>
								<TableHead className="text-right">Followers</TableHead>
								<TableHead className="w-12" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map((author) => (
								<TableRow key={author.slug}>
									<TableCell>
										<Link
											href={`/authors/${author.slug}` as Route}
											className="flex min-w-0 items-center gap-3 hover:underline"
										>
											<AuthorCardPortrait
												name={author.name}
												photoUrl={author.photoUrl}
												className="w-8"
											/>
											<span className="flex min-w-0 flex-col">
												<span className="truncate font-medium">
													{author.name}
												</span>
												{author.lifespan ? (
													<span className="text-muted-foreground text-xs tabular-nums">
														{author.lifespan}
													</span>
												) : null}
											</span>
										</Link>
									</TableCell>
									<TableCell>
										{author.status ? (
											<AuthorStatusBadge status={author.status} />
										) : null}
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{author.bookCount}
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{author.readerCount}
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{author.followerCount}
									</TableCell>
									<TableCell>
										<Button
											render={
												<Link href={`/authors/${author.slug}/edit` as Route} />
											}
											nativeButton={false}
											variant="ghost"
											size="icon-sm"
											aria-label={`Edit ${author.name}`}
										>
											<Pencil />
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			{query.hasNextPage ? (
				<Button
					type="button"
					variant="outline"
					className="w-fit self-center"
					disabled={query.isFetchingNextPage}
					onClick={() => void query.fetchNextPage()}
				>
					{query.isFetchingNextPage ? "Loading…" : "Load more"}
				</Button>
			) : null}
		</div>
	);
}
