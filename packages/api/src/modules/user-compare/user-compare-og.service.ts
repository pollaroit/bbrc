import type { Database } from "@bbrc/db";
import { describeScoreBand, scoreComparison, type Viewer } from "@bbrc/shared";
import { mayViewSection, memberAccessSelect } from "../user/member-access";
import { loadMemberReads, toCompareReads } from "./user-compare.data";

export type CompareOgMember = {
	name: string;
	username: string;
	image: string | null;
};

export type CompareOgNumbers = {
	commonBooks: number;
	score: number;
	/** 0-100, null when nobody rated a shared book. */
	ratingAgreement: number | null;
	/** Authors both members have read. */
	sharedAuthors: number;
	bandLabel: string;
};

export type CompareOgSnapshot = {
	a: CompareOgMember;
	b: CompareOgMember;
	/** Null whenever the numbers may not be shown to the public (a member switched comparing off). */
	numbers: CompareOgNumbers | null;
};

/**
 * What the share card of a comparison shows. Used by crawlers and link previews, so it
 * takes the viewer (a crawler is the anonymous one): banned members give nothing, and the
 * numbers are left out unless BOTH members allow comparisons and the viewer may see both members' reads.
 */
export async function getCompareOgSnapshot(
	db: Database,
	viewer: Viewer,
	usernameA: string,
	usernameB: string,
): Promise<CompareOgSnapshot | null> {
	if (usernameA.toLowerCase() === usernameB.toLowerCase()) return null;

	const members = await db.user.findMany({
		where: {
			OR: [
				{ username: { equals: usernameA, mode: "insensitive" } },
				{ username: { equals: usernameB, mode: "insensitive" } },
			],
			status: { not: "banned" },
		},
		select: {
			name: true,
			username: true,
			image: true,
			allowCompare: true,
			...memberAccessSelect,
		},
	});
	const find = (username: string) =>
		members.find((m) => m.username.toLowerCase() === username.toLowerCase());
	const a = find(usernameA);
	const b = find(usernameB);
	if (!a || !b) return null;

	const people = {
		a: { name: a.name, username: a.username, image: a.image ?? null },
		b: { name: b.name, username: b.username, image: b.image ?? null },
	};
	// Numbers come from both members' reads: left out unless this viewer may see both.
	if (
		!a.allowCompare ||
		!b.allowCompare ||
		!mayViewSection(viewer, a, "reads") ||
		!mayViewSection(viewer, b, "reads")
	) {
		return { ...people, numbers: null };
	}

	const reads = await loadMemberReads(db, [a.id, b.id]);
	const readsA = reads.get(a.id) ?? [];
	const readsB = reads.get(b.id) ?? [];
	const score = scoreComparison(toCompareReads(readsA), toCompareReads(readsB));

	const links = await db.bookAuthor.findMany({
		where: { bookId: { in: [...readsA, ...readsB].map((row) => row.bookId) } },
		select: { bookId: true, authorId: true },
	});
	const authorsOf = (rows: { bookId: string }[]) => {
		const books = new Set(rows.map((row) => row.bookId));
		return new Set(
			links.filter((link) => books.has(link.bookId)).map((l) => l.authorId),
		);
	};
	const authorsB = authorsOf(readsB);
	const sharedAuthors = [...authorsOf(readsA)].filter((id) =>
		authorsB.has(id),
	).length;

	return {
		...people,
		numbers: {
			commonBooks: score.sharedCount,
			score: score.overall,
			ratingAgreement:
				score.ratingAgreement == null
					? null
					: Math.round(score.ratingAgreement),
			sharedAuthors,
			bandLabel: describeScoreBand(score.overall).label,
		},
	};
}
