"use client";

import type { AdminFactRecord } from "@bbrc/api/modules/admin/admin-fact.schema";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { UserPanel } from "@/components/blocks/user-panel";
import { Link } from "@/i18n/navigation";
import { formatDateTime } from "@/lib/format-datetime";
import { orpc } from "@/utils/orpc";

const PAGE_SIZE = 20;

type EngagementKind = "upvotes" | "downvotes" | "impressions";

type AdminFactEngagementDialogProps = {
	fact: AdminFactRecord | null;
	kind: EngagementKind | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	page: number;
	onPageChange: (page: number) => void;
};

export function AdminFactEngagementDialog({
	fact,
	kind,
	open,
	onOpenChange,
	page,
	onPageChange,
}: AdminFactEngagementDialogProps) {
	const upvotesQuery = useQuery(
		orpc.admin.listFactVotes.queryOptions({
			input: {
				id: fact?.id ?? "",
				page,
				limit: PAGE_SIZE,
				direction: "up",
			},
			enabled: open && kind === "upvotes" && fact != null,
		}),
	);

	const downvotesQuery = useQuery(
		orpc.admin.listFactVotes.queryOptions({
			input: {
				id: fact?.id ?? "",
				page,
				limit: PAGE_SIZE,
				direction: "down",
			},
			enabled: open && kind === "downvotes" && fact != null,
		}),
	);

	const impressionsQuery = useQuery(
		orpc.admin.listFactImpressions.queryOptions({
			input: {
				id: fact?.id ?? "",
				page,
				limit: PAGE_SIZE,
			},
			enabled: open && kind === "impressions" && fact != null,
		}),
	);

	const activeQuery =
		kind === "impressions"
			? impressionsQuery
			: kind === "downvotes"
				? downvotesQuery
				: upvotesQuery;

	const title =
		kind === "impressions"
			? "Who saw this"
			: kind === "downvotes"
				? "Who downvoted"
				: "Who upvoted";
	const emptyTitle =
		kind === "impressions"
			? "No impressions yet"
			: kind === "downvotes"
				? "No downvotes yet"
				: "No upvotes yet";
	const emptyDescription =
		kind === "impressions"
			? "Members appear here after the fact shows in their reel."
			: "Votes from the reel feed show up here.";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[min(32rem,85dvh)] flex-col gap-0 sm:max-w-md">
				<DialogHeader className="border-border border-b pb-4">
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription className="line-clamp-2 font-serif text-base text-foreground">
						{fact?.body}
					</DialogDescription>
				</DialogHeader>

				<div className="min-h-0 flex-1 overflow-y-auto py-4">
					{activeQuery.isPending ? (
						<div className="flex flex-col gap-3">
							{Array.from({ length: 4 }, (_, index) => (
								<Skeleton key={index} className="h-12 w-full" />
							))}
						</div>
					) : activeQuery.isError ? (
						<p className="text-destructive text-sm">
							{activeQuery.error.message}
						</p>
					) : activeQuery.data.items.length === 0 ? (
						<div className="py-8 text-center">
							<p className="font-medium text-sm">{emptyTitle}</p>
							<p className="mt-1 text-muted-foreground text-sm">
								{emptyDescription}
							</p>
						</div>
					) : (
						<ul className="flex flex-col gap-3">
							{activeQuery.data.items.map((row) => (
								<li key={`${row.user.id}-${row.createdAt.toISOString()}`}>
									<Link
										href={`/users/${row.user.username}` as Route}
										className="flex items-center justify-between gap-3 border border-border p-3 hover:bg-muted/30"
									>
										<UserPanel user={row.user} />
										<time
											className="shrink-0 text-muted-foreground text-xs tabular-nums"
											dateTime={row.createdAt.toISOString()}
										>
											{formatDateTime(row.createdAt)}
										</time>
									</Link>
								</li>
							))}
						</ul>
					)}
				</div>

				{activeQuery.data && activeQuery.data.metadata.totalPages > 1 ? (
					<div className="flex items-center justify-between gap-2 border-border border-t pt-4">
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={page <= 1}
							onClick={() => onPageChange(page - 1)}
						>
							Previous
						</Button>
						<span className="text-muted-foreground text-xs tabular-nums">
							Page {page} of {activeQuery.data.metadata.totalPages}
						</span>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={!activeQuery.data.metadata.hasNextPage}
							onClick={() => onPageChange(page + 1)}
						>
							Next
						</Button>
					</div>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
