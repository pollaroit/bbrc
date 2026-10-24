import type { PostAttachmentOutput } from "@bbrc/api/modules/post/post-attachment.schema";

/** Short label for previews, OG, and compose summary. */
export function postAttachmentLabel(attachment: PostAttachmentOutput): string {
	switch (attachment.kind) {
		case "book":
			return attachment.book.title;
		case "shelf":
			return attachment.shelf.title;
		case "sitting":
			return attachment.sitting.displayName;
		case "user":
			return `@${attachment.user.username}`;
		case "feedback":
			return `${attachment.feedback.book.title} review`;
		case "post":
			return attachment.post.contentPreview;
		case "comment":
			return attachment.comment.contentPreview;
		case "author":
			return attachment.author.name;
		default: {
			const _exhaustive: never = attachment;
			return _exhaustive;
		}
	}
}
