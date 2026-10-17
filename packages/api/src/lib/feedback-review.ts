import {
	assertContentWithinLimit,
	contentPlainText,
	normalizeContentForStorage,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";

export const FEEDBACK_REVIEW_MAX_PLAIN = 500;

export function normalizeFeedbackReview(input: string): string {
	const normalized = normalizeContentForStorage(input);
	try {
		assertContentWithinLimit(normalized);
	} catch (error) {
		throw new ORPCError("BAD_REQUEST", {
			message: error instanceof Error ? error.message : "Invalid review",
		});
	}

	const plainLength = contentPlainText(normalized).trim().length;
	if (plainLength > FEEDBACK_REVIEW_MAX_PLAIN) {
		throw new ORPCError("BAD_REQUEST", {
			message: `Review must be at most ${FEEDBACK_REVIEW_MAX_PLAIN} characters`,
		});
	}

	return normalized;
}
