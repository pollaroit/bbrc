"use client";

import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@bbrc/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { AdminBookRowActions } from "@/components/blocks/admin-book-row-actions";
import { AdminBooksToolbar } from "@/components/blocks/admin-books-toolbar";
import { AdminListTableFooter } from "@/components/blocks/admin-list-table-footer";
import {
	ADMIN_TABLE_MOBILE_MIN_WIDTH,
	AdminListTableScroll,
} from "@/components/blocks/admin-list-table-scroll";
import { BookStatusBadge } from "@/components/blocks/book-status-badge";
import { adminBooksExportConfig } from "@/lib/admin-table-export/configs";
import { formatBookAuthors } from "@/lib/book-cover";
import {
	toAdminBooksListCallInput,
	useAdminBooksListingSearchParams,
} from "@/lib/listing/admin-books-listing";
import { orpc } from "@/utils/orpc";

function formatDate(date: Date) {
	return new Intl.DateTimeFormat(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(date);
}

export function AdminBooksListTable() {
	const [params, setParams] = useAdminBooksListingSearchParams();
	const listInput = toAdminBooksListCallInput(params);

	const { data, isPending, isError, error, refetch } = useQuery(
		orpc.admin.listBooks.queryOptions({
			input: listInput,
		}),
	);

	return (
		<div className="flex flex-col gap-4">
			<AdminBooksToolbar />

			{isPending ? (
				<Skeleton className="h-120 w-full" />
			) : isError ? (
				<div className="flex flex-col items-start gap-3 border border-dashed p-6">
					<p className="text-sm">{error?.message ?? "Could not load books."}</p>
					<Button variant="outline" size="sm" onClick={() => refetch()}>
						Try again
					</Button>
				</div>
			) : data.items.length === 0 ? (
				<>
					<div className="border border-dashed p-8 text-center">
						<p className="font-medium text-sm">No books match these filters</p>
						<p className="mt-1 text-muted-foreground text-sm">
							Try clearing search or filters.
						</p>
					</div>
					<AdminListTableFooter
						summary={`${data.metadata.total} books · Page ${data.metadata.page} of ${Math.max(data.metadata.totalPages, 1)}`}
						metadata={data.metadata}
						onPageChange={(page) => {
							void setParams({ page });
						}}
						exportConfig={adminBooksExportConfig}
						listInput={listInput as Record<string, unknown>}
						currentPageItems={data.items}
					/>
				</>
			) : (
				<>
					<AdminListTableScroll>
						<Table className={ADMIN_TABLE_MOBILE_MIN_WIDTH}>
							<TableHeader>
								<TableRow>
									<TableHead>Title</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="hidden md:table-cell">
										Authors
									</TableHead>
									<TableHead className="text-right tabular-nums">
										Pages
									</TableHead>
									<TableHead className="hidden text-right tabular-nums lg:table-cell">
										Club
									</TableHead>
									<TableHead className="hidden text-right tabular-nums lg:table-cell">
										OL
									</TableHead>
									<TableHead className="hidden text-right tabular-nums xl:table-cell">
										Fav
									</TableHead>
									<TableHead className="hidden text-right tabular-nums xl:table-cell">
										Fb
									</TableHead>
									<TableHead className="hidden text-right tabular-nums xl:table-cell">
										Shelf
									</TableHead>
									<TableHead className="hidden lg:table-cell">Added</TableHead>
									<TableHead className="w-12">
										<span className="sr-only">Actions</span>
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.items.map((book) => (
									<TableRow key={book.id}>
										<TableCell>
											<div className="flex min-w-0 flex-col gap-0.5">
												<Link
													href={`/books/${book.slug}` as Route}
													className="font-medium hover:underline"
												>
													{book.title}
												</Link>
												<p className="truncate font-mono text-muted-foreground text-xs">
													{book.slug}
												</p>
											</div>
										</TableCell>
										<TableCell>
											<BookStatusBadge status={book.status} />
										</TableCell>
										<TableCell className="hidden max-w-48 truncate md:table-cell">
											{formatBookAuthors(book.authors)}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{book.pages}
										</TableCell>
										<TableCell className="hidden text-right tabular-nums lg:table-cell">
											{book.averageRating?.toFixed(1) ?? "—"}
										</TableCell>
										<TableCell className="hidden text-right tabular-nums lg:table-cell">
											{book.openLibraryRating?.toFixed(1) ?? "—"}
										</TableCell>
										<TableCell className="hidden text-right tabular-nums xl:table-cell">
											{book.counts.favorites}
										</TableCell>
										<TableCell className="hidden text-right tabular-nums xl:table-cell">
											{book.counts.feedbacks}
										</TableCell>
										<TableCell className="hidden text-right tabular-nums xl:table-cell">
											{book.counts.shelfBooks}
										</TableCell>
										<TableCell className="hidden text-muted-foreground text-xs lg:table-cell">
											{formatDate(book.createdAt)}
										</TableCell>
										<TableCell>
											<AdminBookRowActions book={book} />
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</AdminListTableScroll>

					<AdminListTableFooter
						summary={`${data.metadata.total} books · Page ${data.metadata.page} of ${Math.max(data.metadata.totalPages, 1)}`}
						metadata={data.metadata}
						onPageChange={(page) => {
							void setParams({ page });
						}}
						exportConfig={adminBooksExportConfig}
						listInput={listInput as Record<string, unknown>}
						currentPageItems={data.items}
					/>
				</>
			)}
		</div>
	);
}
