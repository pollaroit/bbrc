import { openLibraryErrorResponse } from "@bbrc/api/lib/open-library/http-response";
import { searchOpenLibraryWorksForWeb } from "@bbrc/api/lib/open-library/web-search";
import { withOpenLibraryGuard } from "@/lib/open-library/guard";
import type { OpenLibrarySearchResponse } from "@/lib/open-library/types";

export async function GET(request: Request) {
	const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

	if (query.length < 2) {
		return Response.json({ works: [] } satisfies OpenLibrarySearchResponse);
	}

	return withOpenLibraryGuard(
		request,
		`ol:search:${query.toLowerCase()}`,
		async () => {
			try {
				const works = await searchOpenLibraryWorksForWeb(query);
				return Response.json({ works } satisfies OpenLibrarySearchResponse);
			} catch (error) {
				return openLibraryErrorResponse(error, { works: [] });
			}
		},
	);
}
