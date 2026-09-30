"use client";

import { CommentSchema } from "@bbrc/schemas";
import { Field, FieldLabel } from "@bbrc/ui/components/field";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { AutoGrowTextarea } from "@/components/blocks/auto-grow-textarea";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

type PostCommentFormProps = {
	postSlug: string;
	onCommentCreated?: () => void;
};

async function invalidateCommentQueries() {
	await queryClient.invalidateQueries({
		queryKey: orpc.comment.getCommentList.key(),
	});
	await queryClient.invalidateQueries({
		queryKey: orpc.post.getPostList.key(),
	});
	await queryClient.invalidateQueries({
		queryKey: orpc.post.getPostBySlug.key(),
	});
}

export function PostCommentForm({
	postSlug,
	onCommentCreated,
}: PostCommentFormProps) {
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const [content, setContent] = useState("");

	const createMutation = useMutation(
		orpc.comment.create.mutationOptions({
			onSuccess: async (result) => {
				toast.success(
					result.xpAwarded > 0
						? `Comment posted (+${result.xpAwarded} XP)`
						: "Comment posted.",
				);
				setContent("");
				await invalidateCommentQueries();
				onCommentCreated?.();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	if (sessionPending) {
		return (
			<p className="text-muted-foreground text-sm">Loading comment form…</p>
		);
	}

	if (!session?.user) {
		return (
			<p className="text-muted-foreground text-sm">
				<Link href={"/sign-in" as Route} className="text-foreground underline">
					Sign in
				</Link>{" "}
				to join the conversation.
			</p>
		);
	}

	return (
		<form
			className="flex flex-col gap-3"
			onSubmit={(event) => {
				event.preventDefault();

				const parsed = CommentSchema.shape.content.safeParse(content.trim());

				if (!parsed.success) {
					toast.error(
						parsed.error.issues[0]?.message ??
							"Comment must be between 1 and 5000 characters",
					);
					return;
				}

				createMutation.mutate({
					postSlug,
					content: parsed.data,
				});
			}}
		>
			<Field>
				<FieldLabel htmlFor="post-comment-content">Add a comment</FieldLabel>
				<AutoGrowTextarea
					id="post-comment-content"
					value={content}
					onChange={(event) => setContent(event.target.value)}
					maxLength={5000}
					placeholder="Share your thoughts…"
				/>
			</Field>
			<LoadingButton
				type="submit"
				className="w-fit"
				loading={createMutation.isPending}
				disabled={content.trim().length < 1}
			>
				Post comment
			</LoadingButton>
		</form>
	);
}
