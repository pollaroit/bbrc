import {
	adminDocumentRangeableFields,
	adminDocumentSortableFields,
} from "@bbrc/api/modules/admin/admin-document.listing";
import type {
	GetAdminDocumentOverviewInput,
	ListAdminDocumentsInput,
} from "@bbrc/api/modules/admin/admin-document.schema";
import { DocumentStatusSchema } from "@bbrc/api/modules/document/document.schema";
import {
	DOCUMENT_LANGUAGE_CODES,
	DOCUMENT_LANGUAGE_LABELS,
} from "@bbrc/shared";
import {
	parseAsArrayOf,
	parseAsInteger,
	parseAsString,
	parseAsStringLiteral,
	useQueryStates,
} from "nuqs";
import { buildListCallInput } from "@/lib/listing/build-list-call-input";
import type { FieldLabels } from "@/lib/listing/labels";
import {
	booleanFilterParser,
	createRangeByParser,
	createSortByParser,
	createStringLiteralArrayParser,
	rangeMaxParser,
	rangeMinParser,
	searchParser,
	sortDirectionParser,
} from "@/lib/listing/parsers";

export { DOCUMENT_LANGUAGE_CODES, DOCUMENT_LANGUAGE_LABELS };

export const adminDocumentStatuses = DocumentStatusSchema.options;

export const adminDocumentStatusLabels = {
	pending: "Pending",
	approved: "Approved",
	rejected: "Rejected",
} as const satisfies Record<(typeof adminDocumentStatuses)[number], string>;

export const adminDocumentSortByLabels = {
	createdAt: "Submitted",
	updatedAt: "Updated",
	name: "Name",
	status: "Status",
	language: "Language",
	"book.title": "Book title",
	"user.username": "Submitter",
} as const satisfies FieldLabels<(typeof adminDocumentSortableFields)[number]>;

export const adminDocumentRangeByLabels = {
	createdAt: "Submitted",
	updatedAt: "Updated",
} as const satisfies FieldLabels<(typeof adminDocumentRangeableFields)[number]>;

export const adminDocumentsListingSearchParams = {
	search: searchParser.withOptions({ shallow: false, throttleMs: 400 }),
	page: parseAsInteger.withDefault(1).withOptions({ shallow: false }),
	limit: parseAsInteger.withDefault(20).withOptions({ shallow: false }),
	sortBy: createSortByParser(adminDocumentSortableFields)
		.withDefault("createdAt")
		.withOptions({ shallow: false }),
	sortDirection: sortDirectionParser.withDefault("desc").withOptions({
		shallow: false,
	}),
	rangeBy: createRangeByParser(adminDocumentRangeableFields).withOptions({
		shallow: false,
	}),
	rangeMin: rangeMinParser.withOptions({ shallow: false }),
	rangeMax: rangeMaxParser.withOptions({ shallow: false }),
	statuses: parseAsArrayOf(
		parseAsStringLiteral(adminDocumentStatuses),
	).withOptions({ shallow: false }),
	languages: createStringLiteralArrayParser(
		DOCUMENT_LANGUAGE_CODES,
	).withOptions({ shallow: false }),
	bookSlugs: parseAsArrayOf(parseAsString).withOptions({ shallow: false }),
	submitterUsernames: parseAsArrayOf(parseAsString).withOptions({
		shallow: false,
	}),
	hasAcceptanceNotes: booleanFilterParser.withOptions({ shallow: false }),
	hasRejectionReason: booleanFilterParser.withOptions({ shallow: false }),
};

export function useAdminDocumentsListingSearchParams() {
	return useQueryStates(adminDocumentsListingSearchParams, { shallow: false });
}

export type AdminDocumentsListingSearchParams = ReturnType<
	typeof useAdminDocumentsListingSearchParams
>[0];

function buildAdminDocumentFilterCallInput(
	params: AdminDocumentsListingSearchParams,
) {
	return buildListCallInput({
		search: params.search,
		rangeBy: params.rangeBy,
		rangeMin: params.rangeMin,
		rangeMax: params.rangeMax,
		statuses: params.statuses,
		languages: params.languages,
		bookSlugs: params.bookSlugs,
		submitterUsernames: params.submitterUsernames,
		hasAcceptanceNotes: params.hasAcceptanceNotes,
		hasRejectionReason: params.hasRejectionReason,
	});
}

export function toAdminDocumentsOverviewCallInput(
	params: AdminDocumentsListingSearchParams,
): GetAdminDocumentOverviewInput {
	return buildAdminDocumentFilterCallInput(
		params,
	) as GetAdminDocumentOverviewInput;
}

export function toAdminDocumentsListCallInput(
	params: AdminDocumentsListingSearchParams,
): ListAdminDocumentsInput {
	return {
		...buildAdminDocumentFilterCallInput(params),
		page: params.page,
		limit: params.limit,
		sortBy: params.sortBy ?? "createdAt",
		sortDirection: params.sortDirection ?? "desc",
	} as ListAdminDocumentsInput;
}
