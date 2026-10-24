"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import { useMutation } from "@tanstack/react-query";
import {
	BarChart3,
	LineChart,
	MoreHorizontal,
	Pencil,
	Trash2,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { authClient } from "@/lib/auth-client";
import { removeFromLists } from "@/lib/optimistic/infinite-lists";
import { orpc, queryClient } from "@/utils/orpc";

type PostOwnerMenuProps = {
	slug: string;
	authorUsername: string;
	hasPoll?: boolean;
	/** Where to go once the post is deleted, e.g. away from its own page. */
	afterDeleteHref?: Route;
};

/** Deletes a post. It disappears from every list at once and comes back if the server refuses. */
export function usePostDelete({
	slug,
	afterDeleteHref,
	onStart,
}: {
	slug: string;
	afterDeleteHref?: Route;
	onStart?: () => void;
}) {
	const router = useRouter();
	const postListKey = orpc.post.getPostList.key();

	return useMutation(
		orpc.post.delete.mutationOptions({
			onMutate: async () => {
				await queryClient.cancelQueries({ queryKey: postListKey });
				const snapshots = queryClient.getQueriesData({ queryKey: postListKey });
				removeFromLists(postListKey, slug);
				onStart?.();
				if (afterDeleteHref) {
					router.push(afterDeleteHref);
				}
				return { snapshots };
			},
			onError: (error, _variables, context) => {
				for (const [key, data] of context?.snapshots ?? []) {
					queryClient.setQueryData(key, data);
				}
				toast.error(error.message ?? "Could not delete the post.");
			},
			onSuccess: () => toast.success("Post deleted."),
			onSettled: () => {
				void queryClient.invalidateQueries({ queryKey: postListKey });
			},
		}),
	);
}

/** Edit, poll stats and delete for the author of a post. Deleting happens on screen first. */
export function PostOwnerMenu({
	slug,
	authorUsername,
	hasPoll = false,
	afterDeleteHref,
}: PostOwnerMenuProps) {
	const { data: session } = authClient.useSession();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const deleteMutation = usePostDelete({
		slug,
		afterDeleteHref,
		onStart: () => setConfirmOpen(false),
	});

	const isAuthor =
		Boolean(session?.user.username) &&
		session?.user.username === authorUsername;
	const isAdmin = Boolean(session?.user.isAdmin);

	if (!isAuthor && !isAdmin) {
		return null;
	}

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							className="text-muted-foreground"
							aria-label="Post options"
						/>
					}
				>
					<MoreHorizontal className="size-4" aria-hidden />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="min-w-44">
					{isAuthor ? (
						<DropdownMenuItem
							render={<Link href={`/posts/${slug}/edit` as Route} />}
						>
							<Pencil aria-hidden />
							Edit post
						</DropdownMenuItem>
					) : null}
					<DropdownMenuItem
						render={<Link href={`/posts/${slug}/insights` as Route} />}
					>
						<LineChart aria-hidden />
						Insights
					</DropdownMenuItem>
					{hasPoll ? (
						<DropdownMenuItem
							render={<Link href={`/posts/${slug}/poll/stats` as Route} />}
						>
							<BarChart3 aria-hidden />
							Poll stats
						</DropdownMenuItem>
					) : null}
					{isAuthor ? (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								variant="destructive"
								onClick={() => setConfirmOpen(true)}
							>
								<Trash2 aria-hidden />
								Delete post
							</DropdownMenuItem>
						</>
					) : null}
				</DropdownMenuContent>
			</DropdownMenu>

			<DestructiveConfirmDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				title="Delete this post?"
				description="Its comments, likes and any poll votes go with it. This cannot be undone."
				confirmLabel="Delete post"
				onConfirm={() => deleteMutation.mutate({ slug })}
			/>
		</>
	);
}
