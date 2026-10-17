import { formatUserStatsPeriodTitle, parseUserStatsPeriod } from "@bbrc/shared";
import { truncateDescription } from "@/lib/seo";

export function userStatsMetadataFromSearchParams(
	displayName: string,
	username: string,
	searchParams: Record<string, string | string[] | undefined>,
) {
	const pick = (key: string) => {
		const value = searchParams[key];
		return typeof value === "string" ? value : undefined;
	};

	let periodTitle = `${displayName.endsWith("s") ? `${displayName}'` : `${displayName}'s`} Life in Books`;
	try {
		const period = parseUserStatsPeriod({
			periodType: pick("period_type"),
			period: pick("period"),
			periodStart: pick("period_start"),
			periodEnd: pick("period_end"),
		});
		periodTitle = formatUserStatsPeriodTitle(displayName, period);
	} catch {
		// keep life default
	}

	const title = `${periodTitle} · ${displayName}`;
	const description = `${periodTitle} on BBRC for @${username}: books and pages read, reading pace, ratings, publication years, top authors and countries, world map, and club activity (posts, feedback, shelves, sittings).`;

	return {
		title,
		description: truncateDescription(description),
		periodTitle,
	};
}
