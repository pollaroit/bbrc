import {
	SESSION_STORY_SHAPES,
	type SessionStoryShape,
} from "@/lib/story/constants";
import { renderSessionStoryImage } from "@/lib/story/render-session-story";
import { resolveSessionStoryContent } from "@/lib/story/session-story-content";
import { auth, db } from "@/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A finished Reading Mode session as a picture, for the member who read it.
 * Anyone else (or a signed-out visitor) gets a plain "not found", so a session
 * id never confirms that the session exists.
 */
export async function GET(
	request: Request,
	context: { params: Promise<{ id: string }> },
) {
	const { id } = await context.params;
	const requested = new URL(request.url).searchParams.get("shape");
	const shape: SessionStoryShape =
		requested && requested in SESSION_STORY_SHAPES
			? (requested as SessionStoryShape)
			: "story";

	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		return new Response("Not found", { status: 404 });
	}

	const content = await resolveSessionStoryContent(id, db, session.user.id);
	if (!content) {
		return new Response("Not found", { status: 404 });
	}

	return renderSessionStoryImage(content, shape);
}
