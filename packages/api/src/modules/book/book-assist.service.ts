import type { Database } from "@bbrc/db";
import { ORPCError } from "@orpc/server";
import { getGeminiConfig } from "../../lib/gemini/config";
import { geminiGenerateJson } from "../../lib/gemini/generate-json";
import type {
	FindSimilarBooksOutput,
	SuggestBookDetailsInput,
	SuggestBookDetailsOutput,
} from "./book-assist.schema";

const ARTICLES = new Set([
	"the",
	"a",
	"an",
	"of",
	"and",
	"de",
	"la",
	"le",
	"el",
]);

function normalize(value: string) {
	return value
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[^\p{L}\p{N}\s]/gu, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function tokens(value: string) {
	return normalize(value)
		.split(" ")
		.filter((word) => word.length > 0 && !ARTICLES.has(word));
}

function levenshteinRatio(a: string, b: string) {
	if (a === b) return 1;
	if (!a || !b) return 0;
	const prev = Array.from({ length: b.length + 1 }, (_, index) => index);
	for (let i = 1; i <= a.length; i++) {
		let diagonal = prev[0] ?? 0;
		prev[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const above = prev[j] ?? 0;
			prev[j] = Math.min(
				above + 1,
				(prev[j - 1] ?? 0) + 1,
				diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
			);
			diagonal = above;
		}
	}
	return 1 - (prev[b.length] ?? 0) / Math.max(a.length, b.length);
}

function jaccard(a: string[], b: string[]) {
	const left = new Set(a);
	const right = new Set(b);
	if (left.size === 0 || right.size === 0) return 0;
	let shared = 0;
	for (const word of left) if (right.has(word)) shared += 1;
	return shared / (left.size + right.size - shared);
}

function authorOverlap(a: string[], b: string[]) {
	const left = a.map(normalize);
	const right = b.map(normalize);
	return left.some((name) =>
		right.some(
			(other) =>
				name === other ||
				(name.length > 3 &&
					other.length > 3 &&
					(name.includes(other) || other.includes(name))),
		),
	);
}

/**
 * Books already in the library that look like the one being added, even when
 * Open Library gave them a different id (another edition, a translated title).
 * The score blends how alike the titles are with whether an author matches.
 */
export async function findSimilarBooks(
	db: Database,
	input: { title: string; authors: string[]; olid?: string },
): Promise<FindSimilarBooksOutput> {
	const words = tokens(input.title).filter((word) => word.length >= 4);
	const candidates = await db.book.findMany({
		where: {
			...(input.olid ? { NOT: { olid: input.olid } } : {}),
			OR: [
				...words.slice(0, 4).map((word) => ({
					title: { contains: word, mode: "insensitive" as const },
				})),
				...input.authors.slice(0, 3).map((author) => ({
					authors: { has: author },
				})),
			],
		},
		select: { slug: true, title: true, authors: true, coverId: true },
		take: 60,
	});

	const wanted = normalize(input.title);
	const wantedTokens = tokens(input.title);
	const scored = candidates
		.map((book) => {
			const titleScore = Math.max(
				levenshteinRatio(wanted, normalize(book.title)),
				jaccard(wantedTokens, tokens(book.title)),
			);
			const sameAuthor = authorOverlap(input.authors, book.authors);
			const similarity = Math.round(
				Math.min(1, titleScore * 0.8 + (sameAuthor ? 0.2 : 0)) * 100,
			);
			return { book, similarity, sameAuthor, titleScore };
		})
		// Similar enough to be worth a warning.
		.filter(
			(entry) =>
				entry.titleScore >= 0.85 ||
				(entry.sameAuthor && entry.titleScore >= 0.6),
		)
		.sort((a, b) => b.similarity - a.similarity)
		.slice(0, 5);

	return {
		items: scored.map(({ book, similarity }) => ({
			slug: book.slug,
			title: book.title,
			authors: book.authors,
			coverId: book.coverId,
			similarity,
		})),
	};
}

// ── Suggested description and subjects ─────────────────────────────────────

const DETAILS_SYSTEM_PROMPT = `You help an admin fill in a book entry for a reading club library.
Return:
- "excerpt": a neutral, spoiler-free description of 2 to 4 sentences (max 450 characters), in plain English, no marketing language. If an existing description is given, tighten and correct it instead of inventing a new one. Use null if you do not know the book.
- "subjects": up to 8 short subject tags in English (for example "Dystopian fiction", "World War II"). Only tags that clearly fit.
Never invent facts. If unsure, return fewer subjects and a null excerpt.`;

const detailsSchema = {
	type: "object",
	properties: {
		excerpt: { type: "string", nullable: true },
		subjects: { type: "array", items: { type: "string" } },
	},
	required: ["subjects"],
} as const;

function parseDetails(value: unknown): SuggestBookDetailsOutput {
	const raw = value as { excerpt?: unknown; subjects?: unknown };
	const excerpt =
		typeof raw.excerpt === "string" && raw.excerpt.trim()
			? raw.excerpt.trim().slice(0, 600)
			: null;
	const subjects = Array.isArray(raw.subjects)
		? raw.subjects
				.filter((item): item is string => typeof item === "string")
				.map((item) => item.trim())
				.filter(Boolean)
				.slice(0, 8)
		: [];
	return { excerpt, subjects };
}

export async function suggestBookDetails(
	input: SuggestBookDetailsInput,
): Promise<SuggestBookDetailsOutput> {
	const config = getGeminiConfig();
	if (!config) {
		throw new ORPCError("PRECONDITION_FAILED", {
			message: "Gemini is not configured (missing GEMINI_API_KEY).",
		});
	}
	const lines = [
		`Title: ${input.title}`,
		`Authors: ${input.authors.join(", ") || "unknown"}`,
		input.publishedIn ? `First published: ${input.publishedIn}` : null,
		input.excerpt ? `Existing description: ${input.excerpt}` : null,
	].filter(Boolean);
	try {
		return await geminiGenerateJson({
			config,
			systemInstruction: DETAILS_SYSTEM_PROMPT,
			userPrompt: lines.join("\n"),
			responseSchema: detailsSchema,
			parse: parseDetails,
			temperature: 0.3,
			timeoutMs: 20_000,
		});
	} catch (error) {
		throw new ORPCError("BAD_GATEWAY", {
			message: error instanceof Error ? error.message : "Suggestion failed",
		});
	}
}
