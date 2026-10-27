/** Mirrors `NotificationKind` in Prisma — keep in sync with `notification.prisma`. */
export const NOTIFICATION_KINDS = [
	"member_posted",
	"comment_on_your_post",
	"reply_to_your_comment",
	"reaction_on_your_post",
	"member_feedback_on_book",
	"book_added_to_library",
	"sitting_poll_started",
	"sitting_poll_closed",
	"participant_finished_book",
	"sitting_finished",
	"book_requested",
	"document_submitted",
	"document_approved",
	"document_rejected",
	"achievement_earned",
	"shelf_invitation",
	"shelf_collaboration",
	"poll_vote",
	"poll_ended",
	"sitting_member_joined",
	"sitting_invitation",
	"sitting_added",
	"sitting_welcome",
	"view_milestone",
	"views_digest",
	"reading_behind",
	"mention",
	"author_new_book",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_KIND_GROUPS = {
	club: [
		"member_posted",
		"member_feedback_on_book",
		"book_added_to_library",
	] as const satisfies readonly NotificationKind[],
	personal: [
		"comment_on_your_post",
		"reply_to_your_comment",
		"reaction_on_your_post",
		"document_approved",
		"document_rejected",
		"achievement_earned",
		"shelf_invitation",
		"shelf_collaboration",
		"poll_vote",
		"poll_ended",
		"sitting_invitation",
		"sitting_added",
		"sitting_welcome",
		"view_milestone",
		"views_digest",
		"reading_behind",
		"mention",
		"author_new_book",
	] as const satisfies readonly NotificationKind[],
	sitting: [
		"sitting_poll_started",
		"sitting_poll_closed",
		"participant_finished_book",
		"sitting_finished",
		"sitting_member_joined",
	] as const satisfies readonly NotificationKind[],
	admin: [
		"book_requested",
		"document_submitted",
	] as const satisfies readonly NotificationKind[],
};

/** Push (ntfy) on by default for these kinds when preferences are first created. */
export const NOTIFICATION_KINDS_PUSH_ENABLED_BY_DEFAULT = [
	"book_added_to_library",
	"comment_on_your_post",
	"mention",
	"author_new_book",
	"reply_to_your_comment",
	"shelf_invitation",
	"sitting_invitation",
	"sitting_poll_started",
	"sitting_poll_closed",
	"sitting_finished",
	"book_requested",
	"document_submitted",
	"document_approved",
	"document_rejected",
] as const satisfies readonly NotificationKind[];

/** Off for everyone until they switch it on (in Notification settings). */
export const NOTIFICATION_KINDS_OFF_BY_DEFAULT = [
	"reading_behind",
] as const satisfies readonly NotificationKind[];

const offByDefaultSet = new Set<string>(NOTIFICATION_KINDS_OFF_BY_DEFAULT);

export function isOffByDefaultKind(kind: NotificationKind): boolean {
	return offByDefaultSet.has(kind);
}

const pushEnabledByDefaultSet = new Set<string>(
	NOTIFICATION_KINDS_PUSH_ENABLED_BY_DEFAULT,
);

export function defaultPushEnabledForKind(kind: NotificationKind): boolean {
	return pushEnabledByDefaultSet.has(kind);
}

export function isNotificationKind(value: string): value is NotificationKind {
	return (NOTIFICATION_KINDS as readonly string[]).includes(value);
}
