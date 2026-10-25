import type { BookEditionItem } from "@bbrc/api/modules/book-edition/book-edition.schema";
import type { EditionCore } from "@bbrc/api/modules/edition/edition.schema";
import { parseEditionKey } from "@bbrc/shared";
import type { ReadingEditionChoice } from "@/components/blocks/reading/reading-edition-picker";
import { editionLabelFromParts } from "@/lib/book-edition/edition-meta";

/**
 * The edition page knows a member edition by its public key (`m-…`); the
 * reading and admin calls need its database id. This finds the matching row in
 * `bookEdition.list`: by the public id when the list carries it, else by ISBN,
 * else by the details that make an edition unique enough.
 */
export function findMemberEdition(
	items: BookEditionItem[],
	edition: Pick<
		EditionCore,
		"key" | "isbn13" | "pages" | "publishedYear" | "publishers" | "title"
	>,
): BookEditionItem | null {
	const parsed = parseEditionKey(edition.key);
	if (parsed?.kind !== "member") return null;

	const withPublicId = items.find((item) => item.publicId === parsed.publicId);
	if (withPublicId) return withPublicId;

	if (edition.isbn13) {
		const byIsbn = items.find((item) => item.isbn13 === edition.isbn13);
		if (byIsbn) return byIsbn;
	}
	return (
		items.find(
			(item) =>
				item.pages === edition.pages &&
				(item.publishedYear ?? null) === (edition.publishedYear ?? null) &&
				(item.publisher ?? null) === (edition.publishers[0] ?? null) &&
				(item.title ?? null) === (edition.title ?? null),
		) ?? null
	);
}

/** What a reading or a read stores for this edition. */
export function editionChoiceFor(
	edition: EditionCore,
	member: BookEditionItem | null,
): ReadingEditionChoice {
	if (edition.source === "member") {
		return {
			editionOlid: null,
			editionCoverId: null,
			editionLabel: null,
			bookEditionId: member?.id ?? null,
			totalPages: edition.pages,
		};
	}
	return {
		editionOlid: edition.key,
		editionCoverId:
			edition.covers.find((cover) => cover.coverId != null)?.coverId ?? null,
		editionLabel: editionLabelFromParts({
			title: edition.title,
			publisher: edition.publishers[0],
			year: edition.publishedYear,
			language: edition.language,
		}),
		bookEditionId: null,
		totalPages: edition.pages,
	};
}

/** The page address of a member edition from the list (its own `m-…`, or the Open Library edition it is linked to). */
export function memberEditionKeyOf(item: BookEditionItem): string {
	return item.key;
}
