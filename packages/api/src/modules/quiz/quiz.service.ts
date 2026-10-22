import type { Session } from "@bbrc/auth";
import type { Database, Prisma } from "@bbrc/db";
import {
	addCalendarDays,
	getZonedParts,
	resolveClubTimeZone,
	zonedTimeToUtc,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import type { z } from "zod";
import { definePagination } from "../../utils/pagination";
import {
	assertMemberVisible,
	viewerFromSession,
	visibleOnSiteUserWhere,
} from "../user/user-visibility";
import type {
	GetQuizEntryStateOutput,
	GetQuizResultsOutput,
	GetQuizReviewOutput,
	ListBookQuizSubmissionsInputSchema,
	ListBookQuizSubmissionsOutput,
	ListUserQuizzesInputSchema,
	ListUserQuizzesOutput,
	QuizReviewQuestion,
	StartQuizOutput,
} from "./quiz.schema";
import {
	type GeneratedQuizQuestion,
	generateQuizDraft,
	quizGenerationAvailable,
} from "./quiz-generation";
import {
	QUIZ_FAILED_PER_DAY,
	QUIZ_FIRST_TIME_PER_DAY,
	QUIZ_GENERATING_STALE_MS,
	QUIZ_MAX_SCORE,
	QUIZ_MIN_SCORE,
	QUIZ_QUESTION_COUNT,
	QUIZ_SCORING,
	QUIZ_SKIPPED,
	QUIZ_UNAVAILABLE_DAYS,
	QUIZ_WINDOW_MINUTES,
	scoreQuizAnswers,
} from "./quiz-scoring";

type Choice = { text: string; isCorrect: boolean };

const clubTimeZone = () => resolveClubTimeZone(process.env.CLUB_TIMEZONE);

/** Start of today and of tomorrow in club time, as UTC instants. */
function clubDayWindow(now: Date): { start: Date; end: Date } {
	const tz = clubTimeZone();
	const parts = getZonedParts(now, tz);
	const next = addCalendarDays(parts.year, parts.month, parts.day, 1);
	return {
		start: zonedTimeToUtc(parts.year, parts.month, parts.day, 0, 0, tz),
		end: zonedTimeToUtc(next.year, next.month, next.day, 0, 0, tz),
	};
}

async function loadBook(slug: string, db: Database) {
	const book = await db.book.findUnique({
		where: { slug },
		select: {
			id: true,
			slug: true,
			title: true,
			authors: true,
			coverId: true,
			publishedIn: true,
			excerpt: true,
		},
	});

	if (!book) {
		throw new ORPCError("NOT_FOUND", {
			message: "Book not found",
			data: { slug },
		});
	}

	return book;
}

function requireUserId(session: Session | null): string {
	const userId = session?.user?.id;
	if (!userId) {
		throw new ORPCError("UNAUTHORIZED", {
			message: "Sign in to take a quiz.",
		});
	}
	return userId;
}

async function hasReadBook(userId: string, bookId: string, db: Database) {
	const read = await db.read.findUnique({
		where: { userId_bookId: { userId, bookId } },
		select: { userId: true },
	});
	return read != null;
}

function choicesOf(value: Prisma.JsonValue): Choice[] {
	return (value as Choice[]) ?? [];
}

function isUniqueViolation(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: string }).code === "P2002"
	);
}

async function countGenerationsToday(
	userId: string,
	now: Date,
	db: Database,
): Promise<{ ready: number; failed: number; resetsAt: Date }> {
	const { start, end } = clubDayWindow(now);
	const [ready, failed] = await Promise.all([
		db.quizGenerationLog.count({
			where: { userId, outcome: "ready", createdAt: { gte: start, lt: end } },
		}),
		db.quizGenerationLog.count({
			where: { userId, outcome: "failed", createdAt: { gte: start, lt: end } },
		}),
	]);
	return { ready, failed, resetsAt: end };
}

// ---------------------------------------------------------------------------
// Entry state
// ---------------------------------------------------------------------------

