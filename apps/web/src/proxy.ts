import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "@bbrc/i18n";
import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

/**
 * The address decides the language; without a prefix the cookie decides, so a visitor who
 * chose Azerbaijani is sent to the `/az` version of the page they asked for.
 */
export default function proxy(request: NextRequest) {
	const { pathname, search } = request.nextUrl;
	const hasPrefix = routing.locales.some(
		(locale) =>
			locale !== DEFAULT_LOCALE &&
			(pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)),
	);
	const cookie = request.cookies.get(LOCALE_COOKIE)?.value;

	if (!hasPrefix && isLocale(cookie) && cookie !== DEFAULT_LOCALE) {
		const url = request.nextUrl.clone();
		url.pathname = `/${cookie}${pathname === "/" ? "" : pathname}`;
		url.search = search;
		return NextResponse.redirect(url);
	}
	return intlMiddleware(request);
}

export const config = {
	// Pages only: api, og, feed, serwist, .well-known, ~offline, Next internals and any file
	// with an extension (sitemap.xml, robots.txt, manifest.webmanifest, sw.js, icons) are left alone.
	matcher: [
		"/((?!api|og|feed|serwist|\\.well-known|~offline|_next|_vercel|.*\\..*).*)",
	],
};
