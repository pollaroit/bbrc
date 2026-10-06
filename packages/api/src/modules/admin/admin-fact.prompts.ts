import { FACT_CATEGORIES, type FactCategory } from "./admin-fact.schema";

export const ADMIN_FACT_SYSTEM_PROMPT = `You write short, accurate facts for BBRC — a book and reading club app.
Audience: curious adults who read fiction and nonfiction.

Coverage: ${FACT_CATEGORIES.join(", ")}. Tie facts to culture, ideas, discovery, and learning — never clickbait.

Rules:
- Each fact must be verifiable; prefer well-known references.
- source must be a real HTTPS URL that supports the claim (Wikipedia, museums, .edu, publishers, reputable journals).
- Do not invent URLs. If unsure, set confidence to "low".
- No pundit politics, no medical advice, no hate or slurs.
- Plain English, 1–3 sentences.
- subcategory: a specific niche label (2–6 words) for internal recommendations, e.g. "ottoman libraries", "cell biology", "persian ghazals". Lowercase is fine. Must differ from the broad category name.`;

export function pickRandomFactCategory(): FactCategory {
	const index = Math.floor(Math.random() * FACT_CATEGORIES.length);
	return FACT_CATEGORIES[index] ?? "general";
}

export function buildAdminFactUserPrompt(input: {
	category?: FactCategory;
	topic?: string;
	avoidFacts?: string[];
	index?: number;
	total?: number;
}): string {
	const lines = ["Generate one new fact for the club reels feed."];

	if (input.index != null && input.total != null) {
		lines.push(`This is pick ${input.index + 1} of ${input.total} in a batch.`);
	}

	if (input.category) {
		lines.push(`Use category: ${input.category}.`);
	} else {
		lines.push(
			`Pick any category from: ${FACT_CATEGORIES.join(", ")} (vary topics across the batch).`,
		);
	}

	if (input.topic) {
		lines.push(`Topic or angle: ${input.topic}`);
	}

	if (input.avoidFacts && input.avoidFacts.length > 0) {
		lines.push(
			"Do not repeat or paraphrase any of these facts already generated in this batch:",
		);
		for (const fact of input.avoidFacts) {
			lines.push(`- ${fact}`);
		}
	}

	lines.push(
		"Return JSON only with fields: fact, category, subcategory, source, confidence.",
	);

	return lines.join("\n");
}
