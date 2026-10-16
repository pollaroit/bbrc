import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";

export const userStatsPeriodTypes = [
	"life",
	"year",
	"month",
	"custom",
] as const;

export type UserStatsPeriodType = (typeof userStatsPeriodTypes)[number];

export function useUserStatsSearchParams() {
	return useQueryStates({
		period_type: parseAsStringLiteral(userStatsPeriodTypes).withDefault("life"),
		period: parseAsString,
		period_start: parseAsString,
		period_end: parseAsString,
	});
}

export function userStatsQueryInput(
	username: string,
	params: {
		period_type: UserStatsPeriodType;
		period: string | null;
		period_start: string | null;
		period_end: string | null;
	},
) {
	return {
		username,
		periodType: params.period_type,
		...(params.period_type === "year" || params.period_type === "month"
			? { period: params.period ?? undefined }
			: {}),
		...(params.period_type === "custom"
			? {
					periodStart: params.period_start ?? undefined,
					periodEnd: params.period_end ?? undefined,
				}
			: {}),
	};
}
