import { resolveOgImageContent } from "@/lib/seo/og/content";
import { renderOgImage } from "@/lib/seo/og/template";

export const runtime = "nodejs";

/** Dynamic OG images at `/og` and `/og/...` (mirrors public page paths). */
export async function GET(
	_request: Request,
	context: { params: Promise<{ path?: string[] }> },
) {
	const { path = [] } = await context.params;
	const content = await resolveOgImageContent(path);
	return renderOgImage(content);
}
