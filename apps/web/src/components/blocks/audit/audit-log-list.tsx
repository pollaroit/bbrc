"use client";

import type { AuditSortField } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@bbrc/ui/components/empty";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { AuditRow } from "@/components/blocks/audit/audit-row";
import { AuditToolbar } from "@/components/blocks/audit/audit-toolbar";
import { useAuditListingSearchParams } from "@/lib/listing/audit-listing";
import { orpc } from "@/utils/orpc";

const PAGE_SIZE = 25;

export function AuditLogList() {
	const [params, setParams] = useAuditListingSearchParams();
	const filtered = Boolean(
		params.search ||
			params.actions?.length ||
			params.actors?.length ||
			params.targetType ||
			params.rangeMin ||
			params.rangeMax,
	);

	const query = useQuery({
		...orpc.audit.list.queryOptions({
			input: {
				page: params.page,
				limit: PAGE_SIZE,
				search: params.search ?? undefined,
				actions: params.actions ?? undefined,
				actorUsernames: params.actors ?? undefined,
				targetType: params.targetType ?? undefined,
				from: params.rangeMin ?? undefined,
				to: params.rangeMax ?? undefined,
				sortBy: (params.sortBy ?? "createdAt") as AuditSortField,
				sortDirection: (params.sortDirection ?? "desc") as "asc" | "desc",
			},
		}),
		placeholderData: keepPreviousData,
	});

	const data = query.data;

	return (
		<div className="flex flex-col gap-5">
			<AuditToolbar />

			{query.isPending ? (
				<div className="flex flex-col gap-px">
					{Array.from({ length: 6 }, (_, index) => (
						<Skeleton key={index} className="h-24 w-full" />
					))}
				</div>
			) : query.isError ? (
				<p className="text-destructive text-sm" role="alert">
					Could not load the audit log: {query.error.message}
				</p>
			) : !data || data.items.length === 0 ? (
				<Empty className="border py-16">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<ScrollText />
						</EmptyMedia>
						<EmptyTitle>
							{filtered
								? "Nothing matches these filters"
								: "Nothing logged yet"}
						</EmptyTitle>
						<EmptyDescription>
							{filtered
								? "Try fewer filters or a wider date range."
								: "Role changes, edits and deletions made by staff show up here."}
						</EmptyDescription>
					</EmptyHeader>
					{filtered ? (
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								void setParams({
									search: null,
									actions: null,
									actors: null,
									targetType: null,
									rangeBy: null,
									rangeMin: null,
									rangeMax: null,
									page: 1,
								});
							}}
						>
							Clear filters
						</Button>
					) : null}
				</Empty>
			) : (
				<>
					<ul className="flex flex-col divide-y divide-border border border-border">
						{data.items.map((item) => (
							<AuditRow key={item.id} item={item} />
						))}
					</ul>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-muted-foreground text-sm tabular-nums">
							{data.metadata.total.toLocaleString()} entr
							{data.metadata.total === 1 ? "y" : "ies"}
							{data.metadata.totalPages > 1
								? ` · page ${data.metadata.page} of ${data.metadata.totalPages}`
								: ""}
						</p>
						{data.metadata.totalPages > 1 ? (
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={data.metadata.prevPage == null}
									onClick={() => {
										if (data.metadata.prevPage != null) {
											void setParams({ page: data.metadata.prevPage });
										}
									}}
								>
									Previous
								</Button>
								<Button
									variant="outline"
									size="sm"
									disabled={data.metadata.nextPage == null}
									onClick={() => {
										if (data.metadata.nextPage != null) {
											void setParams({ page: data.metadata.nextPage });
										}
									}}
								>
									Next
								</Button>
							</div>
						) : null}
					</div>
				</>
			)}
		</div>
	);
}
