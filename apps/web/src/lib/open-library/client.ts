import type { OpenLibraryEditionHints } from "@/lib/open-library/editions";
import type { OpenLibrarySearchResponse } from "@/lib/open-library/types";

export async function searchOpenLibraryWorks(
	query: string,
): Promise<OpenLibrarySearchResponse> {
	const params = new URLSearchParams({ q: query });
	const response = await fetch(`/api/open-library/search?${params.toString()}`);

	if (!response.ok) {
		throw new Error("Could not search Open Library. Try again.");
	}

	return (await response.json()) as OpenLibrarySearchResponse;
}

export async function fetchOpenLibraryEditionHints(workKey: string) {
	const params = new URLSearchParams({ workKey });
	const response = await fetch(
		`/api/open-library/editions?${params.toString()}`,
	);

	if (!response.ok) {
		throw new Error("Could not load edition details from Open Library.");
	}

	return (await response.json()) as OpenLibraryEditionHints;
}
