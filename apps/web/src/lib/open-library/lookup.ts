import type { BookLookup } from "@bbrc/shared";
import {
	fetchOpenLibraryWorkByOlid,
	searchOpenLibraryWorks,
} from "@/lib/open-library/client";
import type { OpenLibrarySearchWork } from "@/lib/open-library/types";

async function resolveToOlid(
	kind: "isbn" | "edition",
	value: string,
): Promise<string | null> {
	const params = new URLSearchParams({ kind, value });
	const response = await fetch(
		`/api/open-library/resolve?${params.toString()}`,
	);
	if (response.status === 404) return null;
	if (!response.ok) {
		const payload = (await response.json().catch(() => null)) as {
			error?: string;
		} | null;
		throw new Error(
			payload?.error ??
				(response.status === 503
					? "Open Library is temporarily unavailable. Try again in a moment."
					: "Could not look that up on Open Library."),
		);
	}
	const data = (await response.json()) as { olid: string | null };
	return data.olid;
}

/**
 * Finds the book(s) a pasted link, id or ISBN points at. A work id, edition or
 * ISBN gives zero or one book; a Goodreads link gives a normal title search.
 */
export async function resolveBookLookup(
	lookup: BookLookup,
): Promise<OpenLibrarySearchWork[]> {
	switch (lookup.kind) {
		case "text":
			return lookup.query.length >= 2
				? (await searchOpenLibraryWorks(lookup.query)).works
				: [];
		case "goodreads":
			return (await searchOpenLibraryWorks(lookup.query)).works;
		case "olid": {
			const work = await fetchOpenLibraryWorkByOlid(lookup.olid);
			return work ? [work] : [];
		}
		case "edition":
		case "isbn": {
			const olid = await resolveToOlid(
				lookup.kind,
				lookup.kind === "isbn" ? lookup.isbn : lookup.editionOlid,
			);
			if (!olid) return [];
			const work = await fetchOpenLibraryWorkByOlid(olid);
			return work ? [work] : [];
		}
	}
}
