import type {
	AuthorField,
	AuthorFieldMeta,
	AuthorFieldSource,
} from "@bbrc/shared";
import { toModernCountryCodes } from "./historical-states";
import {
	type AuthorFactValues,
	type AuthorGenderValue,
	hasDate,
	type PartialDate,
	type SourceFacts,
} from "./parse";

/** The columns the pipeline can fill (a subset of what `Author` holds). */
export type AuthorFieldColumns = {
	bio: string | null;
	bioSource: string | null;
	birthYear: number | null;
	birthMonth: number | null;
	birthDay: number | null;
	deathYear: number | null;
	deathMonth: number | null;
	deathDay: number | null;
	birthPlace: string | null;
	deathPlace: string | null;
	nationalities: string[];
	gender: AuthorGenderValue;
	wikipediaUrl: string | null;
	goodreadsUrl: string | null;
	websiteUrl: string | null;
};

/** The fields a source can supply (name, sortName and photo are never filled automatically). */
export const ENRICHABLE_FIELDS = [
	"bio",
	"birth",
	"death",
	"birthPlace",
	"deathPlace",
	"nationalities",
	"gender",
	"wikipediaUrl",
	"goodreadsUrl",
	"websiteUrl",
] as const satisfies readonly AuthorField[];
export type EnrichableField = (typeof ENRICHABLE_FIELDS)[number];

export type ResolvedField = {
	field: EnrichableField;
	source: AuthorFieldSource;
	value: unknown;
};

function valueFor(
	values: AuthorFactValues,
	field: EnrichableField,
): unknown | undefined {
	switch (field) {
		case "birth":
			return hasDate(values.birth) ? values.birth : undefined;
		case "death":
			return hasDate(values.death) ? values.death : undefined;
		case "nationalities": {
			// Whatever the source, only modern countries are stored.
			const codes = toModernCountryCodes(values.nationalities ?? []);
			return codes.length > 0 ? codes : undefined;
		}
		case "gender":
			return values.gender && values.gender !== "unknown"
				? values.gender
				: undefined;
		default: {
			const value = values[field];
			return typeof value === "string" && value.trim() !== ""
				? value
				: undefined;
		}
	}
}

/** For every field, the first source (in the order given) that knows it. */
export function resolveFields(
	sources: readonly SourceFacts[],
): ResolvedField[] {
	const out: ResolvedField[] = [];
	for (const field of ENRICHABLE_FIELDS) {
		for (const { source, values } of sources) {
			const value = valueFor(values, field);
			if (value !== undefined) {
				out.push({ field, source, value });
				break;
			}
		}
	}
	return out;
}

function currentIsEmpty(
	field: EnrichableField,
	current: AuthorFieldColumns,
): boolean {
	switch (field) {
		case "bio":
			return !current.bio?.trim();
		case "birth":
			return current.birthYear == null;
		case "death":
			return current.deathYear == null;
		case "nationalities":
			return current.nationalities.length === 0;
		case "gender":
			return current.gender === "unknown";
		default:
			return !current[field]?.trim();
	}
}

function datePatch(
	prefix: "birth" | "death",
	date: PartialDate,
): Partial<AuthorFieldColumns> {
	return prefix === "birth"
		? { birthYear: date.year, birthMonth: date.month, birthDay: date.day }
		: { deathYear: date.year, deathMonth: date.month, deathDay: date.day };
}

export type FieldPatchOptions = {
	/**
	 * `fill` (first run): only empty fields. `refresh`: also replace fields an earlier run
	 * filled, but never a locked field, and never an admin's own value unless it is named in `only`.
	 */
	mode: "fill" | "refresh";
	/** Restrict to these fields (a refresh of just the bio, say). */
	only?: readonly EnrichableField[];
};

export type FieldPatch = {
	data: Partial<AuthorFieldColumns>;
	meta: AuthorFieldMeta;
	changed: EnrichableField[];
};

/**
 * Decides what to write: pure. Locked fields are never touched; empty fields are filled;
 * on refresh, fields whose source is not "admin" are replaced by fresher data.
 */
export function planFieldPatch(
	current: AuthorFieldColumns,
	meta: AuthorFieldMeta,
	resolved: readonly ResolvedField[],
	options: FieldPatchOptions,
): FieldPatch {
	const data: Partial<AuthorFieldColumns> = {};
	const nextMeta: AuthorFieldMeta = { ...meta };
	const changed: EnrichableField[] = [];

	for (const { field, source, value } of resolved) {
		if (options.only && !options.only.includes(field)) continue;
		const existing = meta[field];
		if (existing?.locked) continue;

		const empty = currentIsEmpty(field, current);
		if (!empty) {
			if (options.mode === "fill") continue;
			const named = options.only?.includes(field) ?? false;
			if (existing?.source === "admin" && !named) continue;
			// A field with no recorded source was filled before provenance existed: leave it alone.
			if (!existing && !named) continue;
		}

		switch (field) {
			case "bio":
				data.bio = value as string;
				data.bioSource = source;
				break;
			case "birth":
				Object.assign(data, datePatch("birth", value as PartialDate));
				break;
			case "death":
				Object.assign(data, datePatch("death", value as PartialDate));
				break;
			case "nationalities":
				data.nationalities = value as string[];
				break;
			case "gender":
				data.gender = value as AuthorGenderValue;
				break;
			default:
				data[field] = value as string;
		}
		nextMeta[field] = { source, ...(existing?.locked ? { locked: true } : {}) };
		changed.push(field);
	}

	return { data, meta: nextMeta, changed };
}

/** The fields still empty after a plan (the ones the AI may be asked about). */
export function fieldsStillEmpty(
	current: AuthorFieldColumns,
	patch: Partial<AuthorFieldColumns>,
	meta: AuthorFieldMeta,
): EnrichableField[] {
	const merged: AuthorFieldColumns = { ...current, ...patch };
	return ENRICHABLE_FIELDS.filter(
		(field) => !meta[field]?.locked && currentIsEmpty(field, merged),
	);
}
