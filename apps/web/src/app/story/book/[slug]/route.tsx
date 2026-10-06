import { resolveBookStoryContent } from "@/lib/story/book-story-content";
import { renderBookStoryImage } from "@/lib/story/render-book-story";
import { auth, db } from "@/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
	request: Request,
	context: { params: Promise<{ slug: string }> },
) {
	const { slug } = await context.params;

	const session = await auth.api.getSession({
		headers: request.headers,
	});

	const content = await resolveBookStoryContent(
		slug,
		db,
		session?.user.id ?? null,
	);

	if (!content) {
		return new Response("Not found", { status: 404 });
	}

	return renderBookStoryImage(content);
}
