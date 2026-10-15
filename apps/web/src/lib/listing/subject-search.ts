import { generateSlug, isSlug } from "@bbrc/shared";

/** Characters allowed while composing a `#tag` before commit. */
export function isSubjectTagBodyChar(char: string): boolean {
	return char.length === 1 && /[a-zA-Z0-9_-]/.test(char);
}

const PENDING_TAG_SUFFIX = /(?:^|\s)#([a-zA-Z0-9_-]*)$/;

/** `#token` followed by a commit delimiter (non-body char) or end of string after a non-empty token. */
const COMMITTABLE_TAG = /(?:^|\s)#([a-zA-Z0-9_-]+)(?=[^a-zA-Z0-9_-]|$)/g;

function tokenToSubjectSlug(token: string): string | null {
	const trimmed = token.trim();
	if (!trimmed) {
		return null;
	}

	const slug = isSlug(trimmed) ? trimmed : generateSlug(trimmed);
	return isSlug(slug) ? slug : null;
}

export function subjectSlugToLabel(slug: string): string {
	return slug.replaceAll("-", " ");
}

export type SubjectTagInputResult = {
	/** Plain search box text (may end with an in-progress `#partial`). */
	displayValue: string;
	/** Slugs to append from tags closed in this edit. */
	committedSlugs: string[];
};

/**
 * Leaves an in-progress `#tag` at the end; commits tags closed by space, punctuation, etc.
 */
export function reconcileSubjectTagInput(raw: string): SubjectTagInputResult {
	if (PENDING_TAG_SUFFIX.test(raw)) {
		return { displayValue: raw, committedSlugs: [] };
	}

	const committedSlugs: string[] = [];
	const displayValue = raw
		.replace(COMMITTABLE_TAG, (_match, token: string) => {
			const slug = tokenToSubjectSlug(token);
			if (slug) {
				committedSlugs.push(slug);
			}
			return " ";
		})
		.replace(/\s+/g, " ")
		.trimStart();

	return {
		displayValue,
		committedSlugs: [...new Set(committedSlugs)],
	};
}

/** Commit an in-progress `#tag` at the end of the input (e.g. Enter). */
export function commitPendingSubjectTag(raw: string): SubjectTagInputResult {
	const pending = PENDING_TAG_SUFFIX.exec(raw);
	if (!pending?.[1]) {
		return { displayValue: raw, committedSlugs: [] };
	}

	const slug = tokenToSubjectSlug(pending[1]);
	const before = raw.slice(0, pending.index).trimEnd();

	return {
		displayValue: before,
		committedSlugs: slug ? [slug] : [],
	};
}
