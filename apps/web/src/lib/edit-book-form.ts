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

export const EditBookFormSchema = z.object({
	title: BookSchema.shape.title,
	authorsText: z.string().min(1, "At least one author is required"),
	coverId: z.number().int().nullable(),
	openLibraryRating: z.number().min(0).max(5).nullable(),
	excerpt: z.string().max(4000).nullable(),
	pages: BookSchema.shape.pages,
	publishedIn: BookSchema.shape.publishedIn,
	averageRating: z.number().min(0).max(5).nullable(),
	status: BookStatusSchema,
	readAfterBookSlugs: z.array(z.string()).max(20),
	countries: z.array(z.string()).max(8),
	subjects: z.array(z.string()).max(40),
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
