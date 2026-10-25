import { openLibraryErrorResponse } from "@bbrc/api/lib/open-library/http-response";
import { listWorkEditions } from "@bbrc/api/lib/open-library/work-editions";
import { isOpenLibraryOlid } from "@bbrc/shared";

export type OpenLibraryEditionCover = {
	coverId: number;
	editionTitle: string;
	year: string | null;
	languages: string[];
};

/** Covers of a work's editions, one per distinct cover image, for the cover picker. */
export async function GET(request: Request) {
	const olid =
		new URL(request.url).searchParams.get("olid")?.trim().toUpperCase() ?? "";

	if (!isOpenLibraryOlid(olid)) {
		return Response.json({ error: "Invalid work ID" }, { status: 400 });
	}

	try {
		const { items } = await listWorkEditions(olid, { limit: 60 });
		const seen = new Set<number>();
		const covers: OpenLibraryEditionCover[] = [];
		for (const item of items) {
			if (item.coverId == null || item.coverId <= 0 || seen.has(item.coverId)) {
				continue;
			}
			seen.add(item.coverId);
			covers.push({
				coverId: item.coverId,
				editionTitle: item.title,
				year: item.publishDate?.match(/\d{4}/)?.[0] ?? null,
				languages: item.languages,
			});
		}
		return Response.json({ covers: covers.slice(0, 24) });
	} catch (error) {
		return openLibraryErrorResponse(error, { covers: [] });
	}
}
