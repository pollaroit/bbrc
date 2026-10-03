import { buildPostsRssFeed } from "@/lib/seo/rss";
import { db } from "@/services";

export const revalidate = 60;

export async function GET() {
	const body = await buildPostsRssFeed(db);

	return new Response(body, {
		headers: {
			"Content-Type": "application/rss+xml; charset=utf-8",
			"Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
		},
	});
}
