import type { UpdateAuthorInput } from "@bbrc/api/modules/author-admin/author-admin.schema";
import { AUTHOR_BIO_MAX_LENGTH } from "@bbrc/shared";
import z from "zod";

export const AUTHOR_GENDER_OPTIONS = [
	{ value: "unknown", label: "Not known" },
	{ value: "female", label: "Female" },
	{ value: "male", label: "Male" },
	{ value: "non_binary", label: "Non-binary" },
	{ value: "other", label: "Other" },
] as const;

export type AuthorGenderValue = (typeof AUTHOR_GENDER_OPTIONS)[number]["value"];

const WHOLE = /^-?\d+$/;

function optionalWhole(label: string, min: number, max: number, hint: string) {
	return z
		.string()
		.trim()
		.refine(
			(value) =>
				value === "" ||
				(WHOLE.test(value) && Number(value) >= min && Number(value) <= max),
			{ message: `${label} must be a whole number ${hint}.` },
		);
}

const optionalLink = z
	.string()
	.trim()
	.max(2048, "That link is too long.")
	.refine(
		(value) => {
			if (value === "") return true;
			if (!value.startsWith("https://")) return false;
			try {
				new URL(value);
				return true;
			} catch {
				return false;
			}
		},
		{ message: "Use a full link that starts with https://." },
	);

export const AuthorEditFormSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(1, "Enter the author's name.")
			.max(200, "The name can be up to 200 characters."),
		sortName: z
			.string()
			.trim()
			.max(200, "The sort name can be up to 200 characters."),
		bio: z
			.string()
			.refine((value) => value.trim().length <= AUTHOR_BIO_MAX_LENGTH, {
				error: (issue) =>
					`The bio is ${String(issue.input).trim().length.toLocaleString("en-US")} characters; the limit is ${AUTHOR_BIO_MAX_LENGTH.toLocaleString("en-US")}. Shorten it to save.`,
			}),
		birthYear: optionalWhole("Birth year", -3000, 2200, "like 1821"),
		birthMonth: optionalWhole("Birth month", 1, 12, "from 1 to 12"),
		birthDay: optionalWhole("Birth day", 1, 31, "from 1 to 31"),
		deathYear: optionalWhole("Death year", -3000, 2200, "like 1881"),
		deathMonth: optionalWhole("Death month", 1, 12, "from 1 to 12"),
		deathDay: optionalWhole("Death day", 1, 31, "from 1 to 31"),
		birthPlace: z.string().trim().max(200, "Up to 200 characters."),
		deathPlace: z.string().trim().max(200, "Up to 200 characters."),
		nationalities: z.array(z.string()).max(8, "Choose at most 8 countries."),
		gender: z.enum(["unknown", "female", "male", "non_binary", "other"]),
		wikipediaUrl: optionalLink,
		goodreadsUrl: optionalLink,
		websiteUrl: optionalLink,
		openLibraryId: z
			.string()
			.trim()
			.refine((value) => value === "" || /^OL\d+A$/.test(value), {
				message: "Open Library author ids look like OL26320A.",
			}),
		wikidataId: z
			.string()
			.trim()
			.refine((value) => value === "" || /^Q\d+$/.test(value), {
				message: "Wikidata ids look like Q892.",
			}),
	})
	.superRefine((value, ctx) => {
		for (const prefix of ["birth", "death"] as const) {
			const year = value[`${prefix}Year`];
			const month = value[`${prefix}Month`];
			const day = value[`${prefix}Day`];
			if (month !== "" && year === "") {
				ctx.addIssue({
					code: "custom",
					path: [`${prefix}Year`],
					message: `Add the ${prefix} year too, or clear the month.`,
				});
			}
			if (day !== "" && month === "") {
				ctx.addIssue({
					code: "custom",
					path: [`${prefix}Month`],
					message: `Add the ${prefix} month too, or clear the day.`,
				});
			}
		}
		if (
			value.birthYear !== "" &&
			value.deathYear !== "" &&
			WHOLE.test(value.birthYear) &&
			WHOLE.test(value.deathYear) &&
			Number(value.deathYear) < Number(value.birthYear)
		) {
			ctx.addIssue({
				code: "custom",
				path: ["deathYear"],
				message: "The death year can't be before the birth year.",
			});
		}
	});

export type AuthorEditFormValues = z.infer<typeof AuthorEditFormSchema>;