export async function getQuizEntryState(
	slug: string,
	db: Database,
	session: Session | null,
): Promise<GetQuizEntryStateOutput> {
	const book = await loadBook(slug, db);
	const now = new Date();
	const userId = session?.user?.id ?? null;

	const [quiz, submissionCount] = await Promise.all([
		db.quiz.findUnique({
			where: { bookId: book.id },
			select: { id: true, status: true, unavailableUntil: true },
		}),
		db.quizSubmission.count({
			where: {
				status: "submitted",
				quiz: { bookId: book.id },
				user: visibleOnSiteUserWhere,
			},
		}),
	]);

	const quizReady = quiz?.status === "ready";

	if (!userId) {
		return {
			state: "signed_out",
			firstTimeLeftToday: null,
			quizReady,
			submissionCount,
		};
	}

	const [read, counts, submission] = await Promise.all([
		hasReadBook(userId, book.id, db),
		countGenerationsToday(userId, now, db),
		quiz
			? db.quizSubmission.findUnique({
					where: { userId_quizId: { userId, quizId: quiz.id } },
					select: { status: true, expiresAt: true },
				})
			: Promise.resolve(null),
	]);

	const firstTimeLeftToday = Math.max(
		0,
		QUIZ_FIRST_TIME_PER_DAY - counts.ready,
	);
	const base = { firstTimeLeftToday, quizReady, submissionCount };

	if (submission?.status === "submitted") {
		return { ...base, state: "submitted" };
	}
	if (
		submission?.status === "forfeited" ||
		(submission?.status === "in_progress" && submission.expiresAt <= now)
	) {
		return { ...base, state: "forfeited" };
	}
	if (!read) {
		return { ...base, state: "not_read" };
	}
	if (submission?.status === "in_progress") {
		return { ...base, state: "in_progress" };
	}
	if (
		quiz?.status === "unavailable" &&
		quiz.unavailableUntil != null &&
		quiz.unavailableUntil > now
	) {
		return { ...base, state: "unavailable" };
	}

	return { ...base, state: "can_start" };
}

// ---------------------------------------------------------------------------
// Start (generate on first request, then open the single attempt)
// ---------------------------------------------------------------------------

async function loadPlayableQuestions(quizId: string, db: Database) {
	const rows = await db.quizQuestion.findMany({
		where: { quizId },
		orderBy: { position: "asc" },
		select: { position: true, question: true, choices: true },
	});

	return rows.map((row) => ({
		position: row.position,
		question: row.question,
		choices: choicesOf(row.choices).map((choice) => choice.text),
	}));
}

async function openAttempt(
	userId: string,
	quizId: string,
	now: Date,
	db: Database,
): Promise<StartQuizOutput> {
	let submission = await db.quizSubmission.findUnique({
		where: { userId_quizId: { userId, quizId } },
	});

	if (!submission) {
		try {
			submission = await db.quizSubmission.create({
				data: {
					userId,
					quizId,
					startedAt: now,
					expiresAt: new Date(now.getTime() + QUIZ_WINDOW_MINUTES * 60_000),
				},
			});
		} catch (error) {
			if (!isUniqueViolation(error)) {
				throw error;
			}
			submission = await db.quizSubmission.findUniqueOrThrow({
				where: { userId_quizId: { userId, quizId } },
			});
		}
	}

	if (submission.status === "submitted") {
		return { status: "finished", submissionStatus: "submitted" };
	}

	if (submission.status === "in_progress" && submission.expiresAt <= now) {
		await db.quizSubmission.updateMany({
			where: { id: submission.id, status: "in_progress" },
			data: { status: "forfeited" },
		});
		return { status: "finished", submissionStatus: "forfeited" };
	}

	if (submission.status === "forfeited") {
		return { status: "finished", submissionStatus: "forfeited" };
	}

	return {
		status: "ready",
		startedAt: submission.startedAt,
		expiresAt: submission.expiresAt,
		questions: await loadPlayableQuestions(quizId, db),
	};
}

type BookForGeneration = Awaited<ReturnType<typeof loadBook>>;

/**
 * Runs the AI for a quiz row already marked `generating` and stores the
 * outcome. Returns what happened so callers can react.
 */
