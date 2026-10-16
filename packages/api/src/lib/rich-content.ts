import {
	assertContentWithinLimit,
	contentPlainText,
	normalizeContentForStorage,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";

export function normalizeSocialContent(input: string): string {
	const normalized = normalizeContentForStorage(input);
	assertContentWithinLimit(normalized);
	const plain = contentPlainText(normalized);
	if (plain.trim().length < 1) {
		throw new Error("Content must be at least 1 character long");
	}
	return normalized;
}

export function assertNormalizedSocialContent(input: string): string {
	try {
		return normalizeSocialContent(input);
	} catch (error) {
		throw new ORPCError("BAD_REQUEST", {
			message: error instanceof Error ? error.message : "Invalid content",
		});
	}
}

export { contentPlainText };
