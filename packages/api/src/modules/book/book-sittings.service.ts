import type { Database } from "@bbrc/db";
import {
	competitionRank,
	formatSittingDisplayName,
	getZonedParts,
	resolveClubTimeZone,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { visibleOnSiteUserWhere } from "../user/user-visibility";
import type {
	BookSittingItem,
	GetBookSittingsOutput,
	GetMyBookSittingMarksOutput,
} from "./book-sittings.schema";

const TOP_RIVALS = 5;

function pointsLabel(points: number): string {
	return `${points} ${points === 1 ? "point" : "points"}`;
}

async function loadBook(slug: string, db: Database) {
	const book = await db.book.findUnique({
		where: { slug },
		select: { id: true, slug: true },
	});
	if (!book) {
		throw new ORPCError("NOT_FOUND", {
			message: "Book not found",
			data: { slug },
		});
	}
	return book;
}

/** Sittings where the book was picked or was a poll option. */
export function bookSittingsWhere(bookSlug: string) {
	return {
		OR: [
			{ selectedBook: { slug: bookSlug } },
			{ poll: { options: { some: { book: { slug: bookSlug } } } } },
		],
	};
}

export async function countBookSittings(
	bookSlug: string,
	db: Database,
): Promise<number> {
	return db.sitting.count({ where: bookSittingsWhere(bookSlug) });
}

export async function getBookSittings(
	bookSlug: string,
	db: Database,
): Promise<GetBookSittingsOutput> {
	const book = await loadBook(bookSlug, db);
	const timeZone = resolveClubTimeZone();

	const sittings = await db.sitting.findMany({
		where: bookSittingsWhere(bookSlug),
		select: {
			slug: true,
			status: true,
			createdAt: true,
			deadline: true,
			readingStartedAt: true,
			selectedBookId: true,
			selectedBook: { select: { title: true } },
			participants: {
				where: { removedAt: null, user: visibleOnSiteUserWhere },
				orderBy: { createdAt: "asc" },
				select: {
					progress: true,
					user: { select: { username: true, name: true, image: true } },
				},
			},
			poll: {
				select: {
					deadline: true,
					options: {
						select: {
							bookId: true,
							book: {
								select: {
									slug: true,
									title: true,
									authors: true,
									coverId: true,
								},
							},
							votes: { select: { userId: true, points: true } },
						},
					},
				},
			},
		},
	});

	const items: BookSittingItem[] = [];
	const rivalMap = new Map<
		string,
		{
			book: {
				slug: string;
				title: string;
				authors: string[];
				coverId: number | null;
			};
			ahead: number;
			behind: number;
		}
	>();
	const places: number[] = [];

	for (const sitting of sittings) {
		const picked = sitting.selectedBookId === book.id;
		const poll = sitting.poll;
		const open = sitting.status === "voting";
		const outcome: BookSittingItem["outcome"] = picked
			? "picked"
			: open
				? "in_poll"
				: "not_picked";

		const rows = (poll?.options ?? []).map((option) => ({
			bookId: option.bookId,
			book: option.book,
			points: option.votes.reduce((sum, vote) => sum + vote.points, 0),
			voters: option.votes.length,
		}));
		const allPoints = rows.map((row) => row.points);
		const voterIds = new Set(
			(poll?.options ?? []).flatMap((option) =>
				option.votes.map((vote) => vote.userId),
			),
		);
		const own = rows.find((row) => row.bookId === book.id);
		const closed = poll != null && !open;
		const place = closed && own ? competitionRank(own.points, allPoints) : null;

		const ranking = closed
			? rows
					.map((row) => ({
						...row.book,
						place: competitionRank(row.points, allPoints),
						points: row.points,
						voters: row.voters,
						isThisBook: row.bookId === book.id,
						isPicked: row.bookId === sitting.selectedBookId,
					}))
					.sort((a, b) => a.place - b.place || a.title.localeCompare(b.title))
			: [];

		const pickedRow = rows.find((row) => row.bookId === sitting.selectedBookId);
		const topPoints = Math.max(0, ...allPoints);
		const winnerRow =
			pickedRow ??
			(closed ? rows.find((row) => row.points === topPoints) : undefined);
		const winner =
			winnerRow && closed
				? {
						...winnerRow.book,
						points: winnerRow.points,
					}
				: null;

		let note: string | null = null;
		if (closed && own) {
			const others = rows.filter((row) => row.bookId !== book.id);
			const bestOther = Math.max(0, ...others.map((row) => row.points));
			if (picked) {
				if (others.length === 0) {
					note = "Only option";
				} else if (own.points > bestOther) {
					note = `Won by ${pointsLabel(own.points - bestOther)}`;
				} else {
					note = "Won a tie";
				}
			} else if (winnerRow) {
				const gap = winnerRow.points - own.points;
				note =
					gap > 0
						? `${pointsLabel(gap)} behind the pick`
						: own.points === topPoints
							? "Tied for first, the club picked another book"
							: null;
			}
			places.push(place ?? 0);

			for (const other of others) {
				const entry = rivalMap.get(other.bookId) ?? {
					book: other.book,
					ahead: 0,
					behind: 0,
				};
				if (other.points > own.points) {
					entry.ahead += 1;
				} else if (other.points < own.points) {
					entry.behind += 1;
				}
				rivalMap.set(other.bookId, entry);
			}
		} else if (picked && !poll) {
			note = "Picked without a poll";
		}

		const progressCounts = {
			not_started: 0,
			in_progress: 0,
			completed: 0,
			dnf: 0,
		};
		for (const participant of sitting.participants) {
			progressCounts[participant.progress] += 1;
		}

		const dateSource = poll?.deadline ?? sitting.createdAt;
		items.push({
			sittingSlug: sitting.slug,
			displayName: formatSittingDisplayName(
				sitting.slug,
				sitting.status,
				sitting.selectedBook?.title,
			),
			status: sitting.status,
			outcome,
			date: dateSource.toISOString(),
			year: getZonedParts(dateSource, timeZone).year,
			readingStartedAt: sitting.readingStartedAt?.toISOString() ?? null,
			readingDeadline: sitting.deadline.toISOString(),
			pollDeadline: poll?.deadline.toISOString() ?? null,
			place,
			points: closed && own ? own.points : null,
			voters: voterIds.size,
			optionCount: rows.length,
			note,
			winner,
			ranking,
			participantCount: picked ? sitting.participants.length : 0,
			progressCounts: picked
				? progressCounts
				: { not_started: 0, in_progress: 0, completed: 0, dnf: 0 },
			participants: picked
				? sitting.participants.map((participant) => ({
						...participant.user,
						progress: participant.progress,
					}))
				: [],
		});
	}

	items.sort((a, b) => b.date.localeCompare(a.date));

	const closedPolls = items.filter((item) => item.place != null).length;
	const pickedItems = items.filter((item) => item.outcome === "picked");
	const readerIds = new Set<string>();
	for (const sitting of sittings) {
		if (sitting.selectedBookId === book.id) {
			for (const participant of sitting.participants) {
				readerIds.add(participant.user.username);
			}
		}
	}

	return {
		summary: {
			picked: pickedItems.length,
			pollAppearances: items.filter((item) => item.optionCount > 0).length,
			closedPolls,
			inPollNow: items.filter((item) => item.outcome === "in_poll").length,
			winRate:
				closedPolls > 0
					? pickedItems.filter((item) => item.place != null).length /
						closedPolls
					: null,
			bestPlace: places.length > 0 ? Math.min(...places) : null,
			averagePlace:
				places.length > 0
					? Math.round(
							(places.reduce((sum, value) => sum + value, 0) / places.length) *
								100,
						) / 100
					: null,
			readers: readerIds.size,
		},
		rivals: [...rivalMap.values()]
			.sort(
				(a, b) =>
					b.ahead + b.behind - (a.ahead + a.behind) ||
					b.ahead - a.ahead ||
					a.book.title.localeCompare(b.book.title),
			)
			.slice(0, TOP_RIVALS)
			.map((entry) => ({
				...entry.book,
				ahead: entry.ahead,
				behind: entry.behind,
			})),
		items,
	};
}

export async function getMyBookSittingMarks(
	bookSlug: string,
	userId: string,
	db: Database,
): Promise<GetMyBookSittingMarksOutput> {
	const book = await loadBook(bookSlug, db);
	const sittings = await db.sitting.findMany({
		where: bookSittingsWhere(bookSlug),
		select: {
			slug: true,
			selectedBookId: true,
			participants: {
				where: { userId, removedAt: null },
				select: { progress: true },
			},
			poll: {
				select: {
					options: {
						select: {
							bookId: true,
							votes: { where: { userId }, select: { points: true } },
						},
					},
				},
			},
		},
	});

	return sittings.map((sitting) => {
		const options = sitting.poll?.options ?? [];
		const mine = options.find((option) => option.bookId === book.id);
		return {
			sittingSlug: sitting.slug,
			myPoints: mine?.votes[0]?.points ?? null,
			voted: options.some((option) => option.votes.length > 0),
			myProgress:
				sitting.selectedBookId === book.id
					? (sitting.participants[0]?.progress ?? null)
					: null,
		};
	});
}
