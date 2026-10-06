"use client";

import type { AdminFactRecord } from "@bbrc/api/modules/admin/admin-fact.schema";
import { Button } from "@bbrc/ui/components/button";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Eye, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminFactEngagementDialog } from "@/components/blocks/admin-fact-engagement-dialog";
import { FactCategoryBadge } from "@/components/blocks/fact-category-badge";
import { FactStatusBadge } from "@/components/blocks/fact-status-badge";
import {
	buildAdminFactsListInput,
	useAdminFactsListingSearchParams,
} from "@/lib/listing/admin-facts-listing";
import { orpc, queryClient } from "@/utils/orpc";

function formatDate(date: Date) {
	return new Intl.DateTimeFormat(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(date);
}

async function invalidateAdminFacts() {
	await queryClient.invalidateQueries({ queryKey: orpc.admin.listFacts.key() });
	await queryClient.invalidateQueries({ queryKey: orpc.fact.pullDeck.key() });
}

type EngagementTarget = {
	fact: AdminFactRecord;
	kind: "upvotes" | "downvotes" | "impressions";
};

export function AdminFactsInventory() {
	const [params, setParams] = useAdminFactsListingSearchParams();
	const listInput = buildAdminFactsListInput(params);
	const [engagement, setEngagement] = useState<EngagementTarget | null>(null);
	const [engagementPage, setEngagementPage] = useState(1);
	const [dialogOpen, setDialogOpen] = useState(false);

	const listQuery = useQuery(
		orpc.admin.listFacts.queryOptions({
			input: listInput,
		}),
	);

	const publishMutation = useMutation(
		orpc.admin.publishFact.mutationOptions({
			onSuccess: async () => {
				toast.success("Fact is live in reels.");
				await invalidateAdminFacts();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const deleteMutation = useMutation(
		orpc.admin.deleteFact.mutationOptions({
			onSuccess: async () => {
				toast.success("Fact removed.");
				await invalidateAdminFacts();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	function openEngagement(
		fact: AdminFactRecord,
		kind: EngagementTarget["kind"],
	) {
		setEngagement({ fact, kind });
		setEngagementPage(1);
		setDialogOpen(true);
	}

	const total = listQuery.data?.metadata.total ?? 0;
	const page = params.page;
	const listStatus = params.status;

	return (
		<section className="flex flex-col gap-6">
			<div className="flex flex-col gap-4 border border-border bg-muted/20 p-5 md:flex-row md:items-end md:justify-between">
				<div className="flex max-w-xl flex-col gap-1">
					<h2 className="font-semibold text-xl tracking-tight">Inventory</h2>
					<p className="text-muted-foreground text-sm leading-relaxed">
						Published facts flow to member reels with taste-aware ordering.
						Impressions track views; upvotes and downvotes train
						recommendations.
					</p>
					{listQuery.data ? (
						<p className="text-muted-foreground text-xs tabular-nums">
							{total} fact{total === 1 ? "" : "s"} in this view
						</p>
					) : null}
				</div>
				<Select
					value={listStatus}
					onValueChange={(value) => {
						void setParams({
							status: value as typeof listStatus,
							page: 1,
						});
					}}
				>
					<SelectTrigger className="w-full md:w-44">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All facts</SelectItem>
						<SelectItem value="draft">Drafts only</SelectItem>
						<SelectItem value="published">Live only</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{listQuery.isPending ? (
				<div className="flex flex-col gap-3">
					{Array.from({ length: 4 }, (_, index) => (
						<Skeleton key={index} className="h-28 w-full" />
					))}
				</div>
			) : listQuery.isError ? (
				<div className="border border-dashed px-6 py-8 text-sm">
					{listQuery.error.message}
				</div>
			) : listQuery.data.items.length === 0 ? (
				<div className="border border-dashed px-6 py-12 text-center">
					<p className="font-medium text-sm">Nothing here yet</p>
					<p className="mt-1 text-muted-foreground text-sm">
						Generate a batch above, publish picks you like, and they will show
						up here.
					</p>
				</div>
			) : (
				<ul className="flex flex-col gap-3">
					{listQuery.data.items.map((row) => (
						<li
							key={row.id}
							className="grid gap-4 border border-border bg-background p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-6 md:p-5"
						>
							<div className="flex min-w-0 flex-col gap-3">
								<div className="flex flex-wrap items-center gap-2">
									<FactCategoryBadge category={row.category} />
									<FactStatusBadge publishedAt={row.publishedAt} />
								</div>
								<p className="font-serif text-base leading-snug md:text-lg">
									{row.body}
								</p>
								<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
									<span>{formatDate(row.createdAt)}</span>
									<span aria-hidden>·</span>
									<span>Added by @{row.createdBy.username}</span>
									<a
										href={row.source}
										target="_blank"
										rel="noopener noreferrer"
										className="underline underline-offset-2 hover:text-foreground"
									>
										Source
									</a>
								</div>
							</div>

							<div className="flex flex-row flex-wrap items-center gap-2 md:flex-col md:items-stretch md:gap-3">
								<div className="flex flex-1 gap-2 md:flex-col">
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="justify-start tabular-nums"
										disabled={row.impressionCount === 0}
										onClick={() => openEngagement(row, "impressions")}
									>
										<Eye className="size-4 shrink-0" aria-hidden />
										{row.impressionCount} seen
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="justify-start tabular-nums"
										disabled={row.upvoteCount === 0}
										onClick={() => openEngagement(row, "upvotes")}
									>
										<ThumbsUp className="size-4 shrink-0" aria-hidden />
										{row.upvoteCount} up
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="justify-start tabular-nums"
										disabled={row.downvoteCount === 0}
										onClick={() => openEngagement(row, "downvotes")}
									>
										<ThumbsDown className="size-4 shrink-0" aria-hidden />
										{row.downvoteCount} down
									</Button>
								</div>
								<div className="flex gap-2 md:w-full">
									{!row.publishedAt ? (
										<LoadingButton
											type="button"
											size="sm"
											className="flex-1"
											loading={publishMutation.isPending}
											onClick={() => publishMutation.mutate({ id: row.id })}
										>
											Publish
										</LoadingButton>
									) : null}
									<Button
										type="button"
										size="icon-sm"
										variant="ghost"
										aria-label="Delete fact"
										disabled={deleteMutation.isPending}
										onClick={() => deleteMutation.mutate({ id: row.id })}
									>
										<Trash2 className="size-4" aria-hidden />
									</Button>
								</div>
							</div>
						</li>
					))}
				</ul>
			)}

			{listQuery.data && listQuery.data.metadata.totalPages > 1 ? (
				<div className="flex items-center justify-between gap-2 border border-border px-4 py-3">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={page <= 1}
						onClick={() => void setParams({ page: page - 1 })}
					>
						Previous
					</Button>
					<span className="text-muted-foreground text-sm tabular-nums">
						Page {page} of {listQuery.data.metadata.totalPages}
					</span>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={!listQuery.data.metadata.hasNextPage}
						onClick={() => void setParams({ page: page + 1 })}
					>
						Next
					</Button>
				</div>
			) : null}

			<AdminFactEngagementDialog
				fact={engagement?.fact ?? null}
				kind={engagement?.kind ?? null}
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				page={engagementPage}
				onPageChange={setEngagementPage}
			/>
		</section>
	);
}
