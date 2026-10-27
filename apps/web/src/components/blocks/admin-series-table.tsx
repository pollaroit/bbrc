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
import { AdminListTableFooter } from "@/components/blocks/admin-list-table-footer";
import {
	ADMIN_TABLE_MOBILE_MIN_WIDTH,
	AdminListTableScroll,
} from "@/components/blocks/admin-list-table-scroll";
import { AdminSeriesToolbar } from "@/components/blocks/admin-series-toolbar";
import { Link } from "@/i18n/navigation";
import { adminSeriesExportConfig } from "@/lib/admin-table-export/configs";
import {
	toAdminSeriesListCallInput,
	useAdminSeriesListingSearchParams,
} from "@/lib/listing/admin-series-listing";
import { orpc } from "@/utils/orpc";

function formatDate(date: Date) {
	return new Intl.DateTimeFormat(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(date);
}

export function AdminSeriesTable() {
	const [params, setParams] = useAdminSeriesListingSearchParams();
	const listInput = toAdminSeriesListCallInput(params);

	const { data, isPending, isError, error, refetch } = useQuery(
		orpc.admin.listSeries.queryOptions({
			input: listInput,
		}),
	);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<AdminSeriesToolbar />
				<Button
					render={<Link href={"/admin/series/new" as Route} />}
					nativeButton={false}
					size="sm"
					className="shrink-0"
				>
					New series
				</Button>
			</div>

			{isPending ? (
				<Skeleton className="h-120 w-full" />
			) : isError ? (
				<div className="flex flex-col items-start gap-3 border border-dashed p-6">
					<p className="text-sm">
						{error?.message ?? "Could not load series."}
					</p>
					<Button variant="outline" size="sm" onClick={() => refetch()}>
						Try again
					</Button>
				</div>
			) : data.items.length === 0 ? (
				<>
					<div className="border border-dashed p-8 text-center">
						<p className="font-medium text-sm">No series match these filters</p>
						<p className="mt-1 text-muted-foreground text-sm">
							Try clearing search or filters, or{" "}
							<Link
								href={"/admin/series/new" as Route}
								className="text-primary underline-offset-4 hover:underline"
							>
								create a series
							</Link>
							.
						</p>
					</div>
					<AdminListTableFooter
						summary={`${data.metadata.total} series · Page ${data.metadata.page} of ${Math.max(data.metadata.totalPages, 1)}`}
						metadata={data.metadata}
						onPageChange={(page) => {
							void setParams({ page });
						}}
						exportConfig={adminSeriesExportConfig}
						listInput={listInput as Record<string, unknown>}
						currentPageItems={[]}
					/>
				</>
			) : (
				<>
					<AdminListTableScroll>
						<Table className={ADMIN_TABLE_MOBILE_MIN_WIDTH}>
							<TableHeader>
								<TableRow>
									<TableHead>Series</TableHead>
									<TableHead className="hidden md:table-cell">Slug</TableHead>
									<TableHead className="text-right tabular-nums">
										Books
									</TableHead>
									<TableHead className="hidden lg:table-cell">
										Updated
									</TableHead>
									<TableHead className="hidden lg:table-cell">
										Created
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.items.map((series) => (
									<TableRow key={series.slug}>
										<TableCell>
											<div className="flex min-w-0 flex-col gap-0.5">
												<Link
													href={`/admin/series/${series.slug}` as Route}
													className="font-medium hover:underline"
												>
													{series.title}
												</Link>
												{series.description ? (
													<p className="line-clamp-1 text-muted-foreground text-xs">
														{series.description}
													</p>
												) : (
													<p className="text-muted-foreground text-xs">
														No description
													</p>
												)}
											</div>
										</TableCell>
										<TableCell className="hidden font-mono text-muted-foreground text-xs md:table-cell">
											{series.slug}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{series.bookCount}
										</TableCell>
										<TableCell className="hidden text-muted-foreground text-sm lg:table-cell">
											{formatDate(series.updatedAt)}
										</TableCell>
										<TableCell className="hidden text-muted-foreground text-sm lg:table-cell">
											{formatDate(series.createdAt)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</AdminListTableScroll>
					<AdminListTableFooter
						summary={`${data.metadata.total} series · Page ${data.metadata.page} of ${Math.max(data.metadata.totalPages, 1)}`}
						metadata={data.metadata}
						onPageChange={(page) => {
							void setParams({ page });
						}}
						exportConfig={adminSeriesExportConfig}
						listInput={listInput as Record<string, unknown>}
						currentPageItems={data.items}
					/>
				</>
			)}
		</div>
	);
}
