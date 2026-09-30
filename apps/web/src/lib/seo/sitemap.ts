import type { Database } from "@bbrc/db";
import type { MetadataRoute } from "next";
import { absoluteUrl } from "./site";
import { STATIC_APP_ROUTES } from "./static-routes";

function entry(
	url: string,
	lastModified: Date,
	changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
	priority: number,
): MetadataRoute.Sitemap[number] {
	return { url, lastModified, changeFrequency, priority };
}

export async function buildAppSitemap(
	db: Database,
): Promise<MetadataRoute.Sitemap> {
	const now = new Date();

	const [books, posts, sittings, users] = await Promise.all([
		db.book.findMany({
			select: { slug: true, updatedAt: true },
			orderBy: { updatedAt: "desc" },
		}),
		db.post.findMany({
			select: { slug: true, updatedAt: true },
			orderBy: { updatedAt: "desc" },
		}),
		db.sitting.findMany({
			select: { slug: true, updatedAt: true },
			orderBy: { updatedAt: "desc" },
		}),
		db.user.findMany({
			select: { username: true, updatedAt: true },
			orderBy: { updatedAt: "desc" },
		}),
	]);

	return [
		...STATIC_APP_ROUTES.map((route) =>
			entry(
				absoluteUrl(route.path),
				now,
				route.changeFrequency,
				route.priority,
			),
		),
		...books.map((book) =>
			entry(absoluteUrl(`/books/${book.slug}`), book.updatedAt, "weekly", 0.7),
		),
		...posts.map((post) =>
			entry(absoluteUrl(`/posts/${post.slug}`), post.updatedAt, "weekly", 0.6),
		),
		...sittings.map((sitting) =>
			entry(
				absoluteUrl(`/sittings/${sitting.slug}`),
				sitting.updatedAt,
				"weekly",
				0.6,
			),
		),
		...users.map((user) =>
			entry(
				absoluteUrl(`/users/${user.username}`),
				user.updatedAt,
				"monthly",
				0.5,
			),
		),
	];
}
