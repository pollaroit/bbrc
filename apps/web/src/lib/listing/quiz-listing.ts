import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs";
import { searchParser, sortDirectionParser } from "@/lib/listing/parsers";

export const quizSortFields = ["submittedAt", "score"] as const;

export const quizSortLabels = {
	submittedAt: "Date",
	score: "Score",
} as const;

export const quizListingSearchParams = {
	search: searchParser.withOptions({ shallow: true, throttleMs: 400 }),
	sortBy: parseAsStringLiteral(quizSortFields).withDefault("submittedAt"),
	sortDirection: sortDirectionParser.withDefault("desc"),
	page: parseAsInteger.withDefault(1),
};

export function useQuizListingSearchParams() {
	return useQueryStates(quizListingSearchParams);
}
