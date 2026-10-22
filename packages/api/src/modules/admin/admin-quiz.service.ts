import type { Database, Prisma } from "@bbrc/db";
import { definePagination } from "../../utils/pagination";
import { mergeWhereFragments } from "../../utils/searching";
import { QUIZ_SCORING, QUIZ_SKIPPED } from "../quiz/quiz-scoring";
import {
	type AdminQuizListFilters,
	adminQuizListRanging,
	adminQuizListSearching,
	adminQuizListSorting,
} from "./admin-quiz.listing";
import type {
	AdminQuizOverviewOutput,
	GetAdminQuizOverviewInput,
	GetAdminQuizStatsInput,
	GetAdminQuizStatsOutput,
	ListAdminQuizzesInput,
	ListAdminQuizzesOutput,
} from "./admin-quiz.schema";

type AdminQuizQueryInput =
	| GetAdminQuizOverviewInput
	| ListAdminQuizzesInput
	| GetAdminQuizStatsInput;

type Choice = { text: string; isCorrect: boolean };

const DAY_MS = 24 * 60 * 60 * 1000;
const RANKING_LIMIT = 5;
const MIN_ATTEMPTS_FOR_SCORE_RANKING = 2;

function dayKeys(days: number): string[] {
	const since = new Date();
	since.setUTCDate(since.getUTCDate() - (days - 1));
	since.setUTCHours(0, 0, 0, 0);
	return Array.from({ length: days }, (_, i) => {
		const day = new Date(since);
		day.setUTCDate(since.getUTCDate() + i);
		return day.toISOString().slice(0, 10);
	});
}

function countsByDay(rows: { createdAt: Date }[], days: number) {
	const map = new Map(dayKeys(days).map((key) => [key, 0]));
	for (const row of rows) {
		const key = row.createdAt.toISOString().slice(0, 10);
		if (map.has(key)) {
			map.set(key, (map.get(key) ?? 0) + 1);
		}
	}
	return [...map.entries()].map(([date, count]) => ({ date, count }));
}

function hasIdFilters(input: AdminQuizListFilters): boolean {
	return (
		input.minAttempts != null ||
		input.maxAttempts != null ||
		input.minAverageScore != null ||
		input.maxAverageScore != null ||
		input.minReports != null ||
		input.editable != null
	);
}

/** Filters that need per-quiz aggregates, resolved to a list of ids. */
async function resolveQuizIdFilter(
	db: Database,
	input: AdminQuizListFilters,
): Promise<string[] | null> {
	if (!hasIdFilters(input)) {
		return null;
	}

	const [quizzes, submitted, anyAttempt, reports] = await Promise.all([
		db.quiz.findMany({ select: { id: true } }),
		db.quizSubmission.groupBy({
			by: ["quizId"],
			where: { status: "submitted" },
			_count: { _all: true },
			_avg: { score: true },
		}),
		db.quizSubmission.groupBy({ by: ["quizId"], _count: { _all: true } }),
		input.minReports != null
			? db.quizQuestionReport.findMany({
					select: { question: { select: { quizId: true } } },
				})
			: Promise.resolve([]),
	]);

	const submittedBy = new Map(
		submitted.map((row) => [
			row.quizId,
			{ count: row._count._all, avg: row._avg.score },
		]),
	);
	const attemptsBy = new Map(
		anyAttempt.map((row) => [row.quizId, row._count._all]),
	);
	const reportsBy = new Map<string, number>();
	for (const report of reports) {
		const id = report.question.quizId;
		reportsBy.set(id, (reportsBy.get(id) ?? 0) + 1);
	}

	return quizzes
		.map((quiz) => quiz.id)
		.filter((id) => {
			const sub = submittedBy.get(id);
			const count = sub?.count ?? 0;
			if (input.minAttempts != null && count < input.minAttempts) return false;
			if (input.maxAttempts != null && count > input.maxAttempts) return false;
			if (input.minAverageScore != null) {
				if (sub?.avg == null || sub.avg < input.minAverageScore) return false;
			}
			if (input.maxAverageScore != null) {
				if (sub?.avg == null || sub.avg > input.maxAverageScore) return false;
			}
			if (
				input.minReports != null &&
				(reportsBy.get(id) ?? 0) < input.minReports
			)
				return false;
			if (input.editable != null) {
				const hasAttempts = (attemptsBy.get(id) ?? 0) > 0;
				if (input.editable === hasAttempts) return false;
			}
			return true;
		});
}

