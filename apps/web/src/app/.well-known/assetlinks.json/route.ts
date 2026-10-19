import { getMetadataBase } from "@/lib/seo";

export const dynamic = "force-dynamic";

/** Android Digital Asset Links — open verified https links in the installed PWA when available. */
export function GET(request: Request) {
	const origin =
		process.env.NODE_ENV === "production"
			? getMetadataBase().origin
			: new URL(request.url).origin;

	const body = [
		{
			relation: ["delegate_permission/common.handle_all_urls"],
			target: {
				namespace: "web",
				site: origin,
			},
		},
	];

	return Response.json(body, {
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "public, max-age=3600",
		},
	});
}
