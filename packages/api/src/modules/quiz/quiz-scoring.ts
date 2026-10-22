export const QUIZ_QUESTION_COUNT = 5;
export const QUIZ_CHOICE_COUNT = 4;
export const QUIZ_SKIPPED = -1;

/**
 * Points per question position (index 0 = question 1). Easy questions punish a
 * wrong answer hard, hard questions reward a right one generously.
 */
export const QUIZ_SCORING = [
	{ correct: 1, wrong: -3, label: "Very easy" },
	{ correct: 2, wrong: -2, label: "Easy" },
	{ correct: 3, wrong: -1, label: "Moderate" },
	{ correct: 5, wrong: -1, label: "Hard" },
	{ correct: 8, wrong: -1, label: "Very hard" },
] as const;

export const QUIZ_MAX_SCORE = QUIZ_SCORING.reduce(
	(sum, row) => sum + row.correct,
	0,
);
export const QUIZ_MIN_SCORE = QUIZ_SCORING.reduce(
	(sum, row) => sum + row.wrong,
	0,
);

/** Minutes a user has to finish once they open the quiz. */
export const QUIZ_WINDOW_MINUTES = 20;
/** First-time quizzes (the ones that call the AI) a user may trigger per club day. */
export const QUIZ_FIRST_TIME_PER_DAY = 5;
/** Failed generations a user may cause per club day. */
export const QUIZ_FAILED_PER_DAY = 3;
/** A `generating` quiz older than this is treated as dead. */
export const QUIZ_GENERATING_STALE_MS = 2 * 60 * 1000;
/** How long a refusal ("unavailable") is cached before the AI is asked again. */
export const QUIZ_UNAVAILABLE_DAYS = 30;

export type QuizScoreResult = {
	correct: number;
	incorrect: number;
	skipped: number;
	score: number;
};

/** `correctIndexes[i]` is the index of the right choice for question i. */
export function scoreQuizAnswers(
	answers: readonly number[],
	correctIndexes: readonly number[],
): QuizScoreResult {
	let correct = 0;
	let incorrect = 0;
	let skipped = 0;
	let score = 0;

	for (let i = 0; i < QUIZ_QUESTION_COUNT; i += 1) {
		const answer = answers[i] ?? QUIZ_SKIPPED;
		const row = QUIZ_SCORING[i];
		if (!row) {
			continue;
		}

		if (answer === QUIZ_SKIPPED) {
			skipped += 1;
		} else if (answer === correctIndexes[i]) {
			correct += 1;
			score += row.correct;
		} else {
			incorrect += 1;
			score += row.wrong;
		}
	}

	return { correct, incorrect, skipped, score };
}
