import { DEFAULT_LOCALE, isLocale } from "@bbrc/i18n";
import { resolveOgImageContent } from "@/lib/seo/og/content";
import { renderOgImage } from "@/lib/seo/og/template";

export const runtime = "nodejs";

/** Dynamic OG images at `/og` and `/og/...` (mirrors public page paths). */
export async function GET(
	_request: Request,
	context: { params: Promise<{ path?: string[] }> },
) {
	const { path = [] } = await context.params;
	// The route sits outside the language segment: `/og/az/books/x` is the card of `/az/books/x`.
	const [first, ...rest] = path;
	const locale = isLocale(first) ? first : DEFAULT_LOCALE;
	const content = await resolveOgImageContent(
		isLocale(first) ? rest : path,
		locale,
	);
	return renderOgImage(content);
}
