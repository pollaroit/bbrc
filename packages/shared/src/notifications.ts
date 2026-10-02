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
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_KIND_LABELS: Record<NotificationKind, string> = {
	member_posted: "New club post",
	comment_on_your_post: "Comment on your post",
	reply_to_your_comment: "Reply to your comment",
	reaction_on_your_post: "Reaction on your post",
	member_feedback_on_book: "Book feedback",
	book_added_to_library: "Book added to library",
	sitting_poll_started: "Sitting poll started",
	sitting_poll_closed: "Sitting poll closed",
	participant_finished_book: "Participant finished reading",
	sitting_finished: "Sitting finished",
	book_requested: "Book requested",
};

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
	] as const satisfies readonly NotificationKind[],
	sitting: [
		"sitting_poll_started",
		"sitting_poll_closed",
		"participant_finished_book",
		"sitting_finished",
	] as const satisfies readonly NotificationKind[],
	admin: ["book_requested"] as const satisfies readonly NotificationKind[],
};

/** Push (ntfy) on by default for these kinds when preferences are first created. */
export const NOTIFICATION_KINDS_PUSH_ENABLED_BY_DEFAULT = [
	"book_added_to_library",
	"comment_on_your_post",
	"reply_to_your_comment",
	"sitting_poll_started",
	"sitting_poll_closed",
	"sitting_finished",
	"book_requested",
] as const satisfies readonly NotificationKind[];

const pushEnabledByDefaultSet = new Set<string>(
	NOTIFICATION_KINDS_PUSH_ENABLED_BY_DEFAULT,
);

export function defaultPushEnabledForKind(kind: NotificationKind): boolean {
	return pushEnabledByDefaultSet.has(kind);
}

export function isNotificationKind(value: string): value is NotificationKind {
	return (NOTIFICATION_KINDS as readonly string[]).includes(value);
}
