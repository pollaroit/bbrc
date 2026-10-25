import {
	type TGetBookBySlugOutputSchema,
	UpdateBookInputSchema,
} from "@bbrc/api/modules/book/book.schema";
import { BookSchema, BookStatusSchema } from "@bbrc/schemas";
import type { SeriesPlacementValue } from "@bbrc/shared";
import z from "zod";
import type { AddBookSeriesSelection } from "@/components/blocks/add-book-series-field";
import type { BookCoverValue } from "@/components/blocks/book-cover-field";
import { authorsToText, parseAuthorsText } from "@/lib/add-book-form";

/**
 * Open Library lists dozens of subjects for popular books (most of this
 * catalogue has more than 40), so the cap is generous. It used to be 40, which
 * made saving ANY change to those books fail with a hidden error.
 */
export const MAX_EDIT_SUBJECTS = 200;
export const MAX_EXCERPT_LENGTH = 4000;

export const EditBookFormSchema = z.object({
	title: BookSchema.shape.title,
	authorsText: z.string().min(1, "At least one author is required"),
	coverId: z.number().int().nullable(),
	openLibraryRating: z
		.number("Open Library rating must be a number")
		.min(0, "Open Library rating must be between 0 and 5")
		.max(5, "Open Library rating must be between 0 and 5")
		.nullable(),
	excerpt: z
		.string()
		.refine((value) => value.length <= MAX_EXCERPT_LENGTH, {
			error: (issue) =>
				`The excerpt is ${String(issue.input).length.toLocaleString("en-US")} characters; the limit is ${MAX_EXCERPT_LENGTH.toLocaleString("en-US")}. Shorten it to save.`,
		})
		.nullable(),
	pages: z
		.number("Enter the number of pages")
		.int("Pages must be a whole number")
		.min(1, "Pages must be at least 1"),
	publishedIn: BookSchema.shape.publishedIn,
	averageRating: z
		.number("Club average rating must be a number")
		.min(0, "Club average rating must be between 0 and 5")
		.max(5, "Club average rating must be between 0 and 5")
		.nullable(),
	status: BookStatusSchema,
	readAfterBookSlugs: z
		.array(z.string())
		.max(20, "A book can have at most 20 books to read first"),
	countries: z.array(z.string()).max(8, "Choose at most 8 countries"),
	subjects: z
		.array(z.string())
		.max(
			MAX_EDIT_SUBJECTS,
			`A book can have at most ${MAX_EDIT_SUBJECTS} subjects. Remove some to save.`,
		),
});

export type EditBookFormValues = z.infer<typeof EditBookFormSchema>;

export function bookToEditFormValues(
	book: TGetBookBySlugOutputSchema,
): EditBookFormValues {
	return {
		title: book.title,
		authorsText: authorsToText(book.authors),
		coverId: book.coverId ?? null,
		openLibraryRating: book.openLibraryRating ?? null,
		excerpt: book.excerpt ?? null,
		pages: book.pages,
		publishedIn: book.publishedIn,
		averageRating: book.averageRating ?? null,
		status: book.status,
		readAfterBookSlugs: book.readAfterBooks.map((item) => item.slug),
		countries: book.countries ?? [],
		subjects: book.subjects ?? [],
	};
}

// ── Series ─────────────────────────────────────────────────────────────────

/** The series the book is in now, as the series field wants it (null = none). */
export function bookToSeriesSelection(
	book: Pick<TGetBookBySlugOutputSchema, "series">,
): AddBookSeriesSelection | null {
	return book.series
		? { kind: "existing", slug: book.series.slug, title: book.series.title }
		: null;
}

/** The book's current place, so the picker starts where the book is. */
export function bookToSeriesPlacement(
	book: Pick<TGetBookBySlugOutputSchema, "series">,
): SeriesPlacementValue {
	return { position: book.series?.position ?? null, shiftLater: false };
}

type UpdateBookSeries =
	NonNullable<
		Parameters<typeof UpdateBookInputSchema.parse>[0]
	> extends infer Input
		? Input extends { series?: infer Series }
			? Series
			: never
		: never;

/**
 * What to send as `series` (see the header of add-book-series-field.tsx):
 * unchanged → `undefined` (leave it out), cleared → `null`, an existing series →
 * its slug with the place, a new series → its draft.
 */
export function buildSeriesUpdate(params: {
	initialSelection: AddBookSeriesSelection | null;
	initialPlacement: SeriesPlacementValue;
	selection: AddBookSeriesSelection | null;
	placement: SeriesPlacementValue;
}): UpdateBookSeries | undefined {
	const { initialSelection, initialPlacement, selection, placement } = params;

	if (selection === null) {
		return initialSelection === null ? undefined : null;
	}
	if (selection.kind === "new") {
		return { newSeries: selection.draft };
	}
	const sameSeries =
		initialSelection?.kind === "existing" &&
		initialSelection.slug === selection.slug;
	if (
		sameSeries &&
		placement.position === initialPlacement.position &&
		!placement.shiftLater
	) {
		return undefined;
	}
	return {
		seriesSlug: selection.slug,
		position: placement.position ?? undefined,
		shiftLater: placement.shiftLater,
	};
}

