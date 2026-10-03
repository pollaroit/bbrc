import { rssFeedResponse } from "@/lib/seo/feed-response";
import { buildPostsRssFeed } from "@/lib/seo/rss";
import { db } from "@/services";

export const revalidate = 60;

export async function GET() {
	const body = await buildPostsRssFeed(db);
	return rssFeedResponse(body);
}
