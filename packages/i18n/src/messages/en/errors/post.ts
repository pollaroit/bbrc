import { defineMessages } from "../../types";

export const postErrors = defineMessages({
	notFound: "Post not found",
	onlyAuthor: "Only the post author can change this post",
	pollNoAttachment: "A post with a poll cannot have another attachment.",
	slugFailed: "Failed to generate post slug",
	bookNotFound: "Book not found",
	shelfNotFound: "Shelf not found",
	sittingNotFound: "Sitting not found",
	memberNotFound: "Member not found",
	reviewNotFound: "Feedback not found",
	commentNotFound: "Comment not found",
	authorNotFound: "Author not found",
	privateShelf:
		"A private shelf cannot be shared in a post. Make it public first.",
	memberNoAttach: "{name} does not allow being attached to posts.",
	sharingOff: "Sharing is turned off for that post.",
});
