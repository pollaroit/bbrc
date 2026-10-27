import { normalizeBookCountryCodes } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { appError } from "../../lib/app-error";
import { getGeminiConfig } from "../../lib/gemini/config";
import { geminiGenerateJson } from "../../lib/gemini/generate-json";
import {
	bookOriginCountriesGeminiSchema,
	parseGeminiOriginDraft,
	type SuggestBookOriginCountriesInput,
	type SuggestBookOriginCountriesOutput,
} from "./book-origin.schema";

const BOOK_ORIGIN_SYSTEM_PROMPT = `You classify books by literary country of origin for a reading club catalog.

Given title, authors, publication year, and optional description, return modern sovereign states (ISO 3166-1 alpha-2) whose literature this work belongs to — based on author nationality, birthplace, and literary tradition — NOT where the fiction is set.

Rules:
- Prefer a single country when one author clearly maps to one modern state (e.g. Machiavelli → IT, Dostoevsky → RU).
- Historical states map to today's successor (e.g. Ottoman author often TR, Austro-Hungarian → split by author origin when obvious).
- Use GB for United Kingdom, not UK.
- Use CN for China, US for United States, etc.
- Multiple codes only when multiple authors clearly belong to different modern countries, or the work is unmistakably transnational in authorship.
- If genuinely unknown, return an empty array.`;

function buildBookOriginUserPrompt(
	input: SuggestBookOriginCountriesInput,
): string {
	const lines = [
		`Title: ${input.title}`,
		`Authors: ${input.authors.join(", ")}`,
		`First published (year): ${input.publishedIn}`,
	];
	if (input.excerpt?.trim()) {
		lines.push(`Description: ${input.excerpt.trim()}`);
	}
	return lines.join("\n");
}

function requireGeminiConfig() {
	const config = getGeminiConfig();
	if (!config) {
		throw appError("PRECONDITION_FAILED", "book.aiNotAvailable");
	}
	return config;
}

export async function suggestBookOriginCountries(
	input: SuggestBookOriginCountriesInput,
): Promise<SuggestBookOriginCountriesOutput> {
	try {
		const config = requireGeminiConfig();
		const draft = await geminiGenerateJson({
			config,
			systemInstruction: BOOK_ORIGIN_SYSTEM_PROMPT,
			userPrompt: buildBookOriginUserPrompt(input),
			responseSchema: bookOriginCountriesGeminiSchema,
			parse: parseGeminiOriginDraft,
			temperature: 0.2,
		});

		return {
			countries: normalizeBookCountryCodes(draft.countries),
		};
	} catch (error) {
		if (error instanceof ORPCError) {
			throw error;
		}
		throw appError("BAD_GATEWAY", "book.aiFailed", {
			data: { cause: error instanceof Error ? error.message : undefined },
		});
	}
}
