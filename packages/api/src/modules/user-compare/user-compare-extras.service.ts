import type { Database } from "@bbrc/db";
import { getBookCountryName, type Viewer } from "@bbrc/shared";
import { shelfVisibleWhere } from "../shelf/shelf-visibility";
import { mayViewSection } from "../user/member-access";
import {
	compareBookSelect,
	loadMemberReads,
	toCompareBook,
} from "./user-compare.data";
import type { CompareExtrasOutput, CompareInput } from "./user-compare.schema";
import { resolveComparePair } from "./user-compare.service";

const RADAR_AXES = 8;
const LIST_LIMIT = 12;

type Axis = { label: string; a: number; b: number };

const pct = (count: number, total: number) =>
	total === 0 ? 0 : Math.round((1000 * count) / total) / 10;

function radar(
	listsA: string[][],
	listsB: string[][],
	label: (key: string) => string,
): Axis[] | null {
	if (listsA.length === 0 && listsB.length === 0) return null;
	const countsA = new Map<string, number>();
	const countsB = new Map<string, number>();
	for (const list of listsA)
		for (const key of new Set(list))
			countsA.set(key, (countsA.get(key) ?? 0) + 1);
	for (const list of listsB)
		for (const key of new Set(list))
			countsB.set(key, (countsB.get(key) ?? 0) + 1);
	const keys = new Set([...countsA.keys(), ...countsB.keys()]);
	const axes = [...keys].map((key) => ({
		key,
		a: pct(countsA.get(key) ?? 0, listsA.length),
		b: pct(countsB.get(key) ?? 0, listsB.length),
	}));
	axes.sort((x, y) => y.a + y.b - (x.a + x.b) || x.key.localeCompare(y.key));
	const top = axes.slice(0, RADAR_AXES);
	return top.length === 0
		? null
		: top.map((axis) => ({ label: label(axis.key), a: axis.a, b: axis.b }));
}

const progressLabel: Record<string, string> = {
	not_started: "Not started",
	in_progress: "In progress",
	completed: "Completed",
	dnf: "Did not finish",
};

