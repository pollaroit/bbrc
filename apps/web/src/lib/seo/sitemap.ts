import type { Database } from "@bbrc/db";
import {
	ACHIEVEMENTS,
	memberEditionKey,
	openLibraryEditionKey,
} from "@bbrc/shared";
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

	const [
		books,
		series,
		posts,
		sittings,
		users,
		shelves,
		memberEditions,
		readingEditions,
		readEditions,
	] = await Promise.all([
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
			where: { status: "active", visibility: "public", isWishlist: false },
			orderBy: { updatedAt: "desc" },
		}),
		// Editions members added (one linked to an Open Library edition shares that page).
		db.bookEdition.findMany({
			where: { openLibraryOlid: null },
			select: {
				publicId: true,
				updatedAt: true,
				book: { select: { slug: true } },
			},
			orderBy: { updatedAt: "desc" },
		}),
		// Open Library editions that members are reading or have read.
		db.reading.findMany({
			where: { editionOlid: { not: null } },
			distinct: ["bookId", "editionOlid"],
			select: {
				editionOlid: true,
				updatedAt: true,
				book: { select: { slug: true } },
			},
		}),
		db.read.findMany({
			where: { editionId: { not: null } },
			distinct: ["bookId", "editionId"],
			select: {
				editionId: true,
				updatedAt: true,
				book: { select: { slug: true } },
			},
		}),
	]);

	// One entry per Open Library edition, with the newest change.
	const usedOlEditions = new Map<
		string,
		{ slug: string; key: string; at: Date }
	>();
	const noteOlEdition = (olid: string | null, slug: string, at: Date): void => {
		if (!olid) return;
		const key = openLibraryEditionKey(olid);
		const id = `${slug}/${key}`;
		const existing = usedOlEditions.get(id);
		if (!existing || existing.at < at)
			usedOlEditions.set(id, { slug, key, at });
	};
	for (const row of readingEditions) {
		noteOlEdition(row.editionOlid, row.book.slug, row.updatedAt);
	}
	for (const row of readEditions) {
		noteOlEdition(row.editionId, row.book.slug, row.updatedAt);
	}

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
		...memberEditions.map((edition) =>
			entry(
				absoluteUrl(
					`/books/${edition.book.slug}/editions/${memberEditionKey(edition.publicId)}`,
				),
				edition.updatedAt,
				"monthly",
				0.5,
			),
		),
		...[...usedOlEditions.values()].map((edition) =>
			entry(
				absoluteUrl(`/books/${edition.slug}/editions/${edition.key}`),
				edition.at,
				"monthly",
				0.5,
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
