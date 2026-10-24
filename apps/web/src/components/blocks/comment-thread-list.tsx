"use client";

import type { CommentListItem } from "@bbrc/api/modules/comment/comment.schema";
import { canReplyAtDepth } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { CommentListItemView } from "@/components/blocks/comment-list-item";
import { PostCommentForm } from "@/components/blocks/post-comment-form";
import {
	buildCommentTree,
	type CommentTreeNode,
	countDescendants,
	extractCommentSubtree,
	treeContainsSlug,
} from "@/lib/build-comment-tree";
import { cn } from "@/lib/utils";

type CommentThreadListProps = {
	comments: CommentListItem[];
	postSlug?: string;
	bookSlug?: string;
	feedbackContextSlug?: string;
	replyingToSlug: string | null;
	onReply: (slug: string) => void;
	onCancelReply: () => void;
	onCommentCreated: () => void;
	/** Render only this comment and its subtree (permalink page). */
	focusRootSlug?: string | null;
	/** Always show nested replies; hide expand/collapse toggles. */
	expandAllReplies?: boolean;
	/** False when replies are turned off for the post (reply buttons are hidden). */
	allowReplies?: boolean;
};

function defaultThreadExpanded(depth: number): boolean {
	return depth < 2;
}

function CommentThreadNode({
	node,
	postSlug,
	bookSlug,
	feedbackContextSlug,
	replyingToSlug,
	onReply,
	onCancelReply,
	onCommentCreated,
	isLastSibling,
	expandAllReplies = false,
	allowReplies = true,
}: {
	node: CommentTreeNode;
	postSlug?: string;
	bookSlug?: string;
	feedbackContextSlug?: string;
	replyingToSlug: string | null;
	onReply: (slug: string) => void;
	onCancelReply: () => void;
	onCommentCreated: () => void;
	isLastSibling: boolean;
	expandAllReplies?: boolean;
	allowReplies?: boolean;
}) {
	const hasReplies = node.children.length > 0;
	const descendantCount = countDescendants(node);
	const [repliesExpanded, setRepliesExpanded] = useState(() =>
		expandAllReplies ? true : defaultThreadExpanded(node.depth),
	);

	useEffect(() => {
		if (treeContainsSlug(node, replyingToSlug)) {
			setRepliesExpanded(true);
		}
	}, [node, replyingToSlug]);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		const hash = window.location.hash.slice(1);
		if (!hash.startsWith("comment-")) {
			return;
		}
		const targetSlug = hash.slice("comment-".length);
		if (treeContainsSlug(node, targetSlug)) {
			setRepliesExpanded(true);
		}
	}, [node]);

	const showReplyForm = replyingToSlug === node.slug;
	const repliesOpen = expandAllReplies || repliesExpanded;
	const showChildren = hasReplies && repliesOpen;

	return (
		<li
			className={cn(
				node.depth === 0 ? "py-4 first:pt-0" : "pt-3",
				node.depth > 0 && "ml-3 border-border border-l pl-3 sm:ml-4 sm:pl-4",
				node.depth > 0 && isLastSibling && "pb-0",
			)}
		>
			<div className="min-w-0">
				<CommentListItemView
					comment={node}
					variant="full"
					layout="thread"
					postSlug={postSlug}
					bookSlug={bookSlug}
					feedbackContextSlug={feedbackContextSlug}
					canReply={allowReplies && canReplyAtDepth(node.depth)}
					onReply={() => onReply(node.slug)}
				/>

				{showReplyForm ? (
					<div className="mt-3 border-border/60 border-l-2 pl-3">
						<PostCommentForm
							{...(postSlug ? { postSlug } : {})}
							{...(feedbackContextSlug
								? { feedbackSlug: feedbackContextSlug }
								: {})}
							parentSlug={node.slug}
							replyToUsername={node.author.username}
							onCancelReply={onCancelReply}
							compact
							autoFocus
							onSubmitted={onCancelReply}
							onSubmitFailed={() => onReply(node.slug)}
							onCommentCreated={onCommentCreated}
						/>
					</div>
				) : null}

				{hasReplies && !expandAllReplies ? (
					<div className="mt-1">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-7 gap-1 px-1.5 font-normal text-muted-foreground/80 text-xs hover:bg-transparent hover:text-muted-foreground"
							aria-expanded={repliesExpanded}
							onClick={() => setRepliesExpanded((open) => !open)}
						>
							{repliesExpanded ? (
								<ChevronDown className="size-3.5 shrink-0" aria-hidden />
							) : (
								<ChevronRight className="size-3.5 shrink-0" aria-hidden />
							)}
							{repliesExpanded
								? "Hide replies"
								: descendantCount === 1
									? "Show 1 reply"
									: `Show ${descendantCount} replies`}
						</Button>
					</div>
				) : null}

				{showChildren ? (
					<ul className="mt-1 flex flex-col">
						{node.children.map((child, index) => (
							<CommentThreadNode
								key={child.slug}
								node={child}
								postSlug={postSlug}
								bookSlug={bookSlug}
								feedbackContextSlug={feedbackContextSlug}
								replyingToSlug={replyingToSlug}
								onReply={onReply}
								onCancelReply={onCancelReply}
								onCommentCreated={onCommentCreated}
								isLastSibling={index === node.children.length - 1}
								expandAllReplies={expandAllReplies}
								allowReplies={allowReplies}
							/>
						))}
					</ul>
				) : null}
			</div>
		</li>
	);
}

export function CommentThreadList({
	comments,
	postSlug,
	bookSlug,
	feedbackContextSlug,
	replyingToSlug,
	onReply,
	onCancelReply,
	onCommentCreated,
	focusRootSlug = null,
	expandAllReplies = false,
	allowReplies = true,
}: CommentThreadListProps) {
	if (focusRootSlug) {
		const focused = extractCommentSubtree(comments, focusRootSlug);
		if (!focused) {
			return null;
		}

		return (
			<ul className="flex flex-col">
				<CommentThreadNode
					node={focused}
					postSlug={postSlug}
					bookSlug={bookSlug}
					feedbackContextSlug={feedbackContextSlug}
					replyingToSlug={replyingToSlug}
					onReply={onReply}
					onCancelReply={onCancelReply}
					onCommentCreated={onCommentCreated}
					isLastSibling
					expandAllReplies={expandAllReplies}
					allowReplies={allowReplies}
				/>
			</ul>
		);
	}

	const roots = buildCommentTree(comments);

	return (
		<ul className="flex flex-col divide-y divide-border/60">
			{roots.map((node, index) => (
				<CommentThreadNode
					key={node.slug}
					node={node}
					postSlug={postSlug}
					bookSlug={bookSlug}
					feedbackContextSlug={feedbackContextSlug}
					replyingToSlug={replyingToSlug}
					onReply={onReply}
					onCancelReply={onCancelReply}
					onCommentCreated={onCommentCreated}
					isLastSibling={index === roots.length - 1}
					expandAllReplies={expandAllReplies}
					allowReplies={allowReplies}
				/>
			))}
		</ul>
	);
}
