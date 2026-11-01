import {
	AUDIT_ACTION_KEYS,
	AUDIT_SORT_FIELDS,
	AUDIT_TARGET_TYPES,
} from "@bbrc/shared";
import {
	parseAsArrayOf,
	parseAsInteger,
	parseAsString,
	parseAsStringLiteral,
	useQueryStates,
} from "nuqs";
import type { FieldLabels } from "@/lib/listing/labels";
import {
	createRangeByParser,
	createSortByParser,
	rangeMaxParser,
	rangeMinParser,
	searchParser,
	sortDirectionParser,
} from "@/lib/listing/parsers";

export const auditSortByLabels = {
	createdAt: "When",
	action: "Action",
	actor: "Who did it",
} as const satisfies FieldLabels<(typeof AUDIT_SORT_FIELDS)[number]>;

export const auditTargetTypeLabels: Record<
	(typeof AUDIT_TARGET_TYPES)[number],
	string
> = {
	member: "Member",
	author: "Author",
	book: "Book",
	edition: "Edition",
	series: "Series",
	sitting: "Sitting",
	document: "Document",
	fact: "Fact",
	quiz: "Quiz",
	achievement: "Achievement",
	request: "Book request",
	report: "Report",
	open_library_work: "Open Library work",
	system: "System",
};

/** All state of the audit page lives in the address. */
export const auditListingSearchParams = {
	search: searchParser.withOptions({ shallow: false, throttleMs: 400 }),
	page: parseAsInteger.withDefault(1).withOptions({ shallow: false }),
	sortBy: createSortByParser(AUDIT_SORT_FIELDS).withOptions({ shallow: false }),
	sortDirection: sortDirectionParser.withOptions({ shallow: false }),
	rangeBy: createRangeByParser(["createdAt"] as const).withOptions({
		shallow: false,
	}),
	rangeMin: rangeMinParser.withOptions({ shallow: false }),
	rangeMax: rangeMaxParser.withOptions({ shallow: false }),
	actions: parseAsArrayOf(parseAsStringLiteral(AUDIT_ACTION_KEYS)).withOptions({
		shallow: false,
	}),
	/** Usernames of the members who did it. */
	actors: parseAsArrayOf(parseAsString).withOptions({ shallow: false }),
	targetType: parseAsStringLiteral(AUDIT_TARGET_TYPES).withOptions({
		shallow: false,
	}),
};

export function useAuditListingSearchParams() {
	return useQueryStates(auditListingSearchParams, { shallow: false });
}
