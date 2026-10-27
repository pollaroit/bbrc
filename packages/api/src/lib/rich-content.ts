import {
	contentPlainText,
	normalizeContentForStorage,
	RICH_CONTENT_MAX_PLAIN_CHARS,
} from "@bbrc/shared";
import { appError } from "./app-error";

/** The text of a post, comment or review ready to store; throws a translated error when it is not valid. */
export function assertNormalizedSocialContent(input: string): string {
	const normalized = normalizeContentForStorage(input);
	const plain = contentPlainText(normalized);
	if (plain.length > RICH_CONTENT_MAX_PLAIN_CHARS) {
		throw appError("BAD_REQUEST", "common.contentTooLong", {
			params: { max: RICH_CONTENT_MAX_PLAIN_CHARS },
		});
	}
	if (plain.trim().length < 1) {
		throw appError("BAD_REQUEST", "common.contentEmpty");
	}
	return normalized;
}

export { contentPlainText };