async function runGeneration(
	args: { quizId: string; book: BookForGeneration; actorId: string },
	db: Database,
): Promise<"ready" | "declined"> {
	const { quizId, book, actorId } = args;

	let draft: Awaited<ReturnType<typeof generateQuizDraft>>;
	try {
		draft = await generateQuizDraft(book);
	} catch (error) {
		// Free the book so the next attempt starts clean.
		await db.$transaction([
			db.quizGenerationLog.create({
				data: { userId: actorId, bookId: book.id, outcome: "failed" },
			}),
			db.quiz.deleteMany({ where: { id: quizId, status: "generating" } }),
		]);
		throw new ORPCError("BAD_GATEWAY", {
			message:
				error instanceof Error
					? `Could not generate the quiz: ${error.message}`
					: "Could not generate the quiz",
		});
	}

	if (draft.result.kind === "declined") {
		const until = new Date(
			Date.now() + QUIZ_UNAVAILABLE_DAYS * 24 * 60 * 60 * 1000,
		);
		await db.$transaction([
			db.quiz.update({
				where: { id: quizId },
				data: {
					status: "unavailable",
					unavailableUntil: until,
					generatingStartedAt: null,
					model: draft.model,
				},
			}),
			db.quizGenerationLog.create({
				data: { userId: actorId, bookId: book.id, outcome: "declined" },
			}),
		]);
		return "declined";
	}

	const questions: GeneratedQuizQuestion[] = draft.result.questions;
	await db.$transaction([
		db.quizQuestion.deleteMany({ where: { quizId } }),
		db.quizQuestion.createMany({
			data: questions.map((item, index) => ({
				quizId,
				position: index + 1,
				question: item.question,
				explanation: item.explanation,
				choices: item.choices,
			})),
		}),
		db.quiz.update({
			where: { id: quizId },
			data: {
				status: "ready",
				generatingStartedAt: null,
				unavailableUntil: null,
				model: draft.model,
				generatedById: actorId,
			},
		}),
		db.quizGenerationLog.create({
			data: { userId: actorId, bookId: book.id, outcome: "ready" },
		}),
	]);

	return "ready";
}

export async function startQuiz(
	slug: string,
	db: Database,
	session: Session | null,
): Promise<StartQuizOutput> {
	const userId = requireUserId(session);
	const book = await loadBook(slug, db);
	const now = new Date();

	const existing = await db.quizSubmission.findFirst({
		where: { userId, quiz: { bookId: book.id } },
		select: { status: true },
	});
	if (existing?.status === "submitted" || existing?.status === "forfeited") {
		return { status: "finished", submissionStatus: existing.status };
	}

	if (!(await hasReadBook(userId, book.id, db))) {
		throw new ORPCError("FORBIDDEN", {
			message: "Mark this book as read to take its quiz.",
		});
	}

	const quiz = await db.quiz.findUnique({
		where: { bookId: book.id },
		select: {
			id: true,
			status: true,
			generatingStartedAt: true,
			unavailableUntil: true,
		},
	});

	if (quiz?.status === "ready") {
		return openAttempt(userId, quiz.id, now, db);
	}

	if (quiz?.status === "unavailable" && quiz.unavailableUntil) {
		if (quiz.unavailableUntil > now) {
			return { status: "unavailable", until: quiz.unavailableUntil };
		}
	}

	if (
		quiz?.status === "generating" &&
		quiz.generatingStartedAt != null &&
		now.getTime() - quiz.generatingStartedAt.getTime() <
			QUIZ_GENERATING_STALE_MS
	) {
		return { status: "generating" };
	}

	// This request would call the AI: enforce the daily limits first.
	if (!quizGenerationAvailable()) {
		throw new ORPCError("PRECONDITION_FAILED", {
			message: "Quizzes are not available right now.",
		});
	}

	const isAdmin = session?.user?.isAdmin === true;
	if (!isAdmin) {
		const counts = await countGenerationsToday(userId, now, db);
		if (counts.ready >= QUIZ_FIRST_TIME_PER_DAY) {
			return {
				status: "limit_reached",
				reason: "first_time",
				limit: QUIZ_FIRST_TIME_PER_DAY,
				resetsAt: counts.resetsAt,
			};
		}
		if (counts.failed >= QUIZ_FAILED_PER_DAY) {
			return {
				status: "limit_reached",
				reason: "failures",
				limit: QUIZ_FAILED_PER_DAY,
				resetsAt: counts.resetsAt,
			};
		}
	}

	// Claim the generation so concurrent readers wait instead of paying twice.
	let quizId: string;
	if (!quiz) {
		try {
			const created = await db.quiz.create({
				data: {
					bookId: book.id,
					status: "generating",
					generatingStartedAt: now,
				},
				select: { id: true },
			});
			quizId = created.id;
		} catch (error) {
			if (isUniqueViolation(error)) {
				return { status: "generating" };
			}
			throw error;
		}
	} else {
		const claimed = await db.quiz.updateMany({
			where: {
				id: quiz.id,
				status: quiz.status,
				generatingStartedAt: quiz.generatingStartedAt,
				unavailableUntil: quiz.unavailableUntil,
			},
			data: { status: "generating", generatingStartedAt: now },
		});
		if (claimed.count === 0) {
			return { status: "generating" };
		}
		quizId = quiz.id;
	}

	const outcome = await runGeneration({ quizId, book, actorId: userId }, db);
	if (outcome === "declined") {
		const until = new Date(
			now.getTime() + QUIZ_UNAVAILABLE_DAYS * 24 * 60 * 60 * 1000,
		);
		return { status: "unavailable", until };
	}

	return openAttempt(userId, quizId, new Date(), db);
}

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

