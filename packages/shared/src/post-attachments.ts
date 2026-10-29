/**
 * What may sit together on one post. Every rule lives here, so the composer,
 * the create and update calls and the image upload all agree.
 *
 * A post has at most one "primary attachment": a poll, a tierlist, a shared
 * thing (book, shelf, sitting, member, review, post, comment, author) or an
 * image. Text is always allowed (and required for a poll or a tierlist).
 */
export type PostAttachmentParts = {
	poll?: boolean;
	tierlist?: boolean;
	/** A shared book, shelf, sitting, member, review, post, comment or author. */
	attachment?: boolean;
	image?: boolean;
};

/** Why these cannot be on one post, or null when they can. */
export function postAttachmentConflict(
	parts: PostAttachmentParts,
): string | null {
	if (parts.poll && parts.tierlist) {
		return "A post cannot have both a poll and a tierlist.";
	}
	if (parts.poll && parts.attachment) {
		return "A post with a poll cannot have another attachment.";
	}
	if (parts.tierlist && parts.attachment) {
		return "A post with a tierlist cannot have another attachment.";
	}
	if (parts.poll && parts.image) {
		return "A post with a poll cannot have an image.";
	}
	if (parts.tierlist && parts.image) {
		return "A post with a tierlist cannot have an image.";
	}
	return null;
}
