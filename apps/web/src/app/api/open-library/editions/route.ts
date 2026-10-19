import { fetchOpenLibraryEditionHints } from "@bbrc/api/lib/open-library/edition-hints";
import { openLibraryErrorResponse } from "@bbrc/api/lib/open-library/http-response";
import type { OpenLibraryEditionHints } from "@/lib/open-library/editions";

export async function GET(request: Request) {
	const workKey =
		new URL(request.url).searchParams.get("workKey")?.trim() ?? "";

	if (!workKey.startsWith("/works/")) {
		return Response.json({ error: "Invalid work key" }, { status: 400 });
	}

	try {
		const hints = await fetchOpenLibraryEditionHints(workKey);
		return Response.json(hints satisfies OpenLibraryEditionHints);
	} catch (error) {
		return openLibraryErrorResponse(error, {});
	}
}
