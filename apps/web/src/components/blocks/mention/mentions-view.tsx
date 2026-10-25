"use client";

import type { MentionItem } from "@bbrc/api/modules/mention/mention.schema";
import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import {
	type InfiniteData,
	useInfiniteQuery,
	useMutation,
} from "@tanstack/react-query";
import { AtSign, MessageSquare, Newspaper, Star } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { RelativeTime } from "@/components/blocks/relative-time";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { orpc, queryClient } from "@/utils/orpc";

type MentionPage = { items: MentionItem[]; nextCursor: string | null };

const KIND_LABEL: Record<MentionItem["kind"], string> = {
	post: "Post",
	comment: "Comment",
	review: "Review",
};

const KIND_ICON = {
	post: Newspaper,
	comment: MessageSquare,
	review: Star,
} as const;

const PAGE_SIZE = 20;

function MentionRow({
	item,
	onRemove,
}: {
	item: MentionItem;
	onRemove: (item: MentionItem) => void;
}) {
	const Icon = KIND_ICON[item.kind];
	return (
		<li className="relative flex flex-col gap-2 border border-border bg-card p-3 transition-colors focus-within:bg-muted/20 hover:bg-muted/20">
			<div className="flex items-center gap-2.5">
				<UserAvatar
					user={{ name: item.author.name, image: item.author.image }}
					className="size-8"
				/>
				<div className="flex min-w-0 flex-1 flex-col">
					<span className="truncate font-medium text-sm leading-tight">
						{item.author.name}
					</span>
					<span className="truncate text-muted-foreground text-xs">
						@{item.author.username} mentioned you{" "}
						<RelativeTime date={item.createdAt} />
					</span>
				</div>
				<span className="inline-flex shrink-0 items-center gap-1 border border-border px-1.5 py-0.5 text-2xs text-muted-foreground">
					<Icon className="size-3" aria-hidden />
					{KIND_LABEL[item.kind]}
				</span>
			</div>
			<p className="line-clamp-3 text-pretty text-sm leading-relaxed">
				<Link
					href={item.href as Route}
					className="outline-none after:absolute after:inset-0 focus-visible:underline"
				>
					{item.excerpt || "Open it to read"}
				</Link>
			</p>
			<div className="relative z-1 flex justify-end">
				<Button
					type="button"
					size="xs"
					variant="ghost"
					className="text-muted-foreground"
					onClick={() => onRemove(item)}
				>
					Remove my mention
				</Button>
			</div>
		</li>
	);
}

/** Where you were mentioned, newest first, with a way to take your name out of it. */
export function MentionsView() {
	const [confirming, setConfirming] = useState<MentionItem | null>(null);

	const query = useInfiniteQuery(
		orpc.mention.mine.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
			input: (cursor) => ({
				limit: PAGE_SIZE,
				...(cursor != null ? { cursor } : {}),
			}),
		}),
	);
	const key = orpc.mention.mine.key();

	const items = useMemo(() => {
		const seen = new Set<string>();
		const merged: MentionItem[] = [];
		for (const page of query.data?.pages ?? []) {
			for (const item of page.items) {
				if (seen.has(item.id)) continue;
				seen.add(item.id);
				merged.push(item);
			}
		}
		return merged;
	}, [query.data?.pages]);

	const remove = useMutation(
		orpc.mention.remove.mutationOptions({
			onMutate: async ({ id }) => {
				await queryClient.cancelQueries({ queryKey: key });
				const snapshots = queryClient.getQueriesData<InfiniteData<MentionPage>>(
					{
						queryKey: key,
					},
				);
				queryClient.setQueriesData<InfiniteData<MentionPage>>(
					{ queryKey: key },
					(old) =>
						old
							? {
									...old,
									pages: old.pages.map((page) => ({
										...page,
										items: page.items.filter((item) => item.id !== id),
									})),
								}
							: old,
				);
				return { snapshots };
			},
			onError: (error, _input, context) => {
				for (const [queryKey, data] of context?.snapshots ?? []) {
					queryClient.setQueryData(queryKey, data);
				}
				toast.error(error.message);
			},
			onSuccess: () => toast.success("Your mention was removed."),
			onSettled: () => {
				void queryClient.invalidateQueries({ queryKey: key });
			},
		}),
	);

	return (
		<section className="flex flex-col gap-4" aria-labelledby="mentions-heading">
			<header className="flex flex-col gap-1">
				<h2
					id="mentions-heading"
					className="font-semibold text-lg tracking-tight"
				>
					Mentions
				</h2>
				<p className="max-w-prose text-muted-foreground text-sm">
					Posts, comments and reviews where someone mentioned you. Only you can
					see this page. Removing a mention turns your name into plain text
					there.
				</p>
			</header>

			{query.isPending ? (
				<div className="flex flex-col gap-3">
					{Array.from({ length: 4 }, (_, index) => (
						<Skeleton key={index} className="h-28 w-full" aria-hidden />
					))}
				</div>
			) : query.isError ? (
				<div className="flex flex-col items-start gap-2 border border-destructive/40 bg-destructive/5 p-4">
					<p className="text-destructive-ink text-sm">
						Could not load your mentions.
					</p>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => void query.refetch()}
					>
						Try again
					</Button>
				</div>
			) : items.length === 0 ? (
				<div className="flex flex-col items-center gap-2 border border-border border-dashed px-6 py-12 text-center">
					<AtSign className="size-6 text-muted-foreground" aria-hidden />
					<p className="font-medium text-sm">Nobody has mentioned you yet</p>
					<p className="max-w-sm text-muted-foreground text-sm">
						When a member writes @ and picks your name in a post, comment or
						review, it will show up here.
					</p>
				</div>
			) : (
				<>
					<ul className="flex flex-col gap-3">
						{items.map((item) => (
							<MentionRow key={item.id} item={item} onRemove={setConfirming} />
						))}
					</ul>
					{query.hasNextPage ? (
						<div className="flex justify-center">
							<Button
								type="button"
								variant="outline"
								disabled={query.isFetchingNextPage}
								onClick={() => void query.fetchNextPage()}
							>
								{query.isFetchingNextPage ? "Loading…" : "Load more"}
							</Button>
						</div>
					) : null}
				</>
			)}

			<DestructiveConfirmDialog
				open={confirming != null}
				onOpenChange={(open) => {
					if (!open) setConfirming(null);
				}}
				title="Remove your mention?"
				description={
					confirming
						? `Your name stays in ${confirming.author.name}'s ${KIND_LABEL[confirming.kind].toLowerCase()} as plain text, without a link or a highlight. This cannot be undone.`
						: ""
				}
				confirmLabel="Remove my mention"
				onConfirm={() => {
					if (confirming) remove.mutate({ id: confirming.id });
					setConfirming(null);
				}}
			/>
		</section>
	);
}