export async function submitQuiz(
	input: { slug: string; answers: number[] },
	db: Database,
	session: Session | null,
): Promise<{ status: "submitted" | "forfeited" }> {
	const userId = requireUserId(session);
	const book = await loadBook(input.slug, db);
	const now = new Date();

	const submission = await db.quizSubmission.findFirst({
		where: { userId, quiz: { bookId: book.id } },
		select: {
			id: true,
			status: true,
			expiresAt: true,
			quiz: {
				select: {
					questions: {
						orderBy: { position: "asc" },
						select: { choices: true },
					},
				},
			},
		},
	});

	if (!submission) {
		throw new ORPCError("NOT_FOUND", {
			message: "Open the quiz before submitting it.",
		});
	}

	if (submission.status === "submitted") {
		throw new ORPCError("CONFLICT", {
			message: "You already submitted this quiz.",
		});
	}

	if (submission.status === "forfeited" || submission.expiresAt <= now) {
		await db.quizSubmission.updateMany({
			where: { id: submission.id, status: "in_progress" },
			data: { status: "forfeited" },
		});
		return { status: "forfeited" };
	}

	const correctIndexes = submission.quiz.questions.map((row) =>
		choicesOf(row.choices).findIndex((choice) => choice.isCorrect),
	);
	const result = scoreQuizAnswers(input.answers, correctIndexes);

	const updated = await db.quizSubmission.updateMany({
		where: { id: submission.id, status: "in_progress" },
		data: {
			status: "submitted",
			submittedAt: now,
			answers: input.answers,
			correctAnswersCount: result.correct,
			incorrectAnswersCount: result.incorrect,
			skippedAnswersCount: result.skipped,
			score: result.score,
		},
	});

	if (updated.count === 0) {
		throw new ORPCError("CONFLICT", {
			message: "This quiz was already closed.",
		});
	}

	return { status: "submitted" };
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

type SubmittedRow = {
	userId: string;
	score: number;
	correct: number;
	incorrect: number;
	skipped: number;
	submittedAt: Date;
	answers: number[];
	user: {
		username: string;
		name: string;
		image: string | null;
		isHidden: boolean;
	};
};

/** Competition ranking: equal scores share a rank, earlier submissions list first. */
function rankRows(
	rows: SubmittedRow[],
): Array<SubmittedRow & { rank: number }> {
	const sorted = [...rows].sort(
		(a, b) =>
			b.score - a.score || a.submittedAt.getTime() - b.submittedAt.getTime(),
	);
	let lastScore: number | null = null;
	let lastRank = 0;
	return sorted.map((row, index) => {
		if (row.score !== lastScore) {
			lastRank = index + 1;
			lastScore = row.score;
		}
		return { ...row, rank: lastRank };
	});
}

async function loadSubmittedRows(
	quizId: string,
	db: Database,
): Promise<SubmittedRow[]> {
	const rows = await db.quizSubmission.findMany({
		where: { quizId, status: "submitted" },
		select: {
			userId: true,
			score: true,
			correctAnswersCount: true,
			incorrectAnswersCount: true,
			skippedAnswersCount: true,
			submittedAt: true,
			answers: true,
			user: {
				select: { username: true, name: true, image: true, isHidden: true },
			},
		},
	});

	return rows.map((row) => ({
		userId: row.userId,
		score: row.score ?? 0,
		correct: row.correctAnswersCount,
		incorrect: row.incorrectAnswersCount,
		skipped: row.skippedAnswersCount,
		submittedAt: row.submittedAt ?? new Date(0),
		answers: row.answers,
		user: row.user,
	}));
}

function buildReviewQuestions(
	questions: Array<{
		position: number;
		question: string;
		explanation: string;
		choices: Prisma.JsonValue;
	}>,
	answers: number[],
	reportedPositions: Set<number>,
): QuizReviewQuestion[] {
	return questions.map((row, index) => {
		const scoring = QUIZ_SCORING[index] ?? QUIZ_SCORING[0];
		const choices = choicesOf(row.choices);
		const answer = answers[index] ?? QUIZ_SKIPPED;
		const correctIndex = choices.findIndex((choice) => choice.isCorrect);
		const earned =
			answer === QUIZ_SKIPPED
				? 0
				: answer === correctIndex
					? scoring.correct
					: scoring.wrong;

		return {
			position: row.position,
			question: row.question,
			explanation: row.explanation,
			difficulty: scoring.label,
			pointsCorrect: scoring.correct,
			pointsWrong: scoring.wrong,
			choices,
			myAnswer: answer,
			earned,
			reported: reportedPositions.has(row.position),
		};
	});
}

async function loadQuizByBookSlug(slug: string, db: Database) {
	const book = await loadBook(slug, db);
	const quiz = await db.quiz.findUnique({
		where: { bookId: book.id },
		select: {
			id: true,
			questions: {
				orderBy: { position: "asc" },
				select: {
					id: true,
					position: true,
					question: true,
					explanation: true,
					choices: true,
				},
			},
		},
	});
	return { book, quiz };
}

const LEADERBOARD_SIZE = 10;

export async function getQuizResults(
	slug: string,
	db: Database,
	session: Session | null,
): Promise<GetQuizResultsOutput> {
	const userId = requireUserId(session);
	const { book, quiz } = await loadQuizByBookSlug(slug, db);

	const mine = quiz
		? await db.quizSubmission.findUnique({
				where: { userId_quizId: { userId, quizId: quiz.id } },
				select: { id: true, status: true, answers: true, expiresAt: true },
			})
		: null;

	if (!quiz || !mine) {
		throw new ORPCError("FORBIDDEN", {
			message: "Take the quiz to see its results.",
		});
	}

	let status: "submitted" | "forfeited";
	if (mine.status === "submitted") {
		status = "submitted";
	} else if (
		mine.status === "forfeited" ||
		(mine.status === "in_progress" && mine.expiresAt <= new Date())
	) {
		await db.quizSubmission.updateMany({
			where: { id: mine.id, status: "in_progress" },
			data: { status: "forfeited" },
		});
		status = "forfeited";
	} else {
		throw new ORPCError("FORBIDDEN", {
			message: "Submit the quiz to see its results.",
		});
	}

	const rows = await loadSubmittedRows(quiz.id, db);
	const ranked = rankRows(rows);
	const meRow = ranked.find((row) => row.userId === userId) ?? null;

	const toLeaderRow = (row: SubmittedRow & { rank: number }) => ({
		rank: row.rank,
		user: {
			username: row.user.username,
			name: row.user.name,
			image: row.user.image,
		},
		score: row.score,
		correct: row.correct,
		incorrect: row.incorrect,
		skipped: row.skipped,
		submittedAt: row.submittedAt,
		isMe: row.userId === userId,
	});

	const visible = ranked.filter(
		(row) => !row.user.isHidden || row.userId === userId,
	);
	const leaderboard = visible.slice(0, LEADERBOARD_SIZE).map(toLeaderRow);
	const myRow =
		meRow && !leaderboard.some((row) => row.isMe) ? toLeaderRow(meRow) : null;

	const distributionMap = new Map<number, number>();
	for (const row of rows) {
		distributionMap.set(row.score, (distributionMap.get(row.score) ?? 0) + 1);
	}
	const distribution = [...distributionMap.entries()]
		.map(([score, count]) => ({ score, count }))
		.sort((a, b) => a.score - b.score);

	const correctIndexes = quiz.questions.map((q) =>
		choicesOf(q.choices).findIndex((choice) => choice.isCorrect),
	);
	const questionStats = quiz.questions.map((q, index) => {
		const answered = rows.filter(
			(row) => (row.answers[index] ?? QUIZ_SKIPPED) !== QUIZ_SKIPPED,
		).length;
		const right = rows.filter(
			(row) => row.answers[index] === correctIndexes[index],
		).length;
		return {
			position: q.position,
			difficulty: QUIZ_SCORING[index]?.label ?? "",
			correctPercent:
				rows.length === 0 ? 0 : Math.round((right / rows.length) * 100),
			answered,
		};
	});

	const below = meRow
		? rows.filter((row) => row.score < meRow.score).length
		: 0;
	const beatPercent =
		meRow && rows.length > 1
			? Math.floor((below / (rows.length - 1)) * 100)
			: null;

	let questions: QuizReviewQuestion[] = [];
	if (status === "submitted") {
		const reports = await db.quizQuestionReport.findMany({
			where: { userId, question: { quizId: quiz.id } },
			select: { question: { select: { position: true } } },
		});
		questions = buildReviewQuestions(
			quiz.questions,
			mine.answers,
			new Set(reports.map((report) => report.question.position)),
		);
	}

	return {
		book: {
			slug: book.slug,
			title: book.title,
			authors: book.authors,
			coverId: book.coverId,
		},
		status,
		me: meRow
			? {
					score: meRow.score,
					correct: meRow.correct,
					incorrect: meRow.incorrect,
					skipped: meRow.skipped,
					rank: meRow.rank,
					beatPercent,
					submittedAt: meRow.submittedAt,
				}
			: null,
		participantCount: rows.length,
		maxScore: QUIZ_MAX_SCORE,
		minScore: QUIZ_MIN_SCORE,
		questions,
		leaderboard,
		myRow,
		distribution,
		questionStats,
	};
}

export async function getQuizReview(
	input: { slug: string; username: string },
	db: Database,
	session: Session | null,
): Promise<GetQuizReviewOutput> {
	const viewer = viewerFromSession(session);
	const target = await db.user.findUnique({
		where: { username: input.username },
		select: { id: true, isHidden: true, username: true },
	});
	assertMemberVisible(target, viewer);

	if (!viewer || (viewer.userId !== target.id && !viewer.isAdmin)) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only you can review your own answers.",
		});
	}

	const { book, quiz } = await loadQuizByBookSlug(input.slug, db);
	const submission = quiz
		? await db.quizSubmission.findUnique({
				where: { userId_quizId: { userId: target.id, quizId: quiz.id } },
			})
		: null;

	if (!quiz || !submission || submission.status !== "submitted") {
		throw new ORPCError("NOT_FOUND", { message: "No submitted quiz found." });
	}

	return {
		book: {
			slug: book.slug,
			title: book.title,
			authors: book.authors,
			coverId: book.coverId,
		},
		score: submission.score ?? 0,
		correct: submission.correctAnswersCount,
		incorrect: submission.incorrectAnswersCount,
		skipped: submission.skippedAnswersCount,
		submittedAt: submission.submittedAt ?? submission.updatedAt,
		questions: buildReviewQuestions(
			quiz.questions,
			submission.answers,
			new Set(),
		),
	};
}