function extraWhere(input: AdminQuizListFilters): Prisma.QuizWhereInput {
	const parts: Prisma.QuizWhereInput[] = [];
	if (input.statuses?.length) {
		parts.push({ status: { in: input.statuses } });
	}
	if (input.generatorUsernames?.length) {
		parts.push({
			generatedBy: { username: { in: input.generatorUsernames } },
		});
	}
	if (input.reportedOnly) {
		parts.push({ questions: { some: { reports: { some: {} } } } });
	}
	return mergeWhereFragments<Prisma.QuizWhereInput>(...parts);
}

export async function buildAdminQuizWhere(
	input: AdminQuizQueryInput,
	db: Database,
): Promise<{ where: Prisma.QuizWhereInput | null; empty: boolean }> {
	const ranging = adminQuizListRanging.from(input);
	const searching = adminQuizListSearching.from(input);
	const idFilter = await resolveQuizIdFilter(db, input);

	if (idFilter?.length === 0) {
		return { where: null, empty: true };
	}

	const where = mergeWhereFragments<Prisma.QuizWhereInput>(
		ranging.use(),
		searching.use(),
		extraWhere(input),
		{ id: idFilter ? { in: idFilter } : undefined },
	);

	return { where, empty: false };
}

const listSelect = {
	id: true,
	status: true,
	model: true,
	createdAt: true,
	updatedAt: true,
	unavailableUntil: true,
	book: { select: { slug: true, title: true, authors: true, coverId: true } },
	generatedBy: { select: { username: true, name: true, image: true } },
	submissions: { select: { status: true, score: true } },
	questions: {
		orderBy: { position: "asc" },
		select: {
			position: true,
			question: true,
			reports: { select: { reason: true } },
		},
	},
} as const satisfies Prisma.QuizSelect;

function mapListRow(row: Prisma.QuizGetPayload<{ select: typeof listSelect }>) {
	const submitted = row.submissions.filter((s) => s.status === "submitted");
	const scores = submitted
		.map((s) => s.score)
		.filter((score): score is number => score != null);
	const reportedQuestions = row.questions
		.filter((q) => q.reports.length > 0)
		.map((q) => ({
			position: q.position,
			question: q.question,
			count: q.reports.length,
			reasons: q.reports
				.map((report) => report.reason?.trim())
				.filter((reason): reason is string => Boolean(reason)),
		}));

	return {
		id: row.id,
		status: row.status,
		book: row.book,
		generatedBy: row.generatedBy,
		model: row.model,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		unavailableUntil: row.unavailableUntil,
		counts: {
			submitted: submitted.length,
			forfeited: row.submissions.filter((s) => s.status === "forfeited").length,
			inProgress: row.submissions.filter((s) => s.status === "in_progress")
				.length,
			reports: reportedQuestions.reduce((sum, q) => sum + q.count, 0),
		},
		averageScore:
			scores.length === 0
				? null
				: scores.reduce((sum, score) => sum + score, 0) / scores.length,
		reportedQuestions,
	};
}

export async function listAdminQuizzes(
	input: ListAdminQuizzesInput,
	db: Database,
): Promise<ListAdminQuizzesOutput> {
	const pagination = definePagination.offset({
		page: input.page ?? 1,
		limit: input.limit ?? 20,
	});
	const sorting = adminQuizListSorting.from(input);

	const { where, empty } = await buildAdminQuizWhere(input, db);
	if (empty || where === null) {
		return pagination.paginate([], 0);
	}

	const [total, rows] = await Promise.all([
		db.quiz.count({ where }),
		db.quiz.findMany({
			...pagination.use(),
			where,
			orderBy: [sorting.use(), { id: "asc" }],
			select: listSelect,
		}),
	]);

	return pagination.paginate(rows.map(mapListRow), total);
}

