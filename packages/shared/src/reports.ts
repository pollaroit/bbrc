/** What can be reported. A later PR (quotes, events, GIF posts) adds its kind here and in the target resolver. */
export const REPORT_TARGETS = [
	"post",
	"comment",
	"review",
	"shelf",
	"user",
] as const;
export type ReportTargetKind = (typeof REPORT_TARGETS)[number];

export const REPORT_TARGET_LABELS: Record<ReportTargetKind, string> = {
	post: "Post",
	comment: "Comment",
	review: "Review",
	shelf: "Shelf",
	user: "Profile",
};

export const REPORT_REASONS = [
	"spam",
	"harassment",
	"inappropriate",
	"spoiler",
	"other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
	spam: "Spam",
	harassment: "Harassment",
	inappropriate: "Inappropriate",
	spoiler: "Unmarked spoiler",
	other: "Something else",
};

/** One line under each reason in the report dialog, so a member picks the right one. */
export const REPORT_REASON_DESCRIPTIONS: Record<ReportReason, string> = {
	spam: "Ads, scams, or the same message posted again and again.",
	harassment: "Insults, threats, or targeting a member.",
	inappropriate: "Offensive, graphic, or not for this club.",
	spoiler: "Gives away a book's plot without a spoiler warning.",
	other: "Something that does not fit the options above.",
};

export const REPORT_STATUSES = ["open", "resolved", "dismissed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** What an admin did. `note` and `reopen` are logged but never close a report. */
export const REPORT_ACTIONS = [
	"dismiss",
	"delete_content",
	"reopen",
	"note",
] as const;
export type ReportActionKind = (typeof REPORT_ACTIONS)[number];

export const REPORT_ACTION_LABELS: Record<ReportActionKind, string> = {
	dismiss: "Dismissed",
	delete_content: "Content deleted",
	reopen: "Reopened",
	note: "Note added",
};

/** Actions that close the report. */
export const CLOSING_REPORT_ACTIONS = [
	"dismiss",
	"delete_content",
] as const satisfies readonly ReportActionKind[];

/** What the admin queue can be sorted by. Items are grouped by what was reported. */
export const REPORT_SORT_FIELDS = [
	"date",
	"reports",
	"member_reports",
] as const;
export type ReportSortField = (typeof REPORT_SORT_FIELDS)[number];

export const REPORT_SORT_FIELD_LABELS: Record<ReportSortField, string> = {
	date: "Latest report",
	reports: "Number of reports",
	member_reports: "Reports against the member",
};

export type ReportSortDirection = "asc" | "desc";

export const REPORT_NOTE_MAX = 300;
export const REPORT_ADMIN_NOTE_MAX = 500;
export const REPORTS_PER_DAY = 20;

export function isClosingReportAction(action: ReportActionKind): boolean {
	return (CLOSING_REPORT_ACTIONS as readonly string[]).includes(action);
}

/** The status a report takes after an action, or `null` when the action leaves it as it is. */
export function statusAfterAction(
	action: ReportActionKind,
): ReportStatus | null {
	if (action === "reopen") return "open";
	if (action === "dismiss") return "dismissed";
	if (isClosingReportAction(action)) return "resolved";
	return null;
}

/** Whether an action may be taken on a report in this state. Closing an already closed report is refused (reopen first). */
export function canApplyReportAction(
	status: ReportStatus,
	action: ReportActionKind,
): boolean {
	if (action === "note") return true;
	if (action === "reopen") return status !== "open";
	return status === "open";
}

/** Actions that make no sense for a kind of target (a profile has no content to delete). */
export function reportActionsFor(
	target: ReportTargetKind,
): readonly ReportActionKind[] {
	return REPORT_ACTIONS.filter(
		(action) => !(target === "user" && action === "delete_content"),
	);
}

/**
 * How a reporter's earlier reports ended. Shown to admins so they can judge a
 * reporter; nothing is limited automatically.
 */
export function reporterTrack(counts: {
	resolved: number;
	dismissed: number;
}): {
	closed: number;
	dismissedShare: number | null;
	label: string;
} {
	const closed = counts.resolved + counts.dismissed;
	if (closed === 0) {
		return { closed, dismissedShare: null, label: "No closed reports yet" };
	}
	const share = counts.dismissed / closed;
	return {
		closed,
		dismissedShare: share,
		label: `${counts.dismissed} of ${closed} dismissed`,
	};
}

/** True once a reporter has used today's allowance. */
export function reportLimitReached(reportsToday: number): boolean {
	return reportsToday >= REPORTS_PER_DAY;
}

export function reportNotificationText(
	status: Exclude<ReportStatus, "open">,
	targetLabel: string,
): { title: string; body: string } {
	if (status === "dismissed") {
		return {
			title: "We looked at your report",
			body: `The moderators reviewed the ${targetLabel.toLowerCase()} you reported and decided no action was needed. Thank you for letting us know.`,
		};
	}
	return {
		title: "We acted on your report",
		body: `The moderators reviewed the ${targetLabel.toLowerCase()} you reported and took action. Thank you for helping keep the club kind.`,
	};
}

type SortableReportGroup = {
	latestAt: Date;
	count: number;
	/** Every report ever filed against the owner, across all their content. */
	ownerReports: number;
};

/**
 * Orders queue items by a field and direction. Ties fall back to the newest
 * report (newest first whatever the direction), so the order is always stable.
 */
export function sortReportGroups<T extends SortableReportGroup>(
	groups: readonly T[],
	sortBy: ReportSortField,
	direction: ReportSortDirection,
): T[] {
	const sign = direction === "asc" ? -1 : 1;
	const newest = (a: T, b: T) => b.latestAt.getTime() - a.latestAt.getTime();
	const key = (g: T) =>
		sortBy === "reports"
			? g.count
			: sortBy === "member_reports"
				? g.ownerReports
				: g.latestAt.getTime();
	return [...groups].sort((a, b) => {
		const diff = (key(b) - key(a)) * sign;
		return diff || newest(a, b);
	});
}
