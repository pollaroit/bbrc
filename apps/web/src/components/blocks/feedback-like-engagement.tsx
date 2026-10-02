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
import { useState } from "react";
import { toast } from "sonner";
import { PostLikersDialogList } from "@/components/blocks/post-likers-dialog-list";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

type FeedbackLikeEngagementProps = {
	feedbackSlug: string;
	initialLikeCount: number;
	initialLikedByMe: boolean;
	canLike: boolean;
	className?: string;
};

async function invalidateFeedbackLikeQueries() {
	await queryClient.invalidateQueries({
		queryKey: orpc.feedback.getFeedbackBySlug.key(),
	});
	await queryClient.invalidateQueries({
		queryKey: orpc.feedback.getBookFeedbackList.key(),
	});
	await queryClient.invalidateQueries({
		queryKey: orpc.like.getLikeList.key(),
	});
}

export function FeedbackLikeEngagement({
	feedbackSlug,
	initialLikeCount,
	initialLikedByMe,
	canLike,
	className,
}: FeedbackLikeEngagementProps) {
	const { data: session } = authClient.useSession();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [likeCount, setLikeCount] = useState(initialLikeCount);
	const [likedByMe, setLikedByMe] = useState(initialLikedByMe);

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
				await invalidateFeedbackLikeQueries();
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
			toast.error("Sign in to like reviews.");
			return;
		}

		if (!canLike) {
			toast.error(
				"Only participants of the sitting that read this book can like reviews.",
			);
			return;
		}

		toggleMutation.mutate({ feedbackSlug });
	}

	return (
		<>
			<div className={cn("inline-flex items-center gap-1", className)}>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className={cn(
						"h-8 gap-1.5 px-2 tabular-nums",
						likedByMe && "text-rose-600 hover:text-rose-600",
					)}
					disabled={toggleMutation.isPending}
					onClick={handleToggleLike}
					aria-pressed={likedByMe}
				>
					<Heart
						className={cn("size-4", likedByMe && "fill-current")}
						aria-hidden
					/>
					{likeCount}
				</Button>
				{likeCount > 0 ? (
					<Button
						type="button"
						variant="link"
						size="sm"
						className="h-8 px-1 text-muted-foreground text-xs"
						onClick={() => setDialogOpen(true)}
					>
						See who liked
					</Button>
				) : null}
			</div>
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="flex max-h-[min(90vh,560px)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
					<DialogHeader className="border-border border-b p-4">
						<DialogTitle>Likes</DialogTitle>
						<DialogDescription>
							Members who liked this review.
						</DialogDescription>
					</DialogHeader>
					<div className="min-h-0 flex-1 overflow-y-auto p-4">
						<PostLikersDialogList
							feedbackSlug={feedbackSlug}
							enabled={dialogOpen}
						/>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
