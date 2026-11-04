import { openLibraryErrorResponse } from "@bbrc/api/lib/open-library/http-response";
import { fetchOpenLibraryWorkPrefillByOlid } from "@bbrc/api/lib/open-library/work-prefill";
import { isOpenLibraryOlid } from "@bbrc/shared";
import { withOpenLibraryGuard } from "@/lib/open-library/guard";
import type { OpenLibrarySearchWork } from "@/lib/open-library/types";

export async function GET(request: Request) {
	const olid = new URL(request.url).searchParams.get("olid")?.trim() ?? "";

	if (!isOpenLibraryOlid(olid)) {
		return Response.json(
			{ work: null, error: "Invalid OLID" },
			{ status: 400 },
		);
	}

	return withOpenLibraryGuard(request, `ol:work:${olid}`, async () => {
		try {
			const work = await fetchOpenLibraryWorkPrefillByOlid(olid);
			if (!work) {
				return Response.json(
					{ work: null, error: "Work not found" },
					{ status: 404 },
				);
			}

			return Response.json({
				work: work satisfies OpenLibrarySearchWork,
			});
		} catch (error) {
			return openLibraryErrorResponse(error, { work: null });
		}
	});
}
