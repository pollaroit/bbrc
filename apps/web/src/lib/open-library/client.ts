import { isOpenLibraryOlid } from "@bbrc/shared";
import type { OpenLibraryEditionHints } from "@/lib/open-library/editions";
import type {
	OpenLibrarySearchResponse,
	OpenLibrarySearchWork,
} from "@/lib/open-library/types";

export async function searchOpenLibraryWorks(
	query: string,
): Promise<OpenLibrarySearchResponse> {
	const params = new URLSearchParams({ q: query });
	const response = await fetch(`/api/open-library/search?${params.toString()}`);

	if (!response.ok) {
		const payload = (await response.json().catch(() => null)) as {
			error?: string;
		} | null;
		throw new Error(
			payload?.error ??
				(response.status === 503
					? "Open Library is temporarily unavailable. Try again in a moment."
					: "Could not search Open Library. Try again."),
		);
	}

	return (await response.json()) as OpenLibrarySearchResponse;
}

export async function fetchOpenLibraryEditionHints(workKey: string) {
	const params = new URLSearchParams({ workKey });
	const response = await fetch(
		`/api/open-library/editions?${params.toString()}`,
	);

	if (!response.ok) {
		const payload = (await response.json().catch(() => null)) as {
			error?: string;
		} | null;
		throw new Error(
			payload?.error ??
				(response.status === 503
					? "Open Library is temporarily unavailable. Try again in a moment."
					: "Could not load edition details from Open Library."),
		);
	}

	return (await response.json()) as OpenLibraryEditionHints;
}

export async function fetchOpenLibraryWorkByOlid(
	olid: string,
): Promise<OpenLibrarySearchWork | null> {
	const normalized = olid.trim().toUpperCase();
	if (!isOpenLibraryOlid(normalized)) {
		return null;
	}

	const params = new URLSearchParams({ olid: normalized });
	const response = await fetch(`/api/open-library/work?${params.toString()}`);

	if (response.status === 404) {
		return null;
	}

	if (!response.ok) {
		const payload = (await response.json().catch(() => null)) as {
			error?: string;
		} | null;
		throw new Error(
			payload?.error ??
				(response.status === 503
					? "Open Library is temporarily unavailable. Try again in a moment."
					: "Could not load this Open Library work."),
		);
	}

	const data = (await response.json()) as {
		work: OpenLibrarySearchWork | null;
	};
	return data.work;
}
