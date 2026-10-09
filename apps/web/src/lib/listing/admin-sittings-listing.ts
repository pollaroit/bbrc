import { adminSittingSortableFields } from "@bbrc/api/modules/admin/admin-sitting.listing";
import type {
	GetAdminSittingOverviewInput,
	ListAdminSittingsInput,
} from "@bbrc/api/modules/admin/admin-sitting.schema";
import { sittingRangeableFields } from "@bbrc/api/modules/sitting/sitting.listing";
import { SittingStatusSchema } from "@bbrc/schemas";
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
	rangeMaxParser,
	rangeMinParser,
	searchParser,
	sortDirectionParser,
} from "@/lib/listing/parsers";

export const adminSittingStatuses = SittingStatusSchema.options;

export const adminSittingSortByLabels = {
	createdAt: "Started",
	updatedAt: "Updated",
	deadline: "Deadline",
	status: "Status",
	"participants._count": "Participants",
	readingStartedAt: "Reading started",
	midtermAt: "Midterm",
	"postAttachments._count": "Post attachments",
	pollVotes: "Poll votes",
} as const satisfies FieldLabels<(typeof adminSittingSortableFields)[number]>;

export const adminSittingRangeByLabels = {
	createdAt: "Started",
	updatedAt: "Updated",
	deadline: "Deadline",
} as const satisfies FieldLabels<(typeof sittingRangeableFields)[number]>;

const minCountParsers = {
	minParticipants: parseAsInteger.withOptions({ shallow: false }),
	minActiveParticipants: parseAsInteger.withOptions({ shallow: false }),
	minPollVotes: parseAsInteger.withOptions({ shallow: false }),
	minPollOptions: parseAsInteger.withOptions({ shallow: false }),
	minCompletedParticipants: parseAsInteger.withOptions({ shallow: false }),
	minDnfParticipants: parseAsInteger.withOptions({ shallow: false }),
	minPostAttachments: parseAsInteger.withOptions({ shallow: false }),
	minSelectedBookPages: parseAsInteger.withOptions({ shallow: false }),
	maxSelectedBookPages: parseAsInteger.withOptions({ shallow: false }),
} as const;

export const adminSittingsListingSearchParams = {
	search: searchParser.withOptions({ shallow: false, throttleMs: 400 }),
	page: parseAsInteger.withDefault(1).withOptions({ shallow: false }),
	limit: parseAsInteger.withDefault(20).withOptions({ shallow: false }),
	sortBy: createSortByParser(adminSittingSortableFields)
		.withDefault("createdAt")
		.withOptions({ shallow: false }),
	sortDirection: sortDirectionParser.withDefault("desc").withOptions({
		shallow: false,
	}),
	rangeBy: createRangeByParser(sittingRangeableFields).withOptions({
		shallow: false,
	}),
	rangeMin: rangeMinParser.withOptions({ shallow: false }),
	rangeMax: rangeMaxParser.withOptions({ shallow: false }),
	statuses: parseAsArrayOf(
		parseAsStringLiteral(adminSittingStatuses),
	).withOptions({ shallow: false }),
	ongoingOnly: booleanFilterParser.withOptions({ shallow: false }),
	hasSelectedBook: booleanFilterParser.withOptions({ shallow: false }),
	telegramPollAnnounced: booleanFilterParser.withOptions({ shallow: false }),
	deadlineOverdue: booleanFilterParser.withOptions({ shallow: false }),
	hasMidtermScheduled: booleanFilterParser.withOptions({ shallow: false }),
	participantUsernames: parseAsArrayOf(parseAsString).withOptions({
		shallow: false,
	}),
	...minCountParsers,
};

export function useAdminSittingsListingSearchParams() {
	return useQueryStates(adminSittingsListingSearchParams, { shallow: false });
}

export type AdminSittingsListingSearchParams = ReturnType<
	typeof useAdminSittingsListingSearchParams
>[0];

function buildAdminSittingFilterCallInput(
	params: AdminSittingsListingSearchParams,
) {
	return buildListCallInput({
		search: params.search,
		rangeBy: params.rangeBy,
		rangeMin: params.rangeMin,
		rangeMax: params.rangeMax,
		statuses: params.statuses,
		ongoingOnly: params.ongoingOnly,
		hasSelectedBook: params.hasSelectedBook,
		telegramPollAnnounced: params.telegramPollAnnounced,
		deadlineOverdue: params.deadlineOverdue,
		hasMidtermScheduled: params.hasMidtermScheduled,
		participantUsernames: params.participantUsernames,
		minParticipants: params.minParticipants,
		minActiveParticipants: params.minActiveParticipants,
		minPollVotes: params.minPollVotes,
		minPollOptions: params.minPollOptions,
		minCompletedParticipants: params.minCompletedParticipants,
		minDnfParticipants: params.minDnfParticipants,
		minPostAttachments: params.minPostAttachments,
		minSelectedBookPages: params.minSelectedBookPages,
		maxSelectedBookPages: params.maxSelectedBookPages,
	});
}

export function toAdminSittingsOverviewCallInput(
	params: AdminSittingsListingSearchParams,
): GetAdminSittingOverviewInput {
	return buildAdminSittingFilterCallInput(
		params,
	) as GetAdminSittingOverviewInput;
}

export function toAdminSittingsListCallInput(
	params: AdminSittingsListingSearchParams,
): ListAdminSittingsInput {
	return {
		...buildAdminSittingFilterCallInput(params),
		page: params.page,
		limit: params.limit,
		sortBy: params.sortBy ?? "createdAt",
		sortDirection: params.sortDirection ?? "desc",
	} as ListAdminSittingsInput;
}
