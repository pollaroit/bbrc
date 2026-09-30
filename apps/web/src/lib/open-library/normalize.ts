import type { OpenLibrarySearchWork } from "@/lib/open-library/types";

type OpenLibrarySearchDoc = {
	key?: string;
	title?: string;
	author_name?: string[];
	cover_i?: number;
	first_publish_year?: number;
	first_sentence?: string | string[];
	subtitle?: string;
};

function normalizeDescription(doc: OpenLibrarySearchDoc): string | null {
	if (typeof doc.first_sentence === "string" && doc.first_sentence.trim()) {
		return doc.first_sentence.trim();
	}

	if (Array.isArray(doc.first_sentence)) {
		const joined = doc.first_sentence.join(" ").trim();
		if (joined) {
			return joined;
		}
	}

	if (doc.subtitle?.trim()) {
		return doc.subtitle.trim();
	}

	return null;
}

export function normalizeOpenLibraryDoc(
	doc: OpenLibrarySearchDoc,
): OpenLibrarySearchWork | null {
	if (!doc.key || !doc.title?.trim()) {
		return null;
	}

	return {
		workKey: doc.key,
		title: doc.title.trim(),
		authors: doc.author_name?.map((name) => name.trim()).filter(Boolean) ?? [],
		coverId: doc.cover_i ?? null,
		publishedIn: doc.first_publish_year ?? null,
		description: normalizeDescription(doc),
	};
}