export function isSeriesChanged(params: {
	initialSelection: AddBookSeriesSelection | null;
	initialPlacement: SeriesPlacementValue;
	selection: AddBookSeriesSelection | null;
	placement: SeriesPlacementValue;
}): boolean {
	return buildSeriesUpdate(params) !== undefined;
}

// ── Cover ──────────────────────────────────────────────────────────────────

/**
 * The cover part of the update call:
 * - a new upload → only `customCoverUrl` (the server gives it its own id);
 * - the saved upload dropped → `customCoverUrl: null` and the Open Library id picked, if any;
 * - another Open Library cover → just `coverId`;
 * - nothing changed → nothing.
 */
export function buildCoverUpdate(
	initialCoverId: number | null,
	cover: BookCoverValue,
): { coverId?: number; customCoverUrl?: string | null } {
	if (cover.customCoverUrl) {
		return { customCoverUrl: cover.customCoverUrl };
	}
	if (cover.removeUploaded) {
		return {
			customCoverUrl: null,
			...(cover.coverId != null && cover.coverId > 0
				? { coverId: cover.coverId }
				: {}),
		};
	}
	if (cover.coverId != null && cover.coverId !== initialCoverId) {
		return { coverId: cover.coverId };
	}
	return {};
}

export function isCoverChanged(
	initialCoverId: number | null,
	cover: BookCoverValue,
): boolean {
	return Object.keys(buildCoverUpdate(initialCoverId, cover)).length > 0;
}

// ── The update call ────────────────────────────────────────────────────────

export type EditBookUpdateExtras = {
	initialCoverId: number | null;
	cover: BookCoverValue;
	initialSubjects: string[];
	series?: UpdateBookSeries;
};

export function toUpdateBookInput(
	slug: string,
	values: EditBookFormValues,
	extras: EditBookUpdateExtras,
) {
	const subjectsChanged =
		values.subjects.length !== extras.initialSubjects.length ||
		values.subjects.some(
			(subject, index) => subject !== extras.initialSubjects[index],
		);

	return UpdateBookInputSchema.parse({
		slug,
		title: values.title,
		authors: parseAuthorsText(values.authorsText),
		openLibraryRating: values.openLibraryRating ?? undefined,
		excerpt: values.excerpt ?? undefined,
		pages: values.pages,
		publishedIn: values.publishedIn,
		averageRating: values.averageRating ?? undefined,
		status: values.status,
		readAfterBookSlugs: values.readAfterBookSlugs,
		countries: values.countries,
		...(subjectsChanged ? { subjects: values.subjects } : {}),
		...buildCoverUpdate(extras.initialCoverId, extras.cover),
		...(extras.series !== undefined ? { series: extras.series } : {}),
	});
}

// ── Showing what is wrong ──────────────────────────────────────────────────

type EditField = keyof EditBookFormValues;

/** In the order they appear on the page; the first one with a problem is shown first. */
const FIELD_ORDER: EditField[] = [
	"title",
	"authorsText",
	"excerpt",
	"pages",
	"publishedIn",
	"openLibraryRating",
	"averageRating",
	"status",
	"subjects",
	"countries",
	"readAfterBookSlugs",
	"coverId",
];

const FIELD_LABELS: Record<EditField, string> = {
	title: "Title",
	authorsText: "Authors",
	excerpt: "Excerpt",
	pages: "Pages",
	publishedIn: "Published in",
	openLibraryRating: "Open Library rating",
	averageRating: "Club average rating",
	status: "Club reading status",
	subjects: "Subjects",
	countries: "Countries",
	readAfterBookSlugs: "Reading order",
	coverId: "Cover",
};

/** Which section of the workspace holds the field. */
export const EDIT_FIELD_SECTION: Record<EditField, string> = {
	title: "details",
	authorsText: "details",
	excerpt: "details",
	pages: "details",
	publishedIn: "details",
	openLibraryRating: "details",
	averageRating: "details",
	status: "classification",
	subjects: "classification",
	countries: "classification",
	readAfterBookSlugs: "reading-order",
	coverId: "cover",
};

export type EditFormProblem = {
	field: EditField;
	label: string;
	message: string;
	section: string;
};

type ErrorLike = { message?: unknown } | undefined;

/** Every problem in the form, in page order, each with a plain sentence. */
export function editFormProblems(
	errors: Partial<Record<EditField, unknown>>,
): EditFormProblem[] {
	const problems: EditFormProblem[] = [];
	for (const field of FIELD_ORDER) {
		const error = errors[field] as ErrorLike;
		if (!error) continue;
		const message =
			typeof error.message === "string" && error.message
				? error.message
				: `${FIELD_LABELS[field]} is not valid`;
		problems.push({
			field,
			label: FIELD_LABELS[field],
			message,
			section: EDIT_FIELD_SECTION[field],
		});
	}
	return problems;
}

/** The sentence for the toast: the first problem, and how many more there are. */
export function editFormToast(problems: EditFormProblem[]): string {
	const first = problems[0];
	if (!first) return "Something in the form is not valid.";
	const message = first.message.startsWith(first.label)
		? first.message
		: `${first.label}: ${first.message}`;
	return problems.length > 1
		? `${message} (${problems.length - 1} more to fix)`
		: message;
}
