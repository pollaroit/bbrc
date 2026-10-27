import type { Database } from "@bbrc/db";
import {
	bookFinishDaysHistogram,
	bookRatingHistogram,
	bookRatingsByMonth,
	bookReadsByMonth,
	bookStatsMonthIndex,
	bookStatsMonthRange,
	competitionRank,
	getZonedParts,
	medianNumber,
	resolveClubTimeZone,
} from "@bbrc/shared";
import { appError } from "../../lib/app-error";
import {
	QUIZ_MAX_SCORE,
	QUIZ_MIN_SCORE,
	QUIZ_SCORING,
} from "../quiz/quiz-scoring";
import { publicShelfWhere } from "../shelf/shelf-visibility";
import { visibleOnSiteUserWhere } from "../user/user-visibility";
import type { GetBookStatsOutput } from "./book-stats.schema";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TOP_EDITIONS = 5;

function average(values: number[]): number | null {
	return values.length === 0
		? null
		: values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number | null, digits = 2): number | null {
	if (value == null) {
		return null;
	}
	const factor = 10 ** digits;
	return Math.round(value * factor) / factor;
}

export async function getBookStats(
	bookSlug: string,
	db: Database,
): Promise<GetBookStatsOutput> {
	const book = await db.book.findUnique({
		where: { slug: bookSlug },
		select: {
			id: true,
			slug: true,
			title: true,
			pages: true,
			openLibraryRating: true,
		},
	});

	if (!book) {
		throw appError("NOT_FOUND", "book.notFound", { data: { slug: bookSlug } });
	}

	const now = new Date();
	const timeZone = resolveClubTimeZone();
	const clubMonth = (date: Date) => {
		const parts = getZonedParts(date, timeZone);
		return { year: parts.year, month: parts.month };
	};
	const currentIndex = bookStatsMonthIndex(clubMonth(now));

	const [
		reads,
		feedbacks,
		favorites,
		shelfEntries,
		pollOptions,
		sittings,
		quiz,
		memberCount,
		libraryAverage,
	] = await Promise.all([
		db.read.findMany({
			where: { bookId: book.id, user: visibleOnSiteUserWhere },
			select: {
				userId: true,
				createdAt: true,
				readEndYear: true,
				readEndMonth: true,
				editionId: true,
			},
		}),
		db.feedback.findMany({
			where: { bookId: book.id, author: visibleOnSiteUserWhere },
			select: {
				slug: true,
				rating: true,
				review: true,
				isSpoiler: true,
				createdAt: true,
				author: { select: { username: true, name: true } },
				_count: { select: { likes: true, comments: true } },
			},
		}),
		db.favorite.findMany({
			where: { bookId: book.id, user: visibleOnSiteUserWhere },
			select: { createdAt: true },
		}),
		db.shelfBook.findMany({
			where: {
				bookId: book.id,
				shelf: publicShelfWhere,
			},
			select: { createdAt: true },
		}),
		db.pollOption.findMany({
			where: { bookId: book.id },
			select: {
				id: true,
				pollId: true,
				poll: {
					select: {
						deadline: true,
						sitting: {
							select: { slug: true, status: true, selectedBookId: true },
						},
					},
				},
			},
		}),
		db.sitting.findMany({
			where: { selectedBookId: book.id },
			select: {
				status: true,
				createdAt: true,
				readingStartedAt: true,
				participants: {
					where: { removedAt: null, user: visibleOnSiteUserWhere },
					select: { userId: true, progress: true, updatedAt: true },
				},
			},
		}),
		db.quiz.findFirst({
			where: { bookId: book.id, status: "ready" },
			select: {
				questions: {
					orderBy: { position: "asc" },
					select: { position: true, choices: true },
				},
				submissions: {
					where: { status: "submitted", user: visibleOnSiteUserWhere },
					select: { answers: true, score: true },
				},
			},
		}),
		db.user.count({ where: visibleOnSiteUserWhere }),
		db.book.aggregate({ _avg: { averageRating: true } }),
	]);

	// Reads ----------------------------------------------------------------
	const readInputs = reads.map((read) => ({
		finish:
			read.readEndYear != null && read.readEndMonth != null
				? { year: read.readEndYear, month: read.readEndMonth }
				: null,
		marked: clubMonth(read.createdAt),
	}));
	const datedFinishes = readInputs
		.flatMap((read) => (read.finish ? [read.finish] : []))
		.map(bookStatsMonthIndex)
		.sort((a, b) => a - b);

	const editionCounts = new Map<string, number>();
	for (const read of reads) {
		if (read.editionId) {
			editionCounts.set(
				read.editionId,
				(editionCounts.get(read.editionId) ?? 0) + 1,
			);
		}
	}

	const first = datedFinishes[0];
	const last = datedFinishes.at(-1);

	// Ratings ----------------------------------------------------------------
	const ratingValues = feedbacks.map((feedback) => feedback.rating);
	const topReview = [...feedbacks].sort(
		(a, b) =>
			b._count.likes + b._count.comments - (a._count.likes + a._count.comments),
	)[0];

	// Audience ---------------------------------------------------------------
	const readerIds = new Set(reads.map((read) => read.userId));
	const readingNowIds = new Set<string>();
	for (const sitting of sittings) {
		if (sitting.status !== "reading") {
			continue;
		}
		for (const participant of sitting.participants) {
			if (
				!readerIds.has(participant.userId) &&
				(participant.progress === "not_started" ||
					participant.progress === "in_progress")
			) {
				readingNowIds.add(participant.userId);
			}
		}
	}

	// Polls ------------------------------------------------------------------
	const pollIds = [...new Set(pollOptions.map((option) => option.pollId))];
	const allOptions =
		pollIds.length === 0
			? []
			: await db.pollOption.findMany({
					where: { pollId: { in: pollIds } },
					select: {
						id: true,
						pollId: true,
						bookId: true,
						votes: { select: { points: true } },
					},
				});
	const pointsByPoll = new Map<
		string,
		{ bookId: string; points: number; voters: number }[]
	>();
	for (const option of allOptions) {
		const list = pointsByPoll.get(option.pollId) ?? [];
		list.push({
			bookId: option.bookId,
			points: option.votes.reduce((sum, vote) => sum + vote.points, 0),
			voters: option.votes.length,
		});
		pointsByPoll.set(option.pollId, list);
	}

	const pollEntries = pollOptions
		.filter((option) => option.poll.sitting.status !== "voting")
		.map((option) => {
			const options = pointsByPoll.get(option.pollId) ?? [];
			const own = options.find((item) => item.bookId === book.id);
			const points = own?.points ?? 0;
			return {
				sittingSlug: option.poll.sitting.slug,
				date: option.poll.deadline.toISOString(),
				rank: competitionRank(
					points,
					options.map((item) => item.points),
				),
				optionCount: Math.max(options.length, 1),
				points,
				voters: own?.voters ?? 0,
				chosen: option.poll.sitting.selectedBookId === book.id,
			};
		})
		.sort((a, b) => a.date.localeCompare(b.date));
	const openNow = pollOptions.find(
		(option) => option.poll.sitting.status === "voting",
	);

	// Collections --------------------------------------------------------------
	const collectionMonths = [...favorites, ...shelfEntries].map((entry) =>
		bookStatsMonthIndex(clubMonth(entry.createdAt)),
	);
	const collectionStart = collectionMonths.length
		? Math.min(...collectionMonths)
		: null;
	const favoritesByMonth = new Map<number, number>();
	for (const favorite of favorites) {
		const index = bookStatsMonthIndex(clubMonth(favorite.createdAt));
		favoritesByMonth.set(index, (favoritesByMonth.get(index) ?? 0) + 1);
	}
	const shelvesByMonth = new Map<number, number>();
	for (const entry of shelfEntries) {
		const index = bookStatsMonthIndex(clubMonth(entry.createdAt));
		shelvesByMonth.set(index, (shelvesByMonth.get(index) ?? 0) + 1);
	}
	let favoriteTotal = 0;
	let shelfTotal = 0;
	const collectionsMonthly =
		collectionStart == null
			? []
			: bookStatsMonthRange(collectionStart, currentIndex).map((month) => {
					const index = bookStatsMonthIndex(month);
					favoriteTotal += favoritesByMonth.get(index) ?? 0;
					shelfTotal += shelvesByMonth.get(index) ?? 0;
					return { ...month, favorites: favoriteTotal, shelves: shelfTotal };
				});

	// Sittings -----------------------------------------------------------------
	const participants = sittings.flatMap((sitting) =>
		sitting.participants.map((participant) => ({ sitting, participant })),
	);
	const finishDays = participants
		.filter(({ participant }) => participant.progress === "completed")
		.map(({ sitting, participant }) => {
			const start = sitting.readingStartedAt ?? sitting.createdAt;
			return Math.max(
				0,
				(participant.updatedAt.getTime() - start.getTime()) / MS_PER_DAY,
			);
		});

	// Quiz ---------------------------------------------------------------------
	const quizStats = quiz
		? (() => {
				const scores = quiz.submissions.flatMap((submission) =>
					submission.score == null ? [] : [submission.score],
				);
				const questions = quiz.questions.map((question, index) => {
					const choices = (question.choices ?? []) as {
						isCorrect: boolean;
					}[];
					let correct = 0;
					let wrong = 0;
					let skipped = 0;
					for (const submission of quiz.submissions) {
						const answer = submission.answers[index];
						if (answer == null || answer < 0) {
							skipped += 1;
						} else if (choices[answer]?.isCorrect) {
							correct += 1;
						} else {
							wrong += 1;
						}
					}
					return {
						position: question.position,
						label: QUIZ_SCORING[question.position - 1]?.label ?? "Question",
						correct,
						wrong,
						skipped,
					};
				});
				const scoreCounts = new Map<number, number>();
				for (const score of scores) {
					scoreCounts.set(score, (scoreCounts.get(score) ?? 0) + 1);
				}
				const scoreRows: { label: string; count: number }[] = [];
				for (let score = QUIZ_MIN_SCORE; score <= QUIZ_MAX_SCORE; score += 1) {
					scoreRows.push({
						label: String(score),
						count: scoreCounts.get(score) ?? 0,
					});
				}
				return {
					takers: scores.length,
					averageScore: round(average(scores)),
					minScore: QUIZ_MIN_SCORE,
					maxScore: QUIZ_MAX_SCORE,
					scores: scoreRows,
					questions,
				};
			})()
		: null;

	const readers = reads.length;
	const clubRating = round(average(ratingValues));
	const closedPolls = pollEntries.length;

	return {
		book: {
			slug: book.slug,
			title: book.title,
			pages: book.pages,
			openLibraryRating: book.openLibraryRating,
		},
		asOf: now.toISOString(),
		totals: {
			readers,
			reviews: feedbacks.length,
			clubRating,
			libraryAverageRating: round(libraryAverage._avg.averageRating),
			favorites: favorites.length,
			shelves: shelfEntries.length,
			quizTakers: quizStats?.takers ?? 0,
			quizAverageScore: quizStats?.averageScore ?? null,
			pagesReadTogether: readers * book.pages,
		},
		reads: {
			dated: datedFinishes.length,
			undated: readers - datedFinishes.length,
			firstFinish: first == null ? null : monthFromIndex(first),
			lastFinish: last == null ? null : monthFromIndex(last),
			monthly: bookReadsByMonth(readInputs, currentIndex),
			editions: [...editionCounts.entries()]
				.sort((a, b) => b[1] - a[1])
				.slice(0, TOP_EDITIONS)
				.map(([olid, count]) => ({ olid, count })),
		},
		ratings: {
			average: clubRating,
			median: medianNumber(ratingValues),
			histogram: bookRatingHistogram(ratingValues),
			monthly: bookRatingsByMonth(
				feedbacks.map((feedback) => ({
					month: clubMonth(feedback.createdAt),
					rating: feedback.rating,
				})),
				currentIndex,
			).map((row) => ({ ...row, average: round(row.average) })),
			withText: feedbacks.filter(
				(feedback) => feedback.review.trim().length > 0,
			).length,
			spoilers: feedbacks.filter((feedback) => feedback.isSpoiler).length,
			likes: feedbacks.reduce(
				(sum, feedback) => sum + feedback._count.likes,
				0,
			),
			comments: feedbacks.reduce(
				(sum, feedback) => sum + feedback._count.comments,
				0,
			),
			topReview:
				topReview && topReview._count.likes + topReview._count.comments > 0
					? {
							slug: topReview.slug,
							rating: topReview.rating,
							likes: topReview._count.likes,
							comments: topReview._count.comments,
							author: topReview.author,
						}
					: null,
		},
		audience: {
			members: memberCount,
			read: readerIds.size,
			readingNow: readingNowIds.size,
			notRead: Math.max(0, memberCount - readerIds.size - readingNowIds.size),
		},
		polls: {
			appearances: pollOptions.length,
			closed: closedPolls,
			chosen: sittings.filter((sitting) => sitting.status !== "voting").length,
			openNowSittingSlug: openNow?.poll.sitting.slug ?? null,
			averageRank: round(average(pollEntries.map((entry) => entry.rank))),
			averagePoints: round(average(pollEntries.map((entry) => entry.points))),
			entries: pollEntries,
		},
		collections: { monthly: collectionsMonthly },
		sittings: {
			count: sittings.length,
			joined: participants.length,
			started: participants.filter(
				({ participant }) => participant.progress !== "not_started",
			).length,
			completed: participants.filter(
				({ participant }) => participant.progress === "completed",
			).length,
			dnf: participants.filter(
				({ participant }) => participant.progress === "dnf",
			).length,
			medianFinishDays: round(medianNumber(finishDays), 1),
			finishDays: bookFinishDaysHistogram(finishDays),
		},
		quiz: quizStats,
	};
}

function monthFromIndex(index: number) {
	return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}
