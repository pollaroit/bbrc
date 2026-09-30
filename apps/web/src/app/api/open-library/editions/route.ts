import type { OpenLibraryEditionHints } from "@/lib/open-library/editions";
import {
	buildEditionHints,
	type OpenLibraryEditionsResponse,
	type OpenLibraryWorkDocument,
	type OpenLibraryWorkRatingsResponse,
	parseWorkExcerpt,
	parseWorkRatingsAverage,
} from "@/lib/open-library/editions";

function normalizeWorkKey(workKey: string): string | null {
	const trimmed = workKey.trim();
	if (!trimmed.startsWith("/works/")) {
		return null;
	}

	return trimmed.replace(/\/+$/, "");
}

export async function GET(request: Request) {
	const workKey = normalizeWorkKey(
		new URL(request.url).searchParams.get("workKey") ?? "",
	);

	if (!workKey) {
		return Response.json({ error: "Invalid work key" }, { status: 400 });
	}

	const [ratingsResponse, workResponse, editionsResponse] = await Promise.all([
		fetch(`https://openlibrary.org${workKey}/ratings.json`, {
			headers: { Accept: "application/json" },
			next: { revalidate: 3600 },
		}),
		fetch(`https://openlibrary.org${workKey}.json`, {
			headers: { Accept: "application/json" },
			next: { revalidate: 3600 },
		}),
		fetch(`https://openlibrary.org${workKey}/editions.json?limit=100`, {
			headers: { Accept: "application/json" },
			next: { revalidate: 3600 },
		}),
	]);

	if (!editionsResponse.ok) {
		return Response.json({ error: "Could not load editions" }, { status: 502 });
	}

	const ratingsPayload = ratingsResponse.ok
		? ((await ratingsResponse.json()) as OpenLibraryWorkRatingsResponse)
		: {};
	const workPayload = workResponse.ok
		? ((await workResponse.json()) as OpenLibraryWorkDocument)
		: {};
	const editionsPayload =
		(await editionsResponse.json()) as OpenLibraryEditionsResponse;

	const hints = buildEditionHints(
		editionsPayload.entries ?? [],
		parseWorkRatingsAverage(ratingsPayload),
		parseWorkExcerpt(workPayload),
	);

	return Response.json(hints satisfies OpenLibraryEditionHints);
}
