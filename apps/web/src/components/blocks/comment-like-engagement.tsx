"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { useMutation } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { CommentLikersDialogList } from "@/components/blocks/comment-likers-dialog-list";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

type CommentLikeEngagementProps = {
	commentSlug: string;
	initialLikeCount: number;
	initialLikedByMe: boolean;
	size?: "sm" | "md";
	className?: string;
};

async function invalidateCommentLikeQueries() {
	await queryClient.invalidateQueries({
		queryKey: orpc.comment.getCommentList.key(),
	});
	await queryClient.invalidateQueries({
		queryKey: orpc.post.getPostList.key(),
	});
	await queryClient.invalidateQueries({
		queryKey: orpc.post.getPostBySlug.key(),
	});
	await queryClient.invalidateQueries({
		queryKey: orpc.like.getLikeList.key(),
	});
}

export function CommentLikeEngagement({
	commentSlug,
	initialLikeCount,
	initialLikedByMe,
	size = "md",
	className,
}: CommentLikeEngagementProps) {
	const { data: session } = authClient.useSession();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [likeCount, setLikeCount] = useState(initialLikeCount);
	const [likedByMe, setLikedByMe] = useState(initialLikedByMe);
	const isSmall = size === "sm";

	const toggleMutation = useMutation(
		orpc.like.toggle.mutationOptions({
			onMutate: () => {
				const snapshot = { likedByMe, likeCount };
				setLikedByMe((current) => !current);
				setLikeCount((count) => (snapshot.likedByMe ? count - 1 : count + 1));
				return snapshot;
			},
			onSuccess: async (result) => {
				setLikedByMe(result.liked);
				setLikeCount(result.likeCount);
				await invalidateCommentLikeQueries();
			},
			onError: (error, _variables, context) => {
				if (context) {
					setLikedByMe(context.likedByMe);
					setLikeCount(context.likeCount);
				}
				toast.error(error.message);
			},
		}),
	);

	function handleToggleLike() {
		if (!session?.user) {
			toast.error("Sign in to like comments.", {
				action: {
					label: "Sign in",
					onClick: () => {
						window.location.href = "/sign-in";
					},
				},
			});
			return;
		}

		toggleMutation.mutate({ commentSlug });
	}

	return (
		<>
			<div
				className={cn(
					"inline-flex items-center gap-0.5 text-muted-foreground",
					isSmall ? "text-xs" : "text-sm",
					className,
				)}
			>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					className={cn(
						"text-muted-foreground",
						isSmall && "size-7",
						likedByMe && "text-foreground",
					)}
					disabled={toggleMutation.isPending}
					onClick={handleToggleLike}
					aria-label={likedByMe ? "Unlike comment" : "Like comment"}
					aria-pressed={likedByMe}
				>
					<Heart
						className={cn(
							isSmall ? "size-3" : "size-4",
							likedByMe && "fill-current",
						)}
						aria-hidden
					/>
				</Button>
				<Button
					type="button"
					variant="link"
					className={cn(
						"h-auto px-1 py-0 text-inherit tabular-nums",
						isSmall && "text-xs",
					)}
					onClick={() => setDialogOpen(true)}
				>
					{likeCount}
				</Button>
			</div>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="flex max-h-[min(90vh,560px)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
					<DialogHeader className="border-border border-b p-4">
						<DialogTitle>Likes</DialogTitle>
						<DialogDescription>
							{likeCount === 1
								? "1 member liked this comment."
								: `${likeCount} members liked this comment.`}
						</DialogDescription>
					</DialogHeader>
					<div className="min-h-0 flex-1 overflow-y-auto p-4">
						<CommentLikersDialogList
							commentSlug={commentSlug}
							enabled={dialogOpen}
						/>
					</div>
					{!session?.user ? (
						<p className="border-border border-t px-4 py-3 text-center text-muted-foreground text-sm">
							<Link
								href={"/sign-in" as Route}
								className="text-foreground underline"
							>
								Sign in
							</Link>{" "}
							to like this comment.
						</p>
					) : null}
				</DialogContent>
			</Dialog>
		</>
	);
}
