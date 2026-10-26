import { AUTHOR_BIO_MAX_LENGTH, normalizeBookCountryCodes } from "@bbrc/shared";
import { getGeminiConfig } from "../gemini/config";
import { geminiGenerateJson } from "../gemini/generate-json";
import type { EnrichableField } from "./fields";
import {
	type AuthorFactValues,
	type AuthorGenderValue,
	parseLooseDate,
	truncateBio,
} from "./parse";

/** One author to ask about: the text we already hold is the ONLY thing the model may use. */
export type AiAuthorInput = {
	id: string;
	name: string;
	/** Fields still empty (only these are asked for). */
	wanted: readonly EnrichableField[];
	/** Source text we already have: bios, Wikipedia extract, short descriptions, our book titles. */
	sourceText: string;
};

export const AUTHOR_AI_SYSTEM_PROMPT = `You fill gaps in author records for a reading club catalog.

You are given, for each author, the SOURCE TEXT we already hold and the list of WANTED fields. Use only what the source text says. Do not use anything you remember about the author, and do not guess.

Rules:
- Return null for a field the source text does not state. null is always better than a guess.
- Never invent dates or places. Dates: "YYYY", "YYYY-MM" or "YYYY-MM-DD" exactly as precise as the text. BC years are negative ("-0384").
- bio: at most ${AUTHOR_BIO_MAX_LENGTH} characters of plain text (no markdown), written only from the source text; null when the text has no biographical content.
- nationalities: ISO 3166-1 alpha-2 codes of modern states, only when the text names the nationality or country of origin. Use GB for the United Kingdom.
- gender: "female", "male", "non_binary" or "other" only when the text clearly states it (pronouns like "she" or "he" count); otherwise null.
- Ask nothing about fields that are not WANTED: return null for them.`;

export function buildAuthorAiPrompt(items: readonly AiAuthorInput[]): string {
	return items
		.map((item, index) =>
			[
				`#${index + 1} id=${item.id}`,
				`Name: ${item.name}`,
				`WANTED: ${item.wanted.join(", ")}`,
				`SOURCE TEXT:\n${item.sourceText.trim().slice(0, 2500) || "(none)"}`,
			].join("\n"),
		)
		.join("\n\n---\n\n");
}

const nullableString = { type: "string", nullable: true } as const;

export const authorAiGeminiSchema = {
	type: "object",
	properties: {
		authors: {
			type: "array",
			items: {
				type: "object",
				properties: {
					id: { type: "string" },
					bio: nullableString,
					birthDate: nullableString,
					deathDate: nullableString,
					birthPlace: nullableString,
					deathPlace: nullableString,
					nationalities: { type: "array", items: { type: "string" } },
					gender: nullableString,
				},
				required: ["id"],
			},
		},
	},
	required: ["authors"],
} as const;

const GENDERS = new Set(["female", "male", "non_binary", "other"]);

function text(value: unknown, max = 200): string | undefined {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	if (!trimmed || /^(unknown|n\/a|none|null)$/i.test(trimmed)) return undefined;
	return trimmed.slice(0, max);
}

/**
 * Checks what the model sent and keeps only valid, WANTED values. Anything off
 * (an impossible date, an unknown country, a field nobody asked for) is dropped.
 */
export function parseAiAuthorFacts(
	json: unknown,
	inputs: readonly AiAuthorInput[],
): Map<string, AuthorFactValues> {
	const wantedById = new Map(inputs.map((item) => [item.id, item.wanted]));
	const out = new Map<string, AuthorFactValues>();
	const rows =
		json && typeof json === "object"
			? (json as { authors?: unknown }).authors
			: undefined;
	if (!Array.isArray(rows)) return out;

	for (const row of rows) {
		if (!row || typeof row !== "object") continue;
		const record = row as Record<string, unknown>;
		const id = typeof record.id === "string" ? record.id : "";
		const wanted = wantedById.get(id);
		if (!wanted) continue;
		const values: AuthorFactValues = {};

		if (wanted.includes("bio")) {
			const bio = text(record.bio, AUTHOR_BIO_MAX_LENGTH * 2);
			if (bio) values.bio = truncateBio(bio);
		}
		for (const [field, key] of [
			["birth", "birthDate"],
			["death", "deathDate"],
		] as const) {
			if (!wanted.includes(field)) continue;
			const raw = text(record[key], 20);
			if (!raw || !/^-?\d{1,4}(-\d{2}){0,2}$/.test(raw)) continue;
			const date = parseLooseDate(raw);
			if (date.year != null) values[field] = date;
		}
		for (const field of ["birthPlace", "deathPlace"] as const) {
			if (!wanted.includes(field)) continue;
			const place = text(record[field]);
			if (place) values[field] = place;
		}
		if (
			wanted.includes("nationalities") &&
			Array.isArray(record.nationalities)
		) {
			const codes = normalizeBookCountryCodes(
				record.nationalities.filter(
					(code): code is string => typeof code === "string",
				),
			);
			if (codes.length > 0) values.nationalities = codes;
		}
		if (wanted.includes("gender")) {
			const gender = text(record.gender, 20)?.toLowerCase();
			if (gender && GENDERS.has(gender)) {
				values.gender = gender as AuthorGenderValue;
			}
		}
		if (Object.keys(values).length > 0) out.set(id, values);
	}

	// A death before the birth is a misreading; keep neither.
	for (const [id, values] of out) {
		const b = values.birth?.year;
		const d = values.death?.year;
		if (b != null && d != null && d < b) {
			delete values.birth;
			delete values.death;
			if (Object.keys(values).length === 0) out.delete(id);
		}
	}
	return out;
}

/** What the real model call looks like, so tests can stand in for it. */
export type AuthorAiRunner = (
	items: readonly AiAuthorInput[],
) => Promise<Map<string, AuthorFactValues>>;

export const geminiAuthorAiRunner: AuthorAiRunner = async (items) => {
	const config = getGeminiConfig();
	if (!config || items.length === 0) return new Map();
	const json = await geminiGenerateJson<unknown>({
		config,
		systemInstruction: AUTHOR_AI_SYSTEM_PROMPT,
		userPrompt: buildAuthorAiPrompt(items),
		responseSchema: authorAiGeminiSchema,
		parse: (value) => value,
		temperature: 0,
		timeoutMs: 60_000,
	});
	return parseAiAuthorFacts(json, items);
};

/** Items that can be asked about at all: no source text and nothing wanted means no call. */
export function aiWorthAsking(item: AiAuthorInput): boolean {
	return item.wanted.length > 0 && item.sourceText.trim().length >= 40;
}
