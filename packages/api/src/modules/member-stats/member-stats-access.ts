import { NO_STATS_ACCESS, type StatsAccess, type Viewer } from "@bbrc/shared";
import {
	type ActivityAccess,
	type ActivityOwner,
	decideActivityAccess,
} from "../reading-activity/reading-activity-access";
import { mayViewSection } from "../user/member-access";

/*
 * What a viewer may see of a member's stats. A member's stats are built from their
 * reads, reviews, reading activity, goals and profile, and each follows its own
 * level (there is no separate "stats" setting). A section the viewer may not see is
 * left out, not blanked, so nothing about it leaks; the page says once that some
 * sections are private. Counts that include everyone (ranks, club totals) are a
 * separate matter and never come through here.
 */

export type MemberStatsAccess =
	/** Blocked either way, or no such member: reads as not found. */
	| { kind: "unavailable" }
	/** A private profile seen by someone who is not a friend: nothing but the profile card. */
	| { kind: "closed" }
	| {
			kind: "open";
			access: StatsAccess;
			/** Reading activity: the five totals only, or the full view with what it may show. */
			activity: Extract<ActivityAccess, { kind: "numbers" | "full" }>;
	  };

export function decideMemberStatsAccess(
	viewer: Viewer,
	owner: ActivityOwner,
): MemberStatsAccess {
	const activity = decideActivityAccess(viewer, owner);
	if (activity.kind === "unavailable") return { kind: "unavailable" };
	if (activity.kind === "closed") return { kind: "closed" };

	return {
		kind: "open",
		activity,
		access: {
			...NO_STATS_ACCESS,
			profile: true,
			reads: mayViewSection(viewer, owner, "reads"),
			reviews: mayViewSection(viewer, owner, "reviews"),
			goals: mayViewSection(viewer, owner, "goals"),
			// "numbers" still shows the five totals (streak included), so the section exists.
			readingActivity: true,
		},
	};
}
