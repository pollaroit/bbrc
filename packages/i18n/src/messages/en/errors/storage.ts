import { defineMessages } from "../../types";

/** Errors of file and image uploads. */
export const storageErrors = defineMessages({
	notConfigured: "File storage is not set up.",
	invalidKey: "This file address is not valid.",
	forbiddenKey: "You cannot access this file.",
	fileTooLarge: "The file is too large.",
	uploadNotFound: "The upload was not found. Finish uploading the file first.",
	sizeMismatch: "The uploaded file size does not match.",
	typeMismatch: "The uploaded file type does not match.",
	bookCoverAdminOnly: "Only admins can upload book covers.",
	coverUploadBlocked: "Your account cannot upload covers.",
	authorPhotoAdminOnly: "Only admins can upload author photos.",
	postHasPoll: "A post with a poll cannot have an image.",
	postNotFound: "Post not found.",
	postImageAuthorOnly: "Only the author can change this post's image.",
	reviewNotFound: "Review not found.",
	reviewImageAuthorOnly: "Only the author can change this review's image.",
	commentNotFound: "Comment not found.",
	commentImageAuthorOnly: "Only the author can change this comment's image.",
});
