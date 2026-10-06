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
import Link from "next/link";
import { UserPanel } from "@/components/blocks/user-panel";
import { formatDateTime } from "@/lib/format-datetime";
import { orpc } from "@/utils/orpc";

const PAGE_SIZE = 20;

type EngagementKind = "likes" | "impressions";

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
	const query = useQuery(
		orpc.admin.listFactLikes.queryOptions({
			input: {
				id: fact?.id ?? "",
				page,
				limit: PAGE_SIZE,
			},
			enabled: open && kind === "likes" && fact != null,
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

	const activeQuery = kind === "impressions" ? impressionsQuery : query;
	const title = kind === "impressions" ? "Who saw this" : "Who liked this";
	const emptyTitle =
		kind === "impressions" ? "No impressions yet" : "No likes yet";
	const emptyDescription =
		kind === "impressions"
			? "Members appear here after the fact shows in their reel."
			: "Likes from the reel feed show up here.";

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
						<div className="flex flex-col gap-2" aria-hidden>
							{Array.from({ length: 4 }, (_, index) => (
								<Skeleton key={index} className="h-14 w-full" />
							))}
						</div>
					) : activeQuery.isError ? (
						<p className="text-muted-foreground text-sm">
							{activeQuery.error.message}
						</p>
					) : activeQuery.data.items.length === 0 ? (
						<div className="border border-dashed px-4 py-8 text-center">
							<p className="font-medium text-sm">{emptyTitle}</p>
							<p className="mt-1 text-muted-foreground text-sm">
								{emptyDescription}
							</p>
						</div>
					) : (
						<ul className="flex flex-col gap-2">
							{activeQuery.data.items.map((entry) => (
								<li
									key={`${entry.user.username}-${entry.createdAt.toString()}`}
								>
									<Link
										href={`/users/${entry.user.username}` as Route}
										className="flex items-center justify-between gap-3 border border-border px-3 py-2 transition-colors hover:bg-muted/40"
									>
										<UserPanel user={entry.user} className="min-w-0" />
										<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
											{formatDateTime(entry.createdAt)}
										</span>
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
