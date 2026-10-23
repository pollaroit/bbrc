import type { Database } from "@bbrc/db";
import { ACHIEVEMENTS } from "@bbrc/shared";
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

	const [books, series, posts, sittings, users, shelves] = await Promise.all([
		db.book.findMany({
			select: { slug: true, updatedAt: true },
			orderBy: { updatedAt: "desc" },
		}),
		db.series.findMany({
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
		db.shelf.findMany({
			select: {
				slug: true,
				updatedAt: true,
				user: { select: { username: true } },
			},
			where: { status: "active" },
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
		...series.map((row) =>
			entry(absoluteUrl(`/series/${row.slug}`), row.updatedAt, "weekly", 0.72),
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
		...ACHIEVEMENTS.filter((achievement) => !achievement.isHidden).map(
			(achievement) =>
				entry(
					absoluteUrl(`/achievements/${achievement.slug}`),
					now,
					"monthly",
					0.4,
				),
		),
		...shelves.map((shelf) =>
			entry(
				absoluteUrl(`/users/${shelf.user.username}/shelves/${shelf.slug}`),
				shelf.updatedAt,
				"monthly",
				0.75,
			),
		),
	];
}
