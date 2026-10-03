"use client";

import { Button } from "@bbrc/ui/components/button";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { OpenLibraryWorkTitleLink } from "@/components/blocks/open-library-work-title-link";
import { RelativeTime } from "@/components/blocks/relative-time";
import { orpc, queryClient } from "@/utils/orpc";

export function BlockedOpenLibraryWorksList() {
	const { data, isPending, isError, refetch } = useQuery({
		...orpc.book.listBlockedOpenLibraryWorks.queryOptions(),
		staleTime: 30_000,
	});

	const unblockMutation = useMutation(
		orpc.book.unblockOpenLibraryWork.mutationOptions({
			onSuccess: async () => {
				toast.success("Work unblocked.");
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: orpc.book.listBlockedOpenLibraryWorks.key(),
					}),
				]);
			},
			onError: (error) => {
				toast.error(error.message ?? "Could not unblock this work.");
			},
		}),
	);

	if (isPending) {
		return <p className="text-muted-foreground text-sm">Loading block list…</p>;
	}

	if (isError) {
		return (
			<div className="flex flex-col gap-3">
				<p className="text-muted-foreground text-sm">
					Could not load the block list.
				</p>
				<Button
					type="button"
					size="sm"
					variant="outline"
					onClick={() => refetch()}
				>
					Try again
				</Button>
			</div>
		);
	}

	if ((data?.count ?? 0) === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				No blocked works. Block duplicates or unwanted titles from the Recommend
				sheet on Add book.
			</p>
		);
	}

	return (
		<ul className="flex flex-col gap-3">
			{data?.items.map((item) => (
				<li
					key={item.olid}
					className="flex flex-wrap items-start justify-between gap-3 border border-border p-3"
				>
					<div className="min-w-0 space-y-0.5">
						<OpenLibraryWorkTitleLink
							olid={item.olid}
							title={item.title?.trim() || item.olid}
						/>
						<p className="font-mono text-muted-foreground text-xs">
							{item.olid}
						</p>
						<p className="text-muted-foreground text-xs">
							Blocked by {item.blockedBy.name} (@{item.blockedBy.username}) ·{" "}
							<RelativeTime date={item.createdAt} />
						</p>
					</div>
					<LoadingButton
						type="button"
						size="sm"
						variant="outline"
						loading={unblockMutation.isPending}
						loadingText="Unblocking…"
						onClick={() => unblockMutation.mutate({ olid: item.olid })}
					>
						Unblock
					</LoadingButton>
				</li>
			))}
		</ul>
	);
}
