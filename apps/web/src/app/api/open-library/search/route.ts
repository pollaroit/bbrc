import { normalizeOpenLibraryDoc } from "@/lib/open-library/normalize";
import type { OpenLibrarySearchResponse } from "@/lib/open-library/types";

const OPEN_LIBRARY_SEARCH = "https://openlibrary.org/search.json" as const;

export async function GET(request: Request) {
	const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

	if (query.length < 2) {
		return Response.json({ works: [] } satisfies OpenLibrarySearchResponse);
	}

	const url = new URL(OPEN_LIBRARY_SEARCH);
	url.searchParams.set("q", query);
	url.searchParams.set("limit", "12");
	url.searchParams.set(
		"fields",
		"key,title,author_name,cover_i,first_publish_year,first_sentence,subtitle",
	);

	const response = await fetch(url, {
		headers: { Accept: "application/json" },
		next: { revalidate: 60 },
	});

	if (!response.ok) {
		return Response.json(
			{ works: [], error: "Open Library search failed" },
			{ status: 502 },
		);
	}

	const payload = (await response.json()) as {
		docs?: unknown[];
	};

	const works =
		payload.docs
			?.map((doc) => normalizeOpenLibraryDoc(doc as never))
			.filter((work): work is NonNullable<typeof work> => work != null) ?? [];

	return Response.json({ works } satisfies OpenLibrarySearchResponse);
}