export async function reportQuizQuestion(
	input: { slug: string; position: number; reason?: string },
	db: Database,
	session: Session | null,
): Promise<{ ok: true }> {
	const userId = requireUserId(session);
	const { quiz } = await loadQuizByBookSlug(input.slug, db);

	const submission = quiz
		? await db.quizSubmission.findUnique({
				where: { userId_quizId: { userId, quizId: quiz.id } },
				select: { status: true },
			})
		: null;

	if (!quiz || submission?.status !== "submitted") {
		throw new ORPCError("FORBIDDEN", {
			message: "Only people who took the quiz can report a question.",
		});
	}

	const question = quiz.questions.find((q) => q.position === input.position);
	if (!question) {
		throw new ORPCError("NOT_FOUND", { message: "Question not found" });
	}

	await db.quizQuestionReport.upsert({
		where: { userId_questionId: { userId, questionId: question.id } },
		create: { userId, questionId: question.id, reason: input.reason ?? null },
		update: { reason: input.reason ?? null },
	});

	return { ok: true };
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

export async function listBookQuizSubmissions(
	input: z.infer<typeof ListBookQuizSubmissionsInputSchema>,
	db: Database,
): Promise<ListBookQuizSubmissionsOutput> {
	const { book, quiz } = await loadQuizByBookSlug(input.slug, db);
	const pagination = definePagination.offset({
		page: input.page,
		limit: input.limit,
	});
	const bookOut = {
		slug: book.slug,
		title: book.title,
		authors: book.authors,
		coverId: book.coverId,
	};

	if (!quiz) {
		return { book: bookOut, ...pagination.paginate([], 0) };
	}

	const allRows = await loadSubmittedRows(quiz.id, db);
	const rankByUser = new Map(
		rankRows(allRows).map((row) => [row.userId, row.rank]),
	);

	const where: Prisma.QuizSubmissionWhereInput = {
		quizId: quiz.id,
		status: "submitted",
		user: {
			...visibleOnSiteUserWhere,
			...(input.search
				? {
						OR: [
							{ name: { contains: input.search, mode: "insensitive" } },
							{ username: { contains: input.search, mode: "insensitive" } },
						],
					}
				: {}),
		},
	};

	const [total, rows] = await Promise.all([
		db.quizSubmission.count({ where }),
		db.quizSubmission.findMany({
			...pagination.use(),
			where,
			orderBy:
				input.sortBy === "score"
					? [{ score: input.sortDirection }, { submittedAt: "asc" }]
					: [{ submittedAt: input.sortDirection }, { id: "asc" }],
			select: {
				userId: true,
				score: true,
				correctAnswersCount: true,
				incorrectAnswersCount: true,
				skippedAnswersCount: true,
				submittedAt: true,
				user: { select: { username: true, name: true, image: true } },
			},
		}),
	]);

	return {
		book: bookOut,
		...pagination.paginate(
			rows.map((row) => ({
				rank: rankByUser.get(row.userId) ?? 1,
				user: row.user,
				score: row.score ?? 0,
				correct: row.correctAnswersCount,
				incorrect: row.incorrectAnswersCount,
				skipped: row.skippedAnswersCount,
				submittedAt: row.submittedAt ?? new Date(0),
			})),
			total,
		),
	};
}

export async function listUserQuizzes(
	input: z.infer<typeof ListUserQuizzesInputSchema>,
	db: Database,
	session: Session | null,
): Promise<ListUserQuizzesOutput> {
	const viewer = viewerFromSession(session);
	const target = await db.user.findUnique({
		where: { username: input.username },
		select: { id: true, isHidden: true, username: true },
	});
	assertMemberVisible(target, viewer);

	const pagination = definePagination.offset({
		page: input.page,
		limit: input.limit,
	});
	const canReview =
		viewer != null && (viewer.userId === target.id || viewer.isAdmin);

	const where: Prisma.QuizSubmissionWhereInput = {
		userId: target.id,
		status: input.status ?? { in: ["submitted", "forfeited"] },
		...(input.search
			? {
					quiz: {
						book: { title: { contains: input.search, mode: "insensitive" } },
					},
				}
			: {}),
	};

	const [total, rows] = await Promise.all([
		db.quizSubmission.count({ where }),
		db.quizSubmission.findMany({
			...pagination.use(),
			where,
			orderBy:
				input.sortBy === "score"
					? [
							{ score: { sort: input.sortDirection, nulls: "last" } },
							{ id: "asc" },
						]
					: [{ createdAt: input.sortDirection }, { id: "asc" }],
			select: {
				id: true,
				status: true,
				score: true,
				correctAnswersCount: true,
				incorrectAnswersCount: true,
				skippedAnswersCount: true,
				submittedAt: true,
				startedAt: true,
				quizId: true,
				quiz: {
					select: {
						book: {
							select: { slug: true, title: true, authors: true, coverId: true },
						},
					},
				},
			},
		}),
	]);

	const stats = await Promise.all(
		rows.map(async (row) => {
			const participantCount = await db.quizSubmission.count({
				where: { quizId: row.quizId, status: "submitted" },
			});
			const ahead =
				row.status === "submitted" && row.score != null
					? await db.quizSubmission.count({
							where: {
								quizId: row.quizId,
								status: "submitted",
								score: { gt: row.score },
							},
						})
					: null;
			return { participantCount, rank: ahead == null ? null : ahead + 1 };
		}),
	);

	return {
		canReview,
		...pagination.paginate(
			rows.map((row, index) => ({
				id: row.id,
				status: row.status,
				book: row.quiz.book,
				score: row.score,
				correct: row.correctAnswersCount,
				incorrect: row.incorrectAnswersCount,
				skipped: row.skippedAnswersCount,
				rank: stats[index]?.rank ?? null,
				participantCount: stats[index]?.participantCount ?? 0,
				submittedAt: row.submittedAt,
				startedAt: row.startedAt,
			})),
			total,
		),
	};
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

async function loadEditableQuiz(quizId: string, db: Database) {
	const quiz = await db.quiz.findUnique({
		where: { id: quizId },
		select: {
			id: true,
			status: true,
			book: {
				select: {
					id: true,
					slug: true,
					title: true,
					authors: true,
					coverId: true,
					publishedIn: true,
					excerpt: true,
				},
			},
			_count: { select: { submissions: true } },
		},
	});

	if (!quiz) {
		throw new ORPCError("NOT_FOUND", { message: "Quiz not found" });
	}

	return quiz;
}

function assertNoSubmissions(count: number) {
	if (count > 0) {
		throw new ORPCError("CONFLICT", {
			message:
				"This quiz already has attempts, so it can no longer be deleted or regenerated.",
		});
	}
}

export async function adminDeleteQuiz(
	quizId: string,
	db: Database,
): Promise<{ ok: true }> {
	const quiz = await loadEditableQuiz(quizId, db);
	assertNoSubmissions(quiz._count.submissions);
	await db.quiz.delete({ where: { id: quiz.id } });
	return { ok: true };
}

export async function adminClearUnavailableQuiz(
	quizId: string,
	db: Database,
): Promise<{ ok: true }> {
	const quiz = await loadEditableQuiz(quizId, db);
	if (quiz.status !== "unavailable") {
		throw new ORPCError("BAD_REQUEST", {
			message: "Only unavailable quizzes can be cleared.",
		});
	}
	await db.quiz.delete({ where: { id: quiz.id } });
	return { ok: true };
}

export async function adminRegenerateQuiz(
	quizId: string,
	db: Database,
	session: Session | null,
): Promise<{ ok: true }> {
	const adminId = requireUserId(session);
	const quiz = await loadEditableQuiz(quizId, db);
	assertNoSubmissions(quiz._count.submissions);

	if (!quizGenerationAvailable()) {
		throw new ORPCError("PRECONDITION_FAILED", {
			message: "Gemini is not configured.",
		});
	}

	await db.quiz.update({
		where: { id: quiz.id },
		data: { status: "generating", generatingStartedAt: new Date() },
	});

	const outcome = await runGeneration(
		{ quizId: quiz.id, book: quiz.book, actorId: adminId },
		db,
	);
	if (outcome === "declined") {
		throw new ORPCError("BAD_REQUEST", {
			message: "The model declined to write a quiz for this book.",
		});
	}

	return { ok: true };
}

export { QUIZ_QUESTION_COUNT };
