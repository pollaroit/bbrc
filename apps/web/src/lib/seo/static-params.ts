import { postVisibleWhere } from "@bbrc/api/modules/visibility/visibility-resources";
import type { Database, Prisma } from "@bbrc/db";
import { ANONYMOUS_VIEWER } from "@bbrc/shared";

const MAX_ISR_BUILD_WARM_LIMIT = 500;

/** How many detail URLs to prerender at build (0 = on-demand ISR only). */
export function isrBuildWarmLimit(): number {
	const raw = process.env.ISR_BUILD_WARM_LIMIT?.trim();
	if (!raw || raw === "0") {
		return 0;
	}
	const parsed = Number.parseInt(raw, 10);
	if (!Number.isFinite(parsed) || parsed < 1) {
		return 0;
	}
	return Math.min(parsed, MAX_ISR_BUILD_WARM_LIMIT);
}

export async function bookSlugStaticParams(db: Database) {
	const limit = isrBuildWarmLimit();
	if (limit === 0) {
		return [];
	}

	const rows = await db.book.findMany({
		select: { slug: true },
		orderBy: { updatedAt: "desc" },
		take: limit,
	});
	return rows.map(({ slug }) => ({ slug }));
}

export async function authorSlugStaticParams(db: Database) {
	const limit = isrBuildWarmLimit();
	if (limit === 0) {
		return [];
	}

	const rows = await db.author.findMany({
		where: { books: { some: {} } },
		select: { slug: true },
		orderBy: { updatedAt: "desc" },
		take: limit,
	});
	return rows.map(({ slug }) => ({ slug }));
}

/** Same visibility as the public sitemap — not every post row in the database. */
export async function postSlugStaticParams(db: Database) {
	const limit = isrBuildWarmLimit();
	if (limit === 0) {
		return [];
	}

	const rows = await db.post.findMany({
		where: {
			AND: [postVisibleWhere(ANONYMOUS_VIEWER) as Prisma.PostWhereInput],
		},
		select: { slug: true },
		orderBy: { updatedAt: "desc" },
		take: limit,
	});
	return rows.map(({ slug }) => ({ slug }));
}

export async function sittingSlugStaticParams(db: Database) {
	const limit = isrBuildWarmLimit();
	if (limit === 0) {
		return [];
	}

	const rows = await db.sitting.findMany({
		where: { joinType: "public" },
		select: { slug: true },
		orderBy: { updatedAt: "desc" },
		take: limit,
	});
	return rows.map(({ slug }) => ({ slug }));
}

export async function usernameStaticParams(db: Database) {
	const limit = isrBuildWarmLimit();
	if (limit === 0) {
		return [];
	}

	const rows = await db.user.findMany({
		where: { profileVisibility: "public" },
		select: { username: true },
		orderBy: { updatedAt: "desc" },
		take: limit,
	});
	return rows.map(({ username }) => ({ username }));
}
