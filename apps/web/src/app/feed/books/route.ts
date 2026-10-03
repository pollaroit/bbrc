import { rssFeedResponse } from "@/lib/seo/feed-response";
import { buildBooksRssFeed } from "@/lib/seo/rss";
import { db } from "@/services";

export const revalidate = 60;

export async function GET() {
	const body = await buildBooksRssFeed(db);
	return rssFeedResponse(body);
}
