import { z } from "zod";
import { getGeminiConfig } from "../../lib/gemini/config";
import { geminiGenerateJson } from "../../lib/gemini/generate-json";
import { QUIZ_CHOICE_COUNT, QUIZ_QUESTION_COUNT } from "./quiz-scoring";

const EXCERPT_MAX_CHARS = 500;
const GENERATION_TIMEOUT_MS = 60_000;

export const QUIZ_SYSTEM_PROMPT = `You write reading-comprehension quizzes for a book club. Every member taking your quiz has read the book, so the quiz must tell readers who followed the story from readers who skimmed it.

Write exactly ${QUIZ_QUESTION_COUNT} single-choice questions, each with exactly ${QUIZ_CHOICE_COUNT} answer choices and exactly one correct choice. Order them by rising difficulty:
1. Very easy: the premise or a central event that anyone who finished the book remembers.
2. Easy: a main character, relationship or major plot point.
3. Moderate: a specific scene, decision or consequence that takes real attention to recall.
4. Hard: a precise detail, a minor character's action, or the order or cause of events.
5. Very hard: something only a careful, detail-oriented reader would know. It must still be clearly answerable from the text itself.

Hard rules:
- Ask only about the story itself: its plot, characters, settings, events, objects and dialogue. Never ask about the author, the writing process, publication, awards, adaptations, critics, history, themes as literary analysis, or any outside resource.
- Never write phrases such as "according to the book", "in the novel" or "the author says". Phrase each question as a self-contained question about what happens in the story. A question may run to several sentences when it needs to set up the scene.
- Make wrong choices plausible: the same kind of thing as the correct one (a name for a name, a place for a place), and drawn from the same story where possible. No joke answers, no "all of the above" or "none of the above".
- Do not give away an answer through another question, and do not repeat the same fact.
- Keep every choice short. Make the four choices clearly different from each other.
- For each question give "explanation": one to three sentences saying why the correct choice is right, using only story facts.
- Put the correct choice anywhere; the order will be shuffled afterwards.
- If you do not reliably know this specific book's actual story, set "canWrite" to false, give a short "reason", and return an empty "questions" array. Do not guess, invent plot details, or write questions from the title alone. A wrong "correct" answer is worse than no quiz.`;

export const quizGeminiSchema = {
	type: "object",
	properties: {
		canWrite: {
			type: "boolean",
			description:
				"True only if you reliably know this book's actual story well enough to write all questions.",
		},
		reason: {
			type: "string",
			description: "Short reason when canWrite is false; empty otherwise.",
		},
		questions: {
			type: "array",
			items: {
				type: "object",
				properties: {
					question: { type: "string" },
					choices: {
						type: "array",
						items: {
							type: "object",
							properties: {
								text: { type: "string" },
								isCorrect: { type: "boolean" },
							},
							required: ["text", "isCorrect"],
						},
					},
					explanation: { type: "string" },
				},
				required: ["question", "choices", "explanation"],
			},
		},
	},
	required: ["canWrite", "reason", "questions"],
} as const;

const draftSchema = z.object({
	canWrite: z.boolean(),
	reason: z.string().default(""),
	questions: z.array(
		z.object({
			question: z.string(),
			explanation: z.string(),
			choices: z.array(z.object({ text: z.string(), isCorrect: z.boolean() })),
		}),
	),
});

export type GeneratedQuizQuestion = {
	question: string;
	explanation: string;
	choices: { text: string; isCorrect: boolean }[];
};

export type QuizDraftResult =
	| { kind: "ready"; questions: GeneratedQuizQuestion[] }
	| { kind: "declined"; reason: string };

export class QuizDraftInvalidError extends Error {}

/** Throws QuizDraftInvalidError unless the draft satisfies every structural rule. */
function validateDraft(
	draft: z.infer<typeof draftSchema>,
): GeneratedQuizQuestion[] {
	if (draft.questions.length !== QUIZ_QUESTION_COUNT) {
		throw new QuizDraftInvalidError(
			`Expected ${QUIZ_QUESTION_COUNT} questions, got ${draft.questions.length}`,
		);
	}

	return draft.questions.map((item, index) => {
		const question = item.question.trim();
		const explanation = item.explanation.trim();
		const choices = item.choices.map((choice) => ({
			text: choice.text.trim(),
			isCorrect: choice.isCorrect,
		}));
		const where = `Question ${index + 1}`;

		if (!question || !explanation) {
			throw new QuizDraftInvalidError(`${where} is missing text`);
		}
		if (choices.length !== QUIZ_CHOICE_COUNT) {
			throw new QuizDraftInvalidError(
				`${where} needs ${QUIZ_CHOICE_COUNT} choices`,
			);
		}
		if (choices.some((choice) => !choice.text)) {
			throw new QuizDraftInvalidError(`${where} has an empty choice`);
		}
		const distinct = new Set(
			choices.map((choice) => choice.text.toLowerCase()),
		);
		if (distinct.size !== QUIZ_CHOICE_COUNT) {
			throw new QuizDraftInvalidError(`${where} has duplicate choices`);
		}
		if (choices.filter((choice) => choice.isCorrect).length !== 1) {
			throw new QuizDraftInvalidError(
				`${where} needs exactly one correct choice`,
			);
		}

		return { question, explanation, choices: shuffle(choices) };
	});
}

function shuffle<T>(items: T[]): T[] {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
	}
	return copy;
}

export function buildQuizUserPrompt(book: {
	title: string;
	authors: string[];
	publishedIn: number;
	excerpt: string | null;
}): string {
	const lines = [
		`Title: ${book.title}`,
		`Author(s): ${book.authors.join(", ")}`,
		`First published: ${book.publishedIn}`,
	];
	const excerpt = book.excerpt?.replace(/\s+/g, " ").trim();
	if (excerpt) {
		lines.push(
			`Short description (context only, do not quote it): ${excerpt.slice(0, EXCERPT_MAX_CHARS)}`,
		);
	}
	lines.push("", "Write the quiz now.");
	return lines.join("\n");
}

/** Whether the AI is configured at all. */
export function quizGenerationAvailable(): boolean {
	return getGeminiConfig() != null;
}

/**
 * Asks the model once, retrying one time when the structure is invalid.
 * Throws on transport errors or when both drafts are invalid.
 */
export async function generateQuizDraft(book: {
	title: string;
	authors: string[];
	publishedIn: number;
	excerpt: string | null;
}): Promise<{ result: QuizDraftResult; model: string }> {
	const config = getGeminiConfig();
	if (!config) {
		throw new Error("Gemini is not configured");
	}

	const userPrompt = buildQuizUserPrompt(book);
	let lastError: unknown;

	for (let attempt = 0; attempt < 2; attempt += 1) {
		try {
			const draft = await geminiGenerateJson({
				config,
				systemInstruction: QUIZ_SYSTEM_PROMPT,
				userPrompt,
				responseSchema: quizGeminiSchema,
				parse: (value) => draftSchema.parse(value),
				temperature: 0.3,
				timeoutMs: GENERATION_TIMEOUT_MS,
			});

			if (!draft.canWrite) {
				return {
					result: { kind: "declined", reason: draft.reason.trim() },
					model: config.model,
				};
			}

			return {
				result: { kind: "ready", questions: validateDraft(draft) },
				model: config.model,
			};
		} catch (error) {
			lastError = error;
			const retryable =
				error instanceof QuizDraftInvalidError || error instanceof z.ZodError;
			if (!retryable) {
				break;
			}
		}
	}

	throw lastError instanceof Error
		? lastError
		: new Error("Quiz generation failed");
}
