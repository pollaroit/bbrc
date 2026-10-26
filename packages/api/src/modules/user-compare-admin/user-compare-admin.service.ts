import type { Database, Prisma } from "@bbrc/db";
import { scoreComparison } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { resolveAuthor } from "../author/author-resolve";
import {
	aggregateMembers,
	buildMatrix,
	buildPairs,
	eligibleMembers,
	filtersCacheKey,
	type MemberAggregate,
	mean,
	type Pair,
	rankMembers,
	rankPairs,
	readInWindow,
	round1,
	type StatsMember,
	scoreHistogram,
	selectMatrixMembers,
	TtlCache,
} from "./compare-stats";
import type {
	CompareStatsFilters,
	CompareStatsInput,
	CompareStatsOutput,
} from "./user-compare-admin.schema";

type MemberRef = { username: string; name: string; image: string | null };

const ONE_HOUR = 60 * 60 * 1000;
const statsCache = new TtlCache<CompareStatsOutput>(ONE_HOUR, 20);

const memberRef = (user: MemberRef): MemberRef => ({
	username: user.username,
	name: user.name,
	image: user.image,
});

export async function searchCompareMembers(
	input: { query: string },
	db: Database,
) {
	const query = input.query.trim();
	const rows = await db.user.findMany({
		where: query
			? {
					OR: [
						{ username: { contains: query, mode: "insensitive" } },
						{ name: { contains: query, mode: "insensitive" } },
					],
				}
			: {},
		select: {
			username: true,
			name: true,
			image: true,
			isHidden: true,
			status: true,
			allowCompare: true,
		},
		orderBy: [{ name: "asc" }],
		take: 10,
	});
	return {
		items: rows.map((row) => ({
			...memberRef(row),
			isHidden: row.isHidden,
			isBanned: row.status === "banned",
			allowCompare: row.allowCompare,
		})),
	};
}

/** Admin viewer for `resolveAuthor` (admins may open authors without books). */
const ADMIN_VIEWER = { userId: "", isAdmin: true } as const;

async function resolveAuthorIds(
	db: Database,
	slugs: string[],
	unknown: string[],
): Promise<string[]> {
	const ids = new Set<string>();
	for (const slug of slugs) {
		try {
			ids.add((await resolveAuthor(db, slug, ADMIN_VIEWER)).id);
		} catch (error) {
			if (error instanceof ORPCError && error.code === "NOT_FOUND") {
				unknown.push(`author:${slug}`);
				continue;
			}
			throw error;
		}
	}
	return [...ids];
}

/**
 * Which books count, from the book-side filters (books, authors, series, subjects).
 * `null` means every book; `{ id: { in: [] } }` matches nothing.
 */
async function buildBookWhere(
	db: Database,
	filters: CompareStatsFilters,
	unknown: string[],
): Promise<Prisma.BookWhereInput | null> {
	const and: Prisma.BookWhereInput[] = [];

	if (filters.books?.length) {
		and.push({ slug: { in: filters.books } });
	}

	if (filters.authors?.length) {
		const authorIds = await resolveAuthorIds(db, filters.authors, unknown);
		and.push({
			authorLinks: { some: { authorId: { in: authorIds } } },
		});
	}

	if (filters.series?.length) {
		const found = await db.series.findMany({
			where: { slug: { in: filters.series } },
			select: { id: true, slug: true },
		});
		const foundSlugs = new Set(found.map((series) => series.slug));
		for (const slug of filters.series) {
			if (!foundSlugs.has(slug)) unknown.push(`series:${slug}`);
		}
		and.push({
			seriesMembership: { is: { seriesId: { in: found.map((s) => s.id) } } },
		});
	}

	if (filters.subjects?.length) {
		and.push({ subjects: { hasSome: filters.subjects } });
	}

	return and.length > 0 ? { AND: and } : null;
}

type LoadedUniverse = {
	members: StatsMember<MemberRef>[];
	membersInUniverse: number;
	unknownFilters: string[];
};