export async function getCompareExtras(
	input: CompareInput,
	db: Database,
	viewer: Viewer,
): Promise<CompareExtrasOutput> {
	const pair = await resolveComparePair(db, viewer, input);
	const none: CompareExtrasOutput = {
		blocked: pair.blocked,
		subjects: null,
		countries: null,
		authors: null,
		timeline: null,
		shelves: null,
		currentlyReading: null,
		sittings: null,
		wishlist: null,
	};
	if (pair.blocked) return none;

	const aId = pair.a.id;
	const bId = pair.b.id;
	const reads = await loadMemberReads(db, [aId, bId]);
	const readsA = reads.get(aId) ?? [];
	const readsB = reads.get(bId) ?? [];
	const idsA = new Set(readsA.map((r) => r.bookId));
	const idsB = new Set(readsB.map((r) => r.bookId));

	const [readBooks, favorites, publicShelves, collabShelves, wishlists] =
		await Promise.all([
			db.book.findMany({
				where: { id: { in: [...new Set([...idsA, ...idsB])] } },
				select: compareBookSelect,
			}),
			db.favorite.findMany({
				where: { userId: { in: [aId, bId] } },
				select: { userId: true, bookId: true },
			}),
			db.shelf.findMany({
				where: {
					...shelfVisibleWhere(pair.viewer, { listing: true }),
					userId: { in: [aId, bId] },
				},
				select: {
					slug: true,
					title: true,
					userId: true,
					user: { select: { username: true, name: true, image: true } },
					books: { select: { bookId: true } },
				},
			}),
			db.shelf.findMany({
				where: {
					...shelfVisibleWhere(pair.viewer, { listing: true }),
					OR: [
						{ userId: aId, collaborators: { some: { userId: bId } } },
						{ userId: bId, collaborators: { some: { userId: aId } } },
					],
				},
				select: {
					slug: true,
					title: true,
					user: { select: { username: true, name: true, image: true } },
					_count: { select: { books: true } },
				},
			}),
			db.shelf.findMany({
				where: {
					isWishlist: true,
					visibility: "public",
					status: "active",
					userId: { in: [aId, bId] },
				},
				select: { userId: true, books: { select: { bookId: true } } },
			}),
		]);

	const bookById = new Map(readBooks.map((book) => [book.id, book]));
	const booksOf = (ids: Set<string>) =>
		[...ids].flatMap((id) => bookById.get(id) ?? []);

	// Taste
	const rowsA = booksOf(idsA);
	const rowsB = booksOf(idsB);
	const subjects = radar(
		rowsA.map((b) => b.subjects),
		rowsB.map((b) => b.subjects),
		(key) => key,
	);
	const countries = radar(
		rowsA.map((b) => b.countries),
		rowsB.map((b) => b.countries),
		(key) => getBookCountryName(key) ?? key,
	);

	// Authors and favourites
	const authorCounts = (rows: typeof rowsA) => {
		const map = new Map<
			string,
			{ slug: string; name: string; count: number }
		>();
		for (const row of rows) {
			for (const link of row.authorLinks) {
				const entry = map.get(link.author.id) ?? {
					slug: link.author.slug,
					name: link.author.name,
					count: 0,
				};
				entry.count += 1;
				map.set(link.author.id, entry);
			}
		}
		return map;
	};
	const authorsA = authorCounts(rowsA);
	const authorsB = authorCounts(rowsB);
	const sharedAuthorIds = [...authorsA.keys()].filter((id) => authorsB.has(id));
	const authorPhotos =
		sharedAuthorIds.length === 0
			? []
			: await db.author.findMany({
					where: { id: { in: sharedAuthorIds } },
					select: { id: true, photoUrl: true },
				});
	const photoById = new Map(authorPhotos.map((a) => [a.id, a.photoUrl]));
	const sharedAuthors = sharedAuthorIds
		.flatMap((id) => {
			const x = authorsA.get(id);
			const y = authorsB.get(id);
			if (!x || !y) return [];
			return {
				slug: x.slug,
				name: x.name,
				photoUrl: photoById.get(id) ?? null,
				countA: x.count,
				countB: y.count,
			};
		})
		.sort(
			(p, q) =>
				Math.min(q.countA, q.countB) - Math.min(p.countA, p.countB) ||
				q.countA + q.countB - (p.countA + p.countB) ||
				p.name.localeCompare(q.name),
		)
		.slice(0, LIST_LIMIT);

	const favA = new Set(
		favorites.filter((f) => f.userId === aId).map((f) => f.bookId),
	);
	const favB = new Set(
		favorites.filter((f) => f.userId === bId).map((f) => f.bookId),
	);
	const sharedFavIds = [...favA].filter((id) => favB.has(id));
	const sharedFavBooks =
		sharedFavIds.length === 0
			? []
			: (
					await db.book.findMany({
						where: { id: { in: sharedFavIds } },
						select: compareBookSelect,
						take: LIST_LIMIT,
						orderBy: { title: "asc" },
					})
				).map(toCompareBook);

	// Timeline
	const years = new Map<number, { a: number; b: number }>();
	let undatedA = 0;
	let undatedB = 0;
	for (const read of readsA) {
		if (read.finish.year == null) undatedA += 1;
		else {
			const y = years.get(read.finish.year) ?? { a: 0, b: 0 };
			y.a += 1;
			years.set(read.finish.year, y);
		}
	}
	for (const read of readsB) {
		if (read.finish.year == null) undatedB += 1;
		else {
			const y = years.get(read.finish.year) ?? { a: 0, b: 0 };
			y.b += 1;
			years.set(read.finish.year, y);
		}
	}
	const timeline =
		years.size === 0 && undatedA + undatedB === 0
			? null
			: {
					points: [...years.entries()]
						.sort((x, y) => x[0] - y[0])
						.map(([year, v]) => ({ year, ...v })),
					undatedA,
					undatedB,
				};

	// Shelves
	const shelvesA = publicShelves.filter((s) => s.userId === aId);
	const shelvesB = publicShelves.filter((s) => s.userId === bId);
	const onShelvesA = new Set(
		shelvesA.flatMap((s) => s.books.map((b) => b.bookId)),
	);
	const onShelvesB = new Set(
		shelvesB.flatMap((s) => s.books.map((b) => b.bookId)),
	);
	const sharedShelfBookIds = [...onShelvesA].filter((id) => onShelvesB.has(id));
	const shelfRef = (s: (typeof publicShelves)[number]) => ({
		slug: s.slug,
		title: s.title,
		owner: s.user,
		bookCount: s.books.length,
	});
	const pairs = [];
	for (const sa of shelvesA) {
		const setA = new Set(sa.books.map((b) => b.bookId));
		for (const sb of shelvesB) {
			const setB = new Set(sb.books.map((b) => b.bookId));
			const shared = [...setA].filter((id) => setB.has(id)).length;
			if (shared === 0) continue;
			const union = setA.size + setB.size - shared;
			pairs.push({
				shelfA: shelfRef(sa),
				shelfB: shelfRef(sb),
				sharedBooks: shared,
				similarity: Math.round((100 * shared) / union),
			});
		}
	}
	pairs.sort(
		(x, y) => y.similarity - x.similarity || y.sharedBooks - x.sharedBooks,
	);
	const collaborations = collabShelves.map((s) => ({
		slug: s.slug,
		title: s.title,
		owner: s.user,
		bookCount: s._count.books,
	}));
	const sharedShelfBooks =
		sharedShelfBookIds.length === 0
			? []
			: (
					await db.book.findMany({
						where: { id: { in: sharedShelfBookIds } },
						select: compareBookSelect,
						take: LIST_LIMIT,
						orderBy: { title: "asc" },
					})
				).map(toCompareBook);
	const shelves =
		shelvesA.length + shelvesB.length === 0
			? null
			: {
					sharedBookCount: sharedShelfBookIds.length,
					sharedBooks: sharedShelfBooks,
					pairs: pairs.slice(0, 6),
					collaborations,
				};

	// Currently reading (only when the viewer may see both members' reading) and reading at the same time
	let currentlyReading: CompareExtrasOutput["currentlyReading"] = null;
	if (
		mayViewSection(pair.viewer, pair.a, "reading") &&
		mayViewSection(pair.viewer, pair.b, "reading")
	) {
		const readings = await db.reading.findMany({
			where: { userId: { in: [aId, bId] } },
			select: {
				userId: true,
				bookId: true,
				startedAt: true,
				finishedAt: true,
				book: { select: compareBookSelect },
			},
		});
		const active = readings.filter((r) => r.finishedAt == null);
		const activeA = new Map(
			active.filter((r) => r.userId === aId).map((r) => [r.bookId, r.book]),
		);
		const activeB = new Map(
			active.filter((r) => r.userId === bId).map((r) => [r.bookId, r.book]),
		);
		const now = Date.now();
		const overlapBooks = new Set<string>();
		for (const ra of readings.filter((r) => r.userId === aId)) {
			for (const rb of readings.filter(
				(r) => r.userId === bId && r.bookId === ra.bookId,
			)) {
				const startA = ra.startedAt.getTime();
				const endA = ra.finishedAt?.getTime() ?? now;
				const startB = rb.startedAt.getTime();
				const endB = rb.finishedAt?.getTime() ?? now;
				if (startA <= endB && startB <= endA) overlapBooks.add(ra.bookId);
			}
		}
		currentlyReading = {
			both: [...activeA.entries()]
				.filter(([id]) => activeB.has(id))
				.map(([, b]) => toCompareBook(b)),
			onlyA: [...activeA.entries()]
				.filter(([id]) => !activeB.has(id))
				.map(([, b]) => toCompareBook(b)),
			onlyB: [...activeB.entries()]
				.filter(([id]) => !activeA.has(id))
				.map(([, b]) => toCompareBook(b)),
			readAtSameTimeCount: overlapBooks.size,
		};
	}

	// Sittings together: both took part (still in it). Whoever looks is one of the two or an admin.
	const participations = await db.participation.findMany({
		where: { userId: { in: [aId, bId] }, removedAt: null },
		select: { userId: true, sittingId: true, progress: true },
	});
	const progressA = new Map(
		participations
			.filter((p) => p.userId === aId)
			.map((p) => [p.sittingId, p.progress]),
	);
	const progressB = new Map(
		participations
			.filter((p) => p.userId === bId)
			.map((p) => [p.sittingId, p.progress]),
	);
	const togetherIds = [...progressA.keys()].filter((id) => progressB.has(id));
	const sittingRows =
		togetherIds.length === 0
			? []
			: await db.sitting.findMany({
					where: { id: { in: togetherIds } },
					orderBy: { deadline: "desc" },
					select: {
						id: true,
						slug: true,
						status: true,
						deadline: true,
						selectedBook: { select: compareBookSelect },
					},
				});
	const sittings = {
		count: sittingRows.length,
		items: sittingRows.slice(0, LIST_LIMIT).map((row) => ({
			slug: row.slug,
			// A sitting has no title of its own: it is known by the book the club picked.
			title: row.selectedBook?.title ?? row.slug,
			status: row.status,
			deadline: row.deadline,
			book: row.selectedBook ? toCompareBook(row.selectedBook) : null,
			progressA: progressLabel[progressA.get(row.id) ?? "not_started"] ?? "",
			progressB: progressLabel[progressB.get(row.id) ?? "not_started"] ?? "",
		})),
	};

	// Wishlist overlap: only when both wishlists are public.
	let wishlist: CompareExtrasOutput["wishlist"] = null;
	const wishA = wishlists.find((w) => w.userId === aId);
	const wishB = wishlists.find((w) => w.userId === bId);
	if (wishA && wishB) {
		const setA = new Set(wishA.books.map((b) => b.bookId));
		const setB = new Set(wishB.books.map((b) => b.bookId));
		const sharedIds = [...setA].filter((id) => setB.has(id));
		wishlist = {
			shared:
				sharedIds.length === 0
					? []
					: (
							await db.book.findMany({
								where: { id: { in: sharedIds } },
								select: compareBookSelect,
								take: LIST_LIMIT,
								orderBy: { title: "asc" },
							})
						).map(toCompareBook),
			countA: setA.size,
			countB: setB.size,
		};
	}

	return {
		blocked: null,
		subjects,
		countries,
		authors: { shared: sharedAuthors, sharedFavorites: sharedFavBooks },
		timeline,
		shelves,
		currentlyReading,
		sittings,
		wishlist,
	};
}
