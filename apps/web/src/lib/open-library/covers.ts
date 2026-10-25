import type { OpenLibraryEditionCover } from "@/app/api/open-library/covers/route";

export type { OpenLibraryEditionCover };

/** Distinct cover images of a work's editions (empty when there are none). */
export async function fetchOpenLibraryEditionCovers(
	olid: string,
): Promise<OpenLibraryEditionCover[]> {
	const params = new URLSearchParams({ olid });
	const response = await fetch(`/api/open-library/covers?${params.toString()}`);
	if (!response.ok) {
		const payload = (await response.json().catch(() => null)) as {
			error?: string;
		} | null;
		throw new Error(
			payload?.error ?? "Could not load covers from Open Library.",
		);
	}
	const data = (await response.json()) as { covers: OpenLibraryEditionCover[] };
	return data.covers;
}