/** The parts of `authorAdmin.getForEdit` the form shows. */
export type AuthorEditSource = {
	name: string;
	sortName: string | null;
	bio: string | null;
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
	openLibraryId: string | null;
	wikidataId: string | null;
};

const text = (value: string | number | null) =>
	value == null ? "" : String(value);

export function authorToFormValues(
	author: AuthorEditSource,
): AuthorEditFormValues {
	return {
		name: author.name,
		sortName: text(author.sortName),
		bio: text(author.bio),
		birthYear: text(author.birthYear),
		birthMonth: text(author.birthMonth),
		birthDay: text(author.birthDay),
		deathYear: text(author.deathYear),
		deathMonth: text(author.deathMonth),
		deathDay: text(author.deathDay),
		birthPlace: text(author.birthPlace),
		deathPlace: text(author.deathPlace),
		nationalities: [...author.nationalities],
		gender: author.gender,
		wikipediaUrl: text(author.wikipediaUrl),
		goodreadsUrl: text(author.goodreadsUrl),
		websiteUrl: text(author.websiteUrl),
		openLibraryId: text(author.openLibraryId),
		wikidataId: text(author.wikidataId),
	};
}

function toDate(year: string, month: string, day: string) {
	if (year === "") return null;
	return {
		year: Number(year),
		month: month === "" ? null : Number(month),
		day: day === "" ? null : Number(day),
	};
}

const orNull = (value: string) => (value.trim() === "" ? null : value.trim());

/**
 * Only what changed: every field sent is marked "added by an admin" (and then is no longer
 * overwritten by a refresh), so untouched fields must not be sent.
 */
export function toUpdateInput(
	id: string,
	values: AuthorEditFormValues,
	initial: AuthorEditFormValues,
): UpdateAuthorInput | null {
	const patch: UpdateAuthorInput = { id };
	let changed = false;
	const set = <K extends keyof UpdateAuthorInput>(
		key: K,
		value: UpdateAuthorInput[K],
	) => {
		patch[key] = value;
		changed = true;
	};

	if (values.name.trim() !== initial.name.trim())
		set("name", values.name.trim());
	if (values.sortName.trim() !== initial.sortName.trim())
		set("sortName", orNull(values.sortName));
	if (values.bio.trim() !== initial.bio.trim()) set("bio", orNull(values.bio));

	const birthKey = (v: AuthorEditFormValues) =>
		`${v.birthYear}|${v.birthMonth}|${v.birthDay}`;
	if (birthKey(values) !== birthKey(initial))
		set("birth", toDate(values.birthYear, values.birthMonth, values.birthDay));
	const deathKey = (v: AuthorEditFormValues) =>
		`${v.deathYear}|${v.deathMonth}|${v.deathDay}`;
	if (deathKey(values) !== deathKey(initial))
		set("death", toDate(values.deathYear, values.deathMonth, values.deathDay));

	if (values.birthPlace.trim() !== initial.birthPlace.trim())
		set("birthPlace", orNull(values.birthPlace));
	if (values.deathPlace.trim() !== initial.deathPlace.trim())
		set("deathPlace", orNull(values.deathPlace));
	if (values.nationalities.join(",") !== initial.nationalities.join(","))
		set("nationalities", values.nationalities);
	if (values.gender !== initial.gender) set("gender", values.gender);
	if (values.wikipediaUrl.trim() !== initial.wikipediaUrl.trim())
		set("wikipediaUrl", orNull(values.wikipediaUrl));
	if (values.goodreadsUrl.trim() !== initial.goodreadsUrl.trim())
		set("goodreadsUrl", orNull(values.goodreadsUrl));
	if (values.websiteUrl.trim() !== initial.websiteUrl.trim())
		set("websiteUrl", orNull(values.websiteUrl));
	if (values.openLibraryId.trim() !== initial.openLibraryId.trim())
		set("openLibraryId", orNull(values.openLibraryId));
	if (values.wikidataId.trim() !== initial.wikidataId.trim())
		set("wikidataId", orNull(values.wikidataId));

	return changed ? patch : null;
}

/** True when the form holds something different from what was loaded (what Save would send). */
export function hasAuthorEditChanges(
	values: AuthorEditFormValues,
	initial: AuthorEditFormValues,
): boolean {
	return toUpdateInput("", values, initial) !== null;
}
