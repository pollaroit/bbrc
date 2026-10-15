import { OpenLibraryEditionLanguageSchema } from "@bbrc/api/modules/read/read.schema";
import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs";
import { searchParser } from "@/lib/listing/parsers";

export const bookEditionLanguageFilterValues = [
	"any",
	...OpenLibraryEditionLanguageSchema.options.filter(
		(value) => value !== "any",
	),
] as const;

export type BookEditionLanguageFilter =
	(typeof bookEditionLanguageFilterValues)[number];

export const bookEditionLanguageLabels = {
	any: "All languages",
	eng: "English",
	tur: "Turkish",
	aze: "Azerbaijani",
	rus: "Russian",
} as const satisfies Record<BookEditionLanguageFilter, string>;

export const bookEditionsListingSearchParams = {
	search: searchParser.withOptions({ shallow: false, throttleMs: 400 }),
	language: parseAsStringLiteral(bookEditionLanguageFilterValues)
		.withDefault("any")
		.withOptions({ shallow: false }),
	page: parseAsInteger.withDefault(1).withOptions({ shallow: false }),
};

export function useBookEditionsListingSearchParams() {
	return useQueryStates(bookEditionsListingSearchParams, { shallow: false });
}
