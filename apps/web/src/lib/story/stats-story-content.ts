import { getMemberStatsOverview } from "@bbrc/api/modules/member-stats/member-stats-overview.service";
import { getMemberStatsTaste } from "@bbrc/api/modules/member-stats/member-stats-taste.service";
import { loadViewer } from "@bbrc/api/modules/visibility/viewer";
import { memberStatsShareFacts, type StatsShareFacts } from "@bbrc/shared";
import { auth, db } from "@/services";

/**
 * The facts for a member's stats picture, or null when the asker is not that member. Only
 * the member can ask for their own picture, so a username never confirms what is private.
 */
export async function resolveStatsStoryContent(
	username: string,
	period: URLSearchParams,
	headers: Headers,
	covers: number,
): Promise<StatsShareFacts | null> {
	const session = await auth.api.getSession({ headers });
	if (!session?.user || session.user.username !== username) return null;

	const periodType = period.get("period_type");
	const input = {
		username,
		periodType: (["life", "none", "year", "month", "custom"].includes(
			periodType ?? "",
		)
			? periodType
			: "life") as "life" | "none" | "year" | "month" | "custom",
		period: period.get("period") ?? undefined,
		periodStart: period.get("period_start") ?? undefined,
		periodEnd: period.get("period_end") ?? undefined,
	};

	try {
		const viewer = await loadViewer(db, session);
		const [overview, taste] = await Promise.all([
			getMemberStatsOverview(db, viewer, input),
			getMemberStatsTaste(db, viewer, input),
		]);
		return memberStatsShareFacts(
			{
				title: overview.title,
				periodLabel: overview.periodLabel,
				member: {
					name: overview.member.name,
					username: overview.member.username,
				},
				scoreboard: overview.scoreboard,
				books: overview.booksRead.books,
				rank: overview.rank,
				topAuthor: taste.authors.byCount[0]?.label ?? null,
			},
			{ covers },
		);
	} catch {
		return null;
	}
}
