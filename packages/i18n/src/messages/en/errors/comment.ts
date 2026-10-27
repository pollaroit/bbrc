import { defineMessages } from "../../types";

export const commentErrors = defineMessages({
	notFound: "Comment not found",
	onlyAuthor: "Only the comment author can change this comment",
	postNotFound: "Post not found",
	reviewNotFound: "Feedback not found",
	commentsOff: "Comments are turned off for this post.",
	replyTargetInvalid: "Reply target must be a comment on this thread",
	replyTooDeep: "Replies cannot exceed {levels} levels deep",
	slugFailed: "Failed to generate comment slug",
});
