"use client";

import { getBookCountryName } from "@bbrc/shared";
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
import { AdminListTableFooter } from "@/components/blocks/admin-list-table-footer";
import {
	ADMIN_TABLE_MOBILE_MIN_WIDTH,
	AdminListTableScroll,
} from "@/components/blocks/admin-list-table-scroll";
import { AdminAuthorRowActions } from "@/components/blocks/author/admin/admin-author-row-actions";
import { AdminAuthorsToolbar } from "@/components/blocks/author/admin/admin-authors-toolbar";
import { AuthorStatusBadge } from "@/components/blocks/author/admin/author-status-badge";
import { AuthorPhoto } from "@/components/blocks/author/author-photo";
import { Link } from "@/i18n/navigation";
import { adminAuthorsExportConfig } from "@/lib/admin-table-export/configs";
import {
	adminAuthorEnrichmentLabels,
	adminAuthorFieldLabels,
	adminAuthorSourceLabels,
	toAdminAuthorsListCallInput,
	useAdminAuthorsListingSearchParams,
} from "@/lib/listing/admin-authors-listing";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const MAX_MISSING_SHOWN = 3;

function formatDate(date: Date) {
	return new Intl.DateTimeFormat(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(date);
}

function lifeYears(birthYear: number | null, deathYear: number | null) {
	if (birthYear == null && deathYear == null) return "—";
	return `${birthYear ?? "?"}–${deathYear ?? ""}`;
}

export function AdminAuthorsListTable() {
	const [params, setParams] = useAdminAuthorsListingSearchParams();
	const listInput = toAdminAuthorsListCallInput(params);

	const { data, isPending, isError, error, refetch } = useQuery(
		orpc.authorAdmin.list.queryOptions({ input: listInput }),
	);

	const footer = data ? (
		<AdminListTableFooter
			summary={`${data.metadata.total} authors · Page ${data.metadata.page} of ${Math.max(data.metadata.totalPages, 1)}`}
			metadata={data.metadata}
			onPageChange={(page) => {
				void setParams({ page });
			}}
			exportConfig={adminAuthorsExportConfig}
			listInput={listInput as Record<string, unknown>}
			currentPageItems={data.items}
		/>
	) : null;

	return (
		<div className="flex flex-col gap-4">
			<AdminAuthorsToolbar />

			{isPending ? (
				<Skeleton className="h-120 w-full" />
			) : isError ? (
				<div className="flex flex-col items-start gap-3 border border-dashed p-6">
					<p className="text-sm">
						{error?.message ?? "Could not load authors."}
					</p>
					<Button variant="outline" size="sm" onClick={() => refetch()}>
						Try again
					</Button>
				</div>
			) : data.items.length === 0 ? (
				<>
					<div className="border border-dashed p-8 text-center">
						<p className="font-medium text-sm">
							No authors match these filters
						</p>
						<p className="mt-1 text-muted-foreground text-sm">
							Try clearing search or filters.
						</p>
					</div>
					{footer}
				</>
			) : (
				<>
					<AdminListTableScroll>
						<Table className={ADMIN_TABLE_MOBILE_MIN_WIDTH}>
							<TableHeader>
								<TableRow>
									<TableHead>Author</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="hidden lg:table-cell">
										Missing
									</TableHead>
									<TableHead className="hidden md:table-cell">
										Nationality
									</TableHead>
									<TableHead className="hidden xl:table-cell">Life</TableHead>
									<TableHead className="text-right tabular-nums">
										Books
									</TableHead>
									<TableHead className="hidden text-right tabular-nums lg:table-cell">
										Readers
									</TableHead>
									<TableHead className="hidden text-right tabular-nums xl:table-cell">
										Reads
									</TableHead>
									<TableHead className="hidden text-right tabular-nums lg:table-cell">
										Followers
									</TableHead>
									<TableHead className="hidden lg:table-cell">Added</TableHead>
									<TableHead className="w-12">
										<span className="sr-only">Actions</span>
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.items.map((author) => (
									<TableRow key={author.id}>
										<TableCell>
											<div className="flex min-w-0 items-center gap-3">
												<AuthorPhoto
													size="sm"
													name={author.name}
													photoUrl={author.photoUrl}
												/>
												<div className="flex min-w-0 flex-col gap-0.5">
													<Link
														href={`/authors/${author.slug}` as Route}
														className="truncate font-medium hover:underline"
													>
														{author.name}
													</Link>
													<p className="truncate font-mono text-muted-foreground text-xs">
														{author.slug}
													</p>
												</div>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex flex-col items-start gap-1">
												<AuthorStatusBadge status={author.status} />
												{author.enrichmentStatus !== "done" ? (
													<span
														className={cn(
															"text-2xs",
															author.enrichmentStatus === "failed"
																? "text-destructive"
																: "text-muted-foreground",
														)}
														title={author.enrichmentError ?? undefined}
													>
														{
															adminAuthorEnrichmentLabels[
																author.enrichmentStatus
															]
														}
													</span>
												) : null}
												{author.hasLocks ? (
													<span className="text-2xs text-muted-foreground">
														Has locked fields
													</span>
												) : null}
											</div>
										</TableCell>
										<TableCell className="hidden max-w-56 lg:table-cell">
											{author.missingFields.length === 0 ? (
												<span className="text-muted-foreground text-xs">
													Complete
												</span>
											) : (
												<span className="text-muted-foreground text-xs">
													{author.missingFields
														.slice(0, MAX_MISSING_SHOWN)
														.map((field) => adminAuthorFieldLabels[field])
														.join(", ")}
													{author.missingFields.length > MAX_MISSING_SHOWN
														? ` +${author.missingFields.length - MAX_MISSING_SHOWN}`
														: ""}
												</span>
											)}
										</TableCell>
										<TableCell className="hidden max-w-40 truncate md:table-cell">
											{author.nationalities.length === 0
												? "—"
												: author.nationalities
														.map((code) => getBookCountryName(code) ?? code)
														.join(", ")}
										</TableCell>
										<TableCell className="hidden text-muted-foreground text-xs tabular-nums xl:table-cell">
											{lifeYears(author.birthYear, author.deathYear)}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{author.bookCount}
										</TableCell>
										<TableCell className="hidden text-right tabular-nums lg:table-cell">
											{author.readerCount}
										</TableCell>
										<TableCell className="hidden text-right tabular-nums xl:table-cell">
											{author.readCount}
										</TableCell>
										<TableCell className="hidden text-right tabular-nums lg:table-cell">
											{author.followerCount}
										</TableCell>
										<TableCell className="hidden text-muted-foreground text-xs lg:table-cell">
											<span
												title={author.sources
													.map((source) => adminAuthorSourceLabels[source])
													.join(", ")}
											>
												{formatDate(author.createdAt)}
											</span>
										</TableCell>
										<TableCell>
											<AdminAuthorRowActions author={author} />
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</AdminListTableScroll>
					{footer}
				</>
			)}
		</div>
	);
}
