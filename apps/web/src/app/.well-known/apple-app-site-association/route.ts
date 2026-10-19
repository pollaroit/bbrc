export const dynamic = "force-dynamic";

/** Placeholder AASA until a native iOS app ID exists. Paths open in Safari; the installed PWA opens from the home screen icon. */
export function GET() {
	const body = {
		applinks: {
			apps: [],
			details: [],
		},
		webcredentials: {
			apps: [],
		},
	};

	return Response.json(body, {
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "public, max-age=3600",
		},
	});
}
