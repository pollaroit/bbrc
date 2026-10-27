import type { Database } from "@bbrc/db";
import { appError } from "../../lib/app-error";
import { findAuthorBySlugOrRedirect } from "../author-admin/author-core";
import type { FollowTarget } from "./follow.schema";

export type FollowState = { following: boolean; followerCount: number };

type ResolvedTarget = { type: "author"; id: string; slug: string };

async function resolveTarget(
	db: Database,
	target: FollowTarget,
): Promise<ResolvedTarget> {
	if (target.type === "user") {
		throw appError("BAD_REQUEST", "follow.notAvailable");
	}
	const author = await findAuthorBySlugOrRedirect(db, target.slug);
	if (!author) {
		throw appError("NOT_FOUND", "follow.authorNotFound");
	}
	return { type: "author", id: author.id, slug: author.slug };
}

export async function toggleFollow(
	target: FollowTarget,
	userId: string,
	db: Database,
): Promise<FollowState> {
	const resolved = await resolveTarget(db, target);

	const existing = await db.follow.findUnique({
		where: {
			followerId_authorId: { followerId: userId, authorId: resolved.id },
		},
		select: { id: true },
	});

	if (existing) {
		await db.follow.deleteMany({ where: { id: existing.id } });
	} else {
		try {
			await db.follow.create({
				data: {
					followerId: userId,
					targetType: "author",
					authorId: resolved.id,
				},
			});
		} catch (error) {
			// Two taps at once: the second sees the first one's row, which is the state wanted.
			if ((error as { code?: string }).code !== "P2002") throw error;
		}
	}

	const [following, followerCount] = await Promise.all([
		db.follow.count({ where: { followerId: userId, authorId: resolved.id } }),
		db.follow.count({ where: { authorId: resolved.id } }),
	]);
	return { following: following > 0, followerCount };
}

export async function getFollowState(
	target: FollowTarget,
	userId: string | undefined,
	db: Database,
): Promise<FollowState> {
	const resolved = await resolveTarget(db, target);
	const [followerCount, mine] = await Promise.all([
		db.follow.count({ where: { authorId: resolved.id } }),
		userId
			? db.follow.count({
					where: { followerId: userId, authorId: resolved.id },
				})
			: Promise.resolve(0),
	]);
	return { following: mine > 0, followerCount };
}

/** For lists of cards: one round trip for up to 60 targets. Unknown authors read as 0 / not following. */
export async function getFollowStates(
	targets: FollowTarget[],
	userId: string | undefined,
	db: Database,
): Promise<Array<FollowState & { target: FollowTarget }>> {
	const authorSlugs = targets.flatMap((target) =>
		target.type === "author" ? [target.slug] : [],
	);

	const authors = await db.author.findMany({
		where: { slug: { in: authorSlugs } },
		select: { id: true, slug: true },
	});
	const redirects = await db.authorSlugRedirect.findMany({
		where: {
			slug: {
				in: authorSlugs.filter((s) => !authors.some((a) => a.slug === s)),
			},
		},
		select: { slug: true, author: { select: { id: true } } },
	});
	const idBySlug = new Map<string, string>([
		...authors.map((a) => [a.slug, a.id] as const),
		...redirects.map((r) => [r.slug, r.author.id] as const),
	]);
	const ids = [...new Set(idBySlug.values())];

	const [counts, mine] = await Promise.all([
		db.follow.groupBy({
			by: ["authorId"],
			where: { authorId: { in: ids } },
			_count: { _all: true },
		}),
		userId
			? db.follow.findMany({
					where: { followerId: userId, authorId: { in: ids } },
					select: { authorId: true },
				})
			: Promise.resolve([]),
	]);
	const countById = new Map(
		counts.map((row) => [row.authorId, row._count._all]),
	);
	const mineIds = new Set(mine.map((row) => row.authorId));

	return targets.map((target) => {
		if (target.type === "user") {
			return { target, following: false, followerCount: 0 };
		}
		const id = idBySlug.get(target.slug);
		return {
			target,
			following: id != null && mineIds.has(id),
			followerCount: id ? (countById.get(id) ?? 0) : 0,
		};
	});
}

/** What the member follows, newest first (the list in Settings). */
export async function listMyFollows(userId: string, db: Database) {
	const rows = await db.follow.findMany({
		where: { followerId: userId },
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			createdAt: true,
			targetType: true,
			author: {
				select: {
					slug: true,
					name: true,
					photoUrl: true,
					birthYear: true,
					deathYear: true,
					_count: { select: { books: true } },
				},
			},
		},
	});

	const items = rows.flatMap((row) => {
		if (row.targetType !== "author" || !row.author) return [];
		const { _count, ...author } = row.author;
		return [
			{
				type: "author" as const,
				id: row.id,
				followedAt: row.createdAt,
				author: { ...author, bookCount: _count.books },
			},
		];
	});
	return { items };
}