/** Loads the members and the reads (with ratings) that count under the filters. */
async function loadUniverse(
	db: Database,
	filters: CompareStatsFilters,
): Promise<LoadedUniverse> {
	const unknownFilters: string[] = [];

	const users = await db.user.findMany({
		where: {
			isHidden: false,
			status: { not: "banned" },
			...(filters.users?.length ? { username: { in: filters.users } } : {}),
		},
		select: { id: true, username: true, name: true, image: true },
	});
	if (users.length === 0) {
		return { members: [], membersInUniverse: 0, unknownFilters };
	}
	const userIds = users.map((user) => user.id);

	const bookWhere = await buildBookWhere(db, filters, unknownFilters);
	const window = { from: filters.finishedFrom, to: filters.finishedTo };

	const reads = await db.read.findMany({
		where: {
			userId: { in: userIds },
			...(bookWhere ? { book: bookWhere } : {}),
		},
		select: {
			userId: true,
			bookId: true,
			readEndYear: true,
			readEndMonth: true,
		},
	});
	const counted = reads.filter((read) => readInWindow(read, window));

	const feedback = counted.length
		? await db.feedback.findMany({
				where: {
					authorId: { in: userIds },
					...(bookWhere ? { book: bookWhere } : {}),
				},
				select: { authorId: true, bookId: true, rating: true },
			})
		: [];
	const ratingOf = new Map(
		feedback.map((row) => [`${row.authorId}:${row.bookId}`, row.rating]),
	);

	const readsByUser = new Map<string, StatsMember<MemberRef>["reads"]>();
	for (const read of counted) {
		const list = readsByUser.get(read.userId) ?? [];
		list.push({
			bookId: read.bookId,
			rating: ratingOf.get(`${read.userId}:${read.bookId}`) ?? null,
		});
		readsByUser.set(read.userId, list);
	}

	const members = users.map((user) => ({
		userId: user.id,
		user: memberRef(user),
		reads: readsByUser.get(user.id) ?? [],
	}));
	return { members, membersInUniverse: users.length, unknownFilters };
}

const nameOf = (user: MemberRef) => user.name;

function pairOutput(pair: Pair<MemberRef>) {
	return {
		a: pair.a.user,
		b: pair.b.user,
		score: pair.overall,
		overlap: pair.overlap,
		ratingAgreement: pair.ratingAgreement,
		sharedCount: pair.sharedCount,
		coRatedCount: pair.coRatedCount,
		readsA: pair.a.reads.length,
		readsB: pair.b.reads.length,
	};
}

function memberOutput(aggregate: MemberAggregate<MemberRef>) {
	return {
		user: aggregate.member.user,
		booksRead: aggregate.booksRead,
		similarity: aggregate.similarity,
		meanScore: aggregate.meanScore,
		peers: aggregate.peers,
		closest: aggregate.closest
			? {
					user: aggregate.closest.member.user,
					score: aggregate.closest.score,
					sharedCount: aggregate.closest.sharedCount,
				}
			: null,
	};
}

export async function getCompareStats(
	input: CompareStatsInput,
	db: Database,
): Promise<CompareStatsOutput> {
	const key = filtersCacheKey(input.filters);
	if (!input.fresh) {
		const hit = statsCache.get(key);
		if (hit) return { ...hit, cached: true };
	}

	const universe = await loadUniverse(db, input.filters);
	const pairs = buildPairs(universe.members, scoreComparison);
	const aggregates = aggregateMembers(pairs);
	const { top, bottom } = rankPairs(pairs, nameOf);
	const { mostSimilar, mostUnique } = rankMembers(aggregates, nameOf);

	const matrixMembers = selectMatrixMembers(universe.members, nameOf);
	const eligible = eligibleMembers(universe.members);
	const allReads = universe.members.flatMap((member) => member.reads);

	const output: CompareStatsOutput = {
		computedAt: new Date().toISOString(),
		cached: false,
		unknownFilters: universe.unknownFilters,
		totals: {
			members: eligible.length,
			membersInUniverse: universe.membersInUniverse,
			pairs: pairs.length,
			listedPairs: pairs.filter((pair) => pair.listed).length,
			averageScore: round1(mean(pairs.map((pair) => pair.overall))),
			reads: allReads.length,
			books: new Set(allReads.map((read) => read.bookId)).size,
		},
		topPairs: top.map(pairOutput),
		bottomPairs: bottom.map(pairOutput),
		mostSimilarMembers: mostSimilar.map(memberOutput),
		mostUniqueMembers: mostUnique.map(memberOutput),
		matrix: {
			members: matrixMembers.map((member) => ({
				...member.user,
				booksRead: member.reads.length,
			})),
			scores: buildMatrix(matrixMembers, pairs),
		},
		scoreDistribution: scoreHistogram(pairs.map((pair) => pair.overall)),
		membersScatter: aggregates.map((aggregate) => ({
			user: aggregate.member.user,
			booksRead: aggregate.booksRead,
			meanSimilarity: aggregate.meanScore,
			topSimilarity: aggregate.similarity,
		})),
	};

	statsCache.set(key, output);
	return output;
}

/** Drops cached stats (tests, and after bulk data changes). */
export function clearCompareStatsCache(): void {
	statsCache.clear();
}
