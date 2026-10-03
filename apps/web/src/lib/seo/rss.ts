import type { Database } from "@bbrc/db";
import { absoluteUrl, SITE_NAME } from "./site";

const FEED_ITEM_LIMIT = 50;

function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function toRfc822(date: Date): string {
	return date.toUTCString();
}

function wrapRss(input: {
	title: string;
	description: string;
	link: string;
	items: string;
}): string {
	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(input.title)}</title>
    <description>${escapeXml(input.description)}</description>
    <link>${escapeXml(input.link)}</link>
    <language>en</language>
    <generator>${escapeXml(SITE_NAME)}</generator>
    ${input.items}
  </channel>
</rss>`;
}

export async function buildPostsRssFeed(db: Database): Promise<string> {
	const items = await db.post.findMany({
		take: FEED_ITEM_LIMIT,
		orderBy: [{ createdAt: "desc" }, { slug: "desc" }],
		select: {
			slug: true,
			content: true,
			createdAt: true,
			author: {
				select: {
					name: true,
				},
			},
		},
	});

	const channelLink = absoluteUrl("/");
	const rssItems = items
		.map((post) => {
			const link = absoluteUrl(`/posts/${post.slug}`);
			const title = `Post by ${post.author.name}`;
			const description = escapeXml(post.content.trim());
			const pubDate = toRfc822(post.createdAt);

			return `<item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
    </item>`;
		})
		.join("\n    ");

	return wrapRss({
		title: `${SITE_NAME} — Posts`,
		description: "Latest club posts and activity.",
		link: channelLink,
		items: rssItems,
	});
}

export async function buildBooksRssFeed(db: Database): Promise<string> {
	const items = await db.book.findMany({
		take: FEED_ITEM_LIMIT,
		orderBy: [{ createdAt: "desc" }, { slug: "desc" }],
		select: {
			slug: true,
			title: true,
			authors: true,
			status: true,
			openLibraryRating: true,
			createdAt: true,
		},
	});

	const channelLink = absoluteUrl("/books");
	const rssItems = items
		.map((book) => {
			const link = absoluteUrl(`/books/${book.slug}`);
			const authors =
				book.authors.length > 0 ? book.authors.join(", ") : "Unknown author";
			const title = `${book.title} — ${authors}`;
			const description = escapeXml(
				`Status: ${book.status}. Open Library rating: ${book.openLibraryRating ?? "n/a"}.`,
			);
			const pubDate = toRfc822(book.createdAt);

			return `<item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
    </item>`;
		})
		.join("\n    ");

	return wrapRss({
		title: `${SITE_NAME} — Books`,
		description: "Recently added books in the BBRC library.",
		link: channelLink,
		items: rssItems,
	});
}
