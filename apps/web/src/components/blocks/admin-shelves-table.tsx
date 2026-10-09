"use client";

import { Badge } from "@bbrc/ui/components/badge";
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
import { AdminListTableFooter } from "@/components/blocks/admin-list-table-footer";
import {
	ADMIN_TABLE_MOBILE_MIN_WIDTH,
	AdminListTableScroll,
} from "@/components/blocks/admin-list-table-scroll";
import { AdminShelvesToolbar } from "@/components/blocks/admin-shelves-toolbar";
import { adminShelvesExportConfig } from "@/lib/admin-table-export/configs";
import {
	adminShelfStatusFilterLabels,
	shelfTypeFilterLabels,
	toAdminShelvesListCallInput,
	useAdminShelvesListingSearchParams,
} from "@/lib/listing/admin-shelves-listing";
import { orpc } from "@/utils/orpc";

function formatDate(date: Date) {
	return new Intl.DateTimeFormat(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(date);
}

function shelfPublicHref(ownerUsername: string, slug: string): Route {
	return `/users/${ownerUsername}/shelves/${slug}` as Route;
}

export function AdminShelvesTable() {
	const [params, setParams] = useAdminShelvesListingSearchParams();
	const listInput = toAdminShelvesListCallInput(params);

	const { data, isPending, isError, error, refetch } = useQuery(
		orpc.admin.listShelves.queryOptions({
			input: listInput,
		}),
	);

	return (
		<div className="flex flex-col gap-4">
			<AdminShelvesToolbar />

			{isPending ? (
				<Skeleton className="h-120 w-full" />
			) : isError ? (
				<div className="flex flex-col items-start gap-3 border border-dashed p-6">
					<p className="text-sm">
						{error?.message ?? "Could not load shelves."}
					</p>
					<Button variant="outline" size="sm" onClick={() => refetch()}>
						Try again
					</Button>
				</div>
			) : data.items.length === 0 ? (
				<>
					<div className="border border-dashed p-8 text-center">
						<p className="font-medium text-sm">
							No shelves match these filters
						</p>
						<p className="mt-1 text-muted-foreground text-sm">
							Try clearing search or filters.
						</p>
					</div>
					<AdminListTableFooter
						summary={`${data.metadata.total} shelves · Page ${data.metadata.page} of ${Math.max(data.metadata.totalPages, 1)}`}
						metadata={data.metadata}
						onPageChange={(page) => {
							void setParams({ page });
						}}
						exportConfig={adminShelvesExportConfig}
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
									<TableHead>Shelf</TableHead>
									<TableHead>Owner</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="hidden md:table-cell">Type</TableHead>
									<TableHead className="text-right tabular-nums">
										Books
									</TableHead>
									<TableHead className="hidden text-right tabular-nums lg:table-cell">
										Attachments
									</TableHead>
									<TableHead className="hidden lg:table-cell">Cover</TableHead>
									<TableHead className="hidden lg:table-cell">
										Updated
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.items.map((shelf) => (
									<TableRow key={shelf.id}>
										<TableCell>
											<div className="flex min-w-0 flex-col gap-0.5">
												<Link
													href={shelfPublicHref(
														shelf.owner.username,
														shelf.slug,
													)}
													className="line-clamp-2 font-medium text-sm hover:underline"
												>
													{shelf.title}
												</Link>
												<p className="font-mono text-muted-foreground text-xs">
													{shelf.slug}
												</p>
											</div>
										</TableCell>
										<TableCell>
											<Link
												href={`/users/${shelf.owner.username}` as Route}
												className="text-sm hover:underline"
											>
												@{shelf.owner.username}
											</Link>
										</TableCell>
										<TableCell>
											<Badge variant="secondary">
												{adminShelfStatusFilterLabels[shelf.status]}
											</Badge>
										</TableCell>
										<TableCell className="hidden text-muted-foreground text-sm md:table-cell">
											{shelfTypeFilterLabels[shelf.type]}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{shelf.counts.books}
										</TableCell>
										<TableCell className="hidden text-right tabular-nums lg:table-cell">
											{shelf.counts.postAttachments}
										</TableCell>
										<TableCell className="hidden lg:table-cell">
											{shelf.coverImageUrl ? (
												<Badge variant="outline">Custom</Badge>
											) : (
												<span className="text-muted-foreground text-xs">—</span>
											)}
										</TableCell>
										<TableCell className="hidden text-muted-foreground text-xs lg:table-cell">
											{formatDate(shelf.updatedAt)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</AdminListTableScroll>

					<AdminListTableFooter
						summary={`${data.metadata.total} shelves · Page ${data.metadata.page} of ${Math.max(data.metadata.totalPages, 1)}`}
						metadata={data.metadata}
						onPageChange={(page) => {
							void setParams({ page });
						}}
						exportConfig={adminShelvesExportConfig}
						listInput={listInput as Record<string, unknown>}
						currentPageItems={data.items}
					/>
				</>
			)}
		</div>
	);
}
