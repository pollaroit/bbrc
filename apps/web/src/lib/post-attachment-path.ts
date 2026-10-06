import type { PostAttachmentOutput } from "@bbrc/api/modules/post/post-attachment.schema";
import type { Route } from "next";

export function postAttachmentHref(
	attachment: PostAttachmentOutput,
): Route | null {
	switch (attachment.kind) {
		case "book":
			return `/books/${attachment.book.slug}` as Route;
		case "shelf":
			return `/users/${attachment.shelf.ownerUsername}/shelves/${attachment.shelf.slug}` as Route;
		case "sitting":
			return `/sittings/${attachment.sitting.slug}` as Route;
		case "user":
			return `/users/${attachment.user.username}` as Route;
		case "feedback":
			return `/books/${attachment.feedback.book.slug}/feedbacks/${attachment.feedback.slug}` as Route;
		case "post":
			return `/posts/${attachment.post.slug}` as Route;
		case "comment": {
			const { comment } = attachment;
			if (comment.contextPost) {
				return `/posts/${comment.contextPost.slug}/comments/${comment.slug}` as Route;
			}
			if (comment.feedbackBookSlug && comment.feedbackSlug) {
				return `/books/${comment.feedbackBookSlug}/feedbacks/${comment.feedbackSlug}/comments/${comment.slug}` as Route;
			}
			return null;
		}
		default: {
			const _exhaustive: never = attachment;
			return _exhaustive;
		}
	}
}
