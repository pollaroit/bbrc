/**
 * What may sit together on one post. Every rule lives here, so the composer,
 * the create and update calls and the image upload all agree.
 *
 * A post has at most one "primary attachment": a poll, a tierlist, a shared
 * thing (book, shelf, sitting, member, review, post, comment, author), an
 * image, a map, a GIF, or an event. Text is always allowed (and required
 * for a poll or a tierlist).
 *
 * A map may sit with text only, or with an event (PR 15); never with an image.
 */
export type PostAttachmentParts = {
	poll?: boolean;
	tierlist?: boolean;
	/** A shared book, shelf, sitting, member, review, post, comment or author. */
	attachment?: boolean;
	image?: boolean;
	map?: boolean;
	gif?: boolean;
	event?: boolean;
};

function primaryCount(parts: PostAttachmentParts): number {
	return (
		(parts.poll ? 1 : 0) +
		(parts.tierlist ? 1 : 0) +
		(parts.attachment ? 1 : 0) +
		(parts.image ? 1 : 0) +
		(parts.map ? 1 : 0) +
		(parts.gif ? 1 : 0) +
		(parts.event ? 1 : 0)
	);
}

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
	if (parts.map && parts.image) {
		return "A post cannot have both a map and an image.";
	}
	if (parts.map && parts.gif) {
		return "A post cannot have both a map and a GIF.";
	}
	if (parts.map && (parts.poll || parts.tierlist || parts.attachment)) {
		return "A map can go with text only, or with an event.";
	}
	if (parts.image && parts.attachment) {
		return "A post cannot have both an image and another attachment.";
	}
	if (parts.gif && parts.attachment) {
		return "A post with a GIF cannot have another attachment.";
	}
	if (parts.event && primaryCount(parts) > 1) {
		return "An event cannot share a post with another attachment.";
	}
	if (parts.gif && parts.image) {
		return "A post with a GIF cannot have an image.";
	}
	return null;
}
