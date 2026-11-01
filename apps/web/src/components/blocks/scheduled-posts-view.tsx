"use client";

import { Button } from "@bbrc/ui/components/button";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Trash2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { PostCardPost } from "@/components/blocks/post-card";
import { PostCard } from "@/components/blocks/post-card";
import { RelativeTime } from "@/components/blocks/relative-time";
import { orpc } from "@/utils/orpc";

type ScheduledPostsViewProps = {
	/** When set, only the profile owner may use actions. */
	readOnly?: boolean;
};

export function ScheduledPostsView({
	readOnly = false,
}: ScheduledPostsViewProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const listKey = orpc.post.listScheduled.key();

	const query = useQuery(
		orpc.post.listScheduled.queryOptions({ input: { page: 1, limit: 50 } }),
	);

	const publishMutation = useMutation(
		orpc.post.publishNow.mutationOptions({
			onSuccess: ({ slug, xpAwarded }) => {
				void queryClient.invalidateQueries({ queryKey: listKey });
				void queryClient.invalidateQueries({
					queryKey: orpc.post.getPostList.key(),
				});
				toast.success(
					xpAwarded > 0
						? `Post published (+${xpAwarded} XP)`
						: "Post published.",
					{
						action: {
							label: "View",
							onClick: () => router.push(`/posts/${slug}` as Route),
						},
					},
				);
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const deleteMutation = useMutation(
		orpc.post.delete.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({ queryKey: listKey });
				toast.success("Scheduled post deleted.");
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	if (query.isLoading) {
		return (
			<p className="text-muted-foreground text-sm">Loading scheduled posts…</p>
		);
	}

	if (query.isError) {
		return (
			<p className="text-destructive text-sm">
				{query.error.message || "Could not load scheduled posts."}
			</p>
		);
	}

	const items = query.data?.items ?? [];

	if (items.length === 0) {
		return (
			<div className="border border-border bg-muted/20 px-6 py-10 text-center">
				<CalendarClock className="mx-auto mb-3 size-8 text-muted-foreground" />
				<p className="font-medium text-sm">Nothing scheduled</p>
				<p className="mt-1 text-muted-foreground text-sm">
					When you schedule a post from the composer, it will appear here until
					it goes live.
				</p>
			</div>
		);
	}

	return (
		<ul className="flex flex-col gap-6">
			{items.map((post) => (
				<ScheduledPostRow
					key={post.slug}
					post={post}
					readOnly={readOnly}
					publishing={publishMutation.isPending}
					deleting={deleteMutation.isPending}
					onPublish={() => publishMutation.mutate({ slug: post.slug })}
					onDelete={() => deleteMutation.mutate({ slug: post.slug })}
				/>
			))}
		</ul>
	);
}

function ScheduledPostRow({
	post,
	readOnly,
	publishing,
	deleting,
	onPublish,
	onDelete,
}: {
	post: PostCardPost;
	readOnly: boolean;
	publishing: boolean;
	deleting: boolean;
	onPublish: () => void;
	onDelete: () => void;
}) {
	return (
		<li className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center justify-between gap-2 border border-border bg-muted/10 px-3 py-2 text-sm">
				<span className="text-muted-foreground">
					Goes live{" "}
					{post.scheduledAt ? <RelativeTime date={post.scheduledAt} /> : "soon"}
				</span>
				{readOnly ? null : (
					<div className="flex flex-wrap gap-2">
						<Button
							variant="outline"
							size="sm"
							render={<Link href={`/posts/${post.slug}` as Route} />}
						>
							Edit
						</Button>
						<LoadingButton size="sm" loading={publishing} onClick={onPublish}>
							Publish now
						</LoadingButton>
						<LoadingButton
							size="sm"
							variant="destructive"
							loading={deleting}
							onClick={onDelete}
						>
							<Trash2 className="size-3.5" aria-hidden />
							Delete
						</LoadingButton>
					</div>
				)}
			</div>
			<PostCard post={post} />
		</li>
	);
}
