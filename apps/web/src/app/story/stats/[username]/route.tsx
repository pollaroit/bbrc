import {
	SESSION_STORY_SHAPES,
	type StatsStoryShape,
} from "@/lib/story/constants";
import {
	renderStatsStoryImage,
	STATS_STORY_COVERS,
} from "@/lib/story/render-stats-story";
import { resolveStatsStoryContent } from "@/lib/story/stats-story-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A member's stats as a picture, for that member only. Anyone else (or a signed-out
 * visitor) gets a plain "not found", so a username never confirms what is private.
 * The period comes along in the query (`period_type`, `period`, ...), as on the page.
 */
export async function GET(
	request: Request,
	context: { params: Promise<{ username: string }> },
) {
	const { username } = await context.params;
	const url = new URL(request.url);
	const requested = url.searchParams.get("shape");
	const shape: StatsStoryShape =
		requested && requested in SESSION_STORY_SHAPES
			? (requested as StatsStoryShape)
			: "story";

	const facts = await resolveStatsStoryContent(
		username,
		url.searchParams,
		request.headers,
		STATS_STORY_COVERS[shape],
	);
	if (!facts) return new Response("Not found", { status: 404 });

	return renderStatsStoryImage(facts, shape);
}