function emptyOverview(): AdminQuizOverviewOutput {
	return {
		kpis: {
			totalQuizzes: 0,
			ready: 0,
			unavailable: 0,
			generating: 0,
			submittedAttempts: 0,
			forfeitedAttempts: 0,
			inProgressAttempts: 0,
			averageScore: null,
			quizzesWithReports: 0,
			totalReports: 0,
			createdLast7Days: 0,
			createdLast30Days: 0,
			generationsLast24h: 0,
			failedGenerationsLast24h: 0,
		},
		quizzesByDay: countsByDay([], 30),
		rankings: {
			mostAttempted: [],
			mostReported: [],
			highestAverageScore: [],
			lowestAverageScore: [],
			recentlyGenerated: [],
			topGenerators: [],
		},
	};
}

export async function getAdminQuizOverview(
	input: GetAdminQuizOverviewInput,
	db: Database,
): Promise<AdminQuizOverviewOutput> {
	const { where, empty } = await buildAdminQuizWhere(input, db);
	if (empty || where === null) {
		return emptyOverview();
	}

	const now = Date.now();
	const dayAgo = new Date(now - DAY_MS);

	const [quizzes, logsLastDay, generatorLogs] = await Promise.all([
		db.quiz.findMany({
			where,
			select: {
				id: true,
				status: true,
				createdAt: true,
				book: { select: { slug: true, title: true } },
				submissions: { select: { status: true, score: true } },
				questions: { select: { reports: { select: { id: true } } } },
			},
		}),
		db.quizGenerationLog.findMany({
			where: { createdAt: { gte: dayAgo } },
			select: { outcome: true },
		}),
		db.quizGenerationLog.groupBy({
			by: ["userId"],
			where: { outcome: "ready" },
			_count: { _all: true },
			orderBy: { _count: { userId: "desc" } },
			take: RANKING_LIMIT,
		}),
	]);

	const rows = quizzes.map((quiz) => {
		const submitted = quiz.submissions.filter((s) => s.status === "submitted");
		const scores = submitted
			.map((s) => s.score)
			.filter((score): score is number => score != null);
		return {
			quizId: quiz.id,
			bookSlug: quiz.book.slug,
			title: quiz.book.title,
			status: quiz.status,
			createdAt: quiz.createdAt,
			attempts: submitted.length,
			avg:
				scores.length >= MIN_ATTEMPTS_FOR_SCORE_RANKING
					? scores.reduce((sum, score) => sum + score, 0) / scores.length
					: null,
			reports: quiz.questions.reduce((sum, q) => sum + q.reports.length, 0),
		};
	});

	const allSubmissions = quizzes.flatMap((quiz) => quiz.submissions);
	const submittedScores = allSubmissions
		.filter((s) => s.status === "submitted" && s.score != null)
		.map((s) => s.score as number);

	const rank = (
		pick: (row: (typeof rows)[number]) => number | null,
		direction: "asc" | "desc",
		secondary?: (row: (typeof rows)[number]) => number,
	) =>
		rows
			.filter((row) => pick(row) != null)
			.sort((a, b) =>
				direction === "desc"
					? (pick(b) as number) - (pick(a) as number)
					: (pick(a) as number) - (pick(b) as number),
			)
			.slice(0, RANKING_LIMIT)
			.map((row) => ({
				quizId: row.quizId,
				bookSlug: row.bookSlug,
				title: row.title,
				status: row.status,
				metric: pick(row) as number,
				secondaryMetric: secondary?.(row),
			}));

	const generatorUsers = await db.user.findMany({
		where: { id: { in: generatorLogs.map((row) => row.userId) } },
		select: { id: true, username: true, name: true },
	});
	const userById = new Map(generatorUsers.map((user) => [user.id, user]));

	return {
		kpis: {
			totalQuizzes: rows.length,
			ready: rows.filter((r) => r.status === "ready").length,
			unavailable: rows.filter((r) => r.status === "unavailable").length,
			generating: rows.filter((r) => r.status === "generating").length,
			submittedAttempts: allSubmissions.filter((s) => s.status === "submitted")
				.length,
			forfeitedAttempts: allSubmissions.filter((s) => s.status === "forfeited")
				.length,
			inProgressAttempts: allSubmissions.filter(
				(s) => s.status === "in_progress",
			).length,
			averageScore:
				submittedScores.length === 0
					? null
					: submittedScores.reduce((sum, score) => sum + score, 0) /
						submittedScores.length,
			quizzesWithReports: rows.filter((r) => r.reports > 0).length,
			totalReports: rows.reduce((sum, r) => sum + r.reports, 0),
			createdLast7Days: rows.filter(
				(r) => r.createdAt.getTime() >= now - 7 * DAY_MS,
			).length,
			createdLast30Days: rows.filter(
				(r) => r.createdAt.getTime() >= now - 30 * DAY_MS,
			).length,
			generationsLast24h: logsLastDay.length,
			failedGenerationsLast24h: logsLastDay.filter(
				(l) => l.outcome === "failed",
			).length,
		},
		quizzesByDay: countsByDay(rows, 30),
		rankings: {
			mostAttempted: rank(
				(r) => r.attempts,
				"desc",
				(r) => r.reports,
			),
			mostReported: rank(
				(r) => (r.reports > 0 ? r.reports : null),
				"desc",
				(r) => r.attempts,
			),
			highestAverageScore: rank(
				(r) => r.avg,
				"desc",
				(r) => r.attempts,
			),
			lowestAverageScore: rank(
				(r) => r.avg,
				"asc",
				(r) => r.attempts,
			),
			recentlyGenerated: rank(
				(r) => r.createdAt.getTime(),
				"desc",
				(r) => r.attempts,
			),
			topGenerators: generatorLogs.flatMap((row) => {
				const user = userById.get(row.userId);
				return user
					? [
							{
								username: user.username,
								name: user.name,
								count: row._count._all,
							},
						]
					: [];
			}),
		},
	};
}

