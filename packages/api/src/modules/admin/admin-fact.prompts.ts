import type { FactCategory } from "./admin-fact.schema";

export const ADMIN_FACT_SYSTEM_PROMPT = `You write short, accurate facts for a book and reading club app (BBRC).
Topics: general knowledge, history, science, literature, philosophy — tied to culture and learning, not clickbait.
Rules:
- The fact must be verifiable; prefer well-known references.
- source must be a real HTTPS URL that supports the claim (prefer Wikipedia, .edu, museums, major publishers).
- Do not invent URLs. If unsure, lower confidence to "low".
- No politics-as-punditry, no medical advice, no hate.
- Write in plain English for a curious adult reader.`;

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
		lines.push(`Preferred category: ${input.category}.`);
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
		"Return JSON only with fields: fact, category, source, confidence.",
	);

	return lines.join("\n");
}
