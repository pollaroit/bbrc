import {
	contentPlainText,
	normalizeContentForStorage,
	RICH_CONTENT_MAX_PLAIN_CHARS,
} from "@bbrc/shared";
import { appError } from "./app-error";

export const FEEDBACK_REVIEW_MAX_PLAIN = 500;

export function normalizeFeedbackReview(input: string): string {
	const normalized = normalizeContentForStorage(input);
	const plain = contentPlainText(normalized);
	if (plain.length > RICH_CONTENT_MAX_PLAIN_CHARS) {
		throw appError("BAD_REQUEST", "common.contentTooLong", {
			params: { max: RICH_CONTENT_MAX_PLAIN_CHARS },
		});
	}

	if (plain.trim().length > FEEDBACK_REVIEW_MAX_PLAIN) {
		throw appError("BAD_REQUEST", "common.reviewTooLong", {
			params: { max: FEEDBACK_REVIEW_MAX_PLAIN },
		});
	}

	return normalized;
}
