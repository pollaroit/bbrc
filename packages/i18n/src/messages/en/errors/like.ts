import { defineMessages } from "../../types";

export const likeErrors = defineMessages({
	postNotFound: "Post not found",
	commentNotFound: "Comment not found",
	reviewNotFound: "Feedback not found",
	likesOff: "Likes are turned off for this post.",
	targetRequired: "Provide postSlug, commentSlug, or feedbackSlug",
});
