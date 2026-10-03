export function rssFeedResponse(body: string): Response {
	return new Response(body, {
		headers: {
			"Content-Type": "application/rss+xml; charset=utf-8",
			"Content-Disposition": 'inline; filename="feed.xml"',
			"Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
		},
	});
}