function attemptsBucket(count: number): string {
	if (count === 0) return "No attempts";
	if (count <= 2) return "1–2 attempts";
	if (count <= 5) return "3–5 attempts";
	return "6+ attempts";
}

export async function getAdminQuizStats(
	input: GetAdminQuizStatsInput,
	db: Database,
): Promise<GetAdminQuizStatsOutput> {
	const { where, empty } = await buildAdminQuizWhere(input, db);
	const days = dayKeys(30);
	const since = new Date(`${days[0]}T00:00:00.000Z`);

	const logs = await db.quizGenerationLog.findMany({
		where: { createdAt: { gte: since } },
		select: { outcome: true, createdAt: true },
	});
	const outcomeTotals = await db.quizGenerationLog.groupBy({
		by: ["outcome"],
		_count: { _all: true },
	});

	const generationsMap = new Map(
		days.map((date) => [date, { date, ready: 0, declined: 0, failed: 0 }]),
	);
	for (const log of logs) {
		const entry = generationsMap.get(log.createdAt.toISOString().slice(0, 10));
		if (entry) {
			entry[log.outcome] += 1;
		}
	}

	const generationOutcomes = (["ready", "declined", "failed"] as const).map(
		(outcome) => ({
			outcome,
			count:
				outcomeTotals.find((row) => row.outcome === outcome)?._count._all ?? 0,
		}),
	);
	const generationsByDay = [...generationsMap.values()];

	if (empty || where === null) {
		return {
			statusDistribution: [],
			generationOutcomes,
			generationsByDay,
			attemptsByDay: days.map((date) => ({ date, submitted: 0, forfeited: 0 })),
			scoreDistribution: [],
			questionDifficulty: [],
			attemptsPerQuiz: [],
			funnel: [],
		};
	}

	const quizzes = await db.quiz.findMany({
		where,
		select: {
			status: true,
			questions: { orderBy: { position: "asc" }, select: { choices: true } },
			submissions: {
				select: {
					status: true,
					score: true,
					answers: true,
					createdAt: true,
				},
			},
		},
	});

	const statusCounts = { generating: 0, ready: 0, unavailable: 0 };
	const attemptsMap = new Map(
		days.map((date) => [date, { date, submitted: 0, forfeited: 0 }]),
	);
	const scoreMap = new Map<number, number>();
	const perQuestion = QUIZ_SCORING.map(() => ({
		correct: 0,
		wrong: 0,
		skipped: 0,
	}));
	const bucketMap = new Map<string, number>();
	let withAttempts = 0;
	let withManyAttempts = 0;
	let started = 0;
	let submittedTotal = 0;

	for (const quiz of quizzes) {
		statusCounts[quiz.status] += 1;
		const correctIndexes = quiz.questions.map((q) =>
			(q.choices as Choice[]).findIndex((choice) => choice.isCorrect),
		);
		let submittedForQuiz = 0;

		for (const submission of quiz.submissions) {
			started += 1;
			const key = submission.createdAt.toISOString().slice(0, 10);
			const day = attemptsMap.get(key);

			if (submission.status === "submitted") {
				submittedTotal += 1;
				submittedForQuiz += 1;
				if (day) day.submitted += 1;
				if (submission.score != null) {
					scoreMap.set(
						submission.score,
						(scoreMap.get(submission.score) ?? 0) + 1,
					);
				}
				perQuestion.forEach((bucket, index) => {
					const answer = submission.answers[index] ?? QUIZ_SKIPPED;
					if (answer === QUIZ_SKIPPED) bucket.skipped += 1;
					else if (answer === correctIndexes[index]) bucket.correct += 1;
					else bucket.wrong += 1;
				});
			} else if (submission.status === "forfeited") {
				if (day) day.forfeited += 1;
			}
		}

		if (quiz.submissions.length > 0) withAttempts += 1;
		if (submittedForQuiz >= 3) withManyAttempts += 1;
		const bucket = attemptsBucket(submittedForQuiz);
		bucketMap.set(bucket, (bucketMap.get(bucket) ?? 0) + 1);
	}

	const percent = (part: number, total: number) =>
		total === 0 ? 0 : Math.round((part / total) * 100);

	return {
		statusDistribution: (["ready", "unavailable", "generating"] as const).map(
			(status) => ({ status, count: statusCounts[status] }),
		),
		generationOutcomes,
		generationsByDay,
		attemptsByDay: [...attemptsMap.values()],
		scoreDistribution: [...scoreMap.entries()]
			.map(([score, count]) => ({ score, count }))
			.sort((a, b) => a.score - b.score),
		questionDifficulty: perQuestion.map((bucket, index) => {
			const total = bucket.correct + bucket.wrong + bucket.skipped;
			return {
				position: index + 1,
				label: `Q${index + 1} · ${QUIZ_SCORING[index]?.label ?? ""}`,
				correctPercent: percent(bucket.correct, total),
				wrongPercent: percent(bucket.wrong, total),
				skippedPercent: percent(bucket.skipped, total),
			};
		}),
		attemptsPerQuiz: [
			"No attempts",
			"1–2 attempts",
			"3–5 attempts",
			"6+ attempts",
		].map((label) => ({ label, value: bucketMap.get(label) ?? 0 })),
		funnel: [
			{ stage: "Quizzes", count: quizzes.length },
			{ stage: "With attempts", count: withAttempts },
			{ stage: "3+ finished attempts", count: withManyAttempts },
			{ stage: "Attempts started", count: started },
			{ stage: "Attempts submitted", count: submittedTotal },
		],
	};
}
