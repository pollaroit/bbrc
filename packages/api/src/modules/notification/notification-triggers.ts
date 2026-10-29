import type { Database } from "@bbrc/db";
import { fetchOpenLibraryWorkTitle } from "../../lib/open-library/work-titles";
import { activeParticipationWhere } from "../sitting/participation-active";
import {
	dispatchNotification,
	listActiveMemberUserIds,
	listAdminUserIds,
	listSittingParticipantUserIds,
} from "./notification.service";

function memberDisplayName(user: {
	name: string | null;
	username: string;
}): string {
	const name = user.name?.trim();
	return name && name.length > 0 ? name : user.username;
}

export async function notifyMemberPosted(
	db: Database,
	authorId: string,
	postSlug: string,
	/** Members who already get a "mentioned you" notice for this post. */
	alsoExclude: string[] = [],
): Promise<void> {
	const [author, recipientUserIds] = await Promise.all([
		db.user.findUnique({
			where: { id: authorId },
			select: { name: true, username: true },
		}),
		listActiveMemberUserIds(db),
	]);

	if (!author) {
		return;
	}

	await dispatchNotification(db, {
		kind: "member_posted",
		recipientUserIds,
		excludeUserIds: [authorId, ...alsoExclude],
		title: "New club post",
		body: `${memberDisplayName(author)} shared a new post.`,
		href: `/posts/${postSlug}`,
	});
}

export async function notifyCommentOnYourPost(
	db: Database,
	postSlug: string,
	commentAuthorId: string,
	/** Members who already get a "mentioned you" notice for this comment. */
	alsoExclude: string[] = [],
): Promise<void> {
	const post = await db.post.findUnique({
		where: { slug: postSlug },
		select: {
			authorId: true,
			author: { select: { name: true, username: true } },
		},
	});

	if (!post || post.authorId === commentAuthorId) {
		return;
	}

	const commentAuthor = await db.user.findUnique({
		where: { id: commentAuthorId },
		select: { name: true, username: true },
	});

	if (!commentAuthor) {
		return;
	}

	await dispatchNotification(db, {
		kind: "comment_on_your_post",
		recipientUserIds: [post.authorId],
		excludeUserIds: [commentAuthorId, ...alsoExclude],
		title: "New comment on your post",
		body: `${memberDisplayName(commentAuthor)} commented on your post.`,
		href: `/posts/${postSlug}`,
	});
}

export async function notifyReplyToYourComment(
	db: Database,
	postSlug: string,
	commentSlug: string,
	replyAuthorId: string,
	parentAuthorId: string | null,
	/** Members who already get a "mentioned you" notice for this reply. */
	alsoExclude: string[] = [],
): Promise<void> {
	if (!parentAuthorId || parentAuthorId === replyAuthorId) {
		return;
	}

	const replyAuthor = await db.user.findUnique({
		where: { id: replyAuthorId },
		select: { name: true, username: true },
	});

	if (!replyAuthor) {
		return;
	}

	await dispatchNotification(db, {
		kind: "reply_to_your_comment",
		recipientUserIds: [parentAuthorId],
		excludeUserIds: [replyAuthorId, ...alsoExclude],
		title: "Reply to your comment",
		body: `${memberDisplayName(replyAuthor)} replied to your comment.`,
		href: `/posts/${postSlug}#comment-${commentSlug}`,
	});
}

export async function notifyReactionOnYourPost(
	db: Database,
	postSlug: string,
	reactorUserId: string,
): Promise<void> {
	const post = await db.post.findUnique({
		where: { slug: postSlug },
		select: { authorId: true },
	});

	if (!post || post.authorId === reactorUserId) {
		return;
	}

	const reactor = await db.user.findUnique({
		where: { id: reactorUserId },
		select: { name: true, username: true },
	});

	if (!reactor) {
		return;
	}

	await dispatchNotification(db, {
		kind: "reaction_on_your_post",
		recipientUserIds: [post.authorId],
		excludeUserIds: [reactorUserId],
		title: "Reaction on your post",
		body: `${memberDisplayName(reactor)} liked your post.`,
		href: `/posts/${postSlug}`,
	});
}

export async function notifyMemberFeedbackOnBook(
	db: Database,
	bookSlug: string,
	authorId: string,
	/** Members who already get a "mentioned you" notice for this review. */
	alsoExclude: string[] = [],
): Promise<void> {
	const [author, book, recipientUserIds] = await Promise.all([
		db.user.findUnique({
			where: { id: authorId },
			select: { name: true, username: true },
		}),
		db.book.findUnique({
			where: { slug: bookSlug },
			select: { title: true },
		}),
		listActiveMemberUserIds(db),
	]);

	if (!author || !book) {
		return;
	}

	await dispatchNotification(db, {
		kind: "member_feedback_on_book",
		recipientUserIds,
		excludeUserIds: [authorId, ...alsoExclude],
		title: "New book feedback",
		body: `${memberDisplayName(author)} reviewed “${book.title}”.`,
		href: `/books/${bookSlug}`,
	});
}

export async function notifyBookRequested(
	db: Database,
	_requestId: string,
	requesterUserId: string,
	olid: string,
	storedTitle?: string | null,
): Promise<void> {
	const requester = await db.user.findUnique({
		where: { id: requesterUserId },
		select: { name: true, username: true },
	});

	if (!requester) {
		return;
	}

	const trimmedStored = storedTitle?.trim();
	const workTitle =
		trimmedStored && trimmedStored.length > 0
			? trimmedStored
			: await fetchOpenLibraryWorkTitle(olid);
	const titleLabel = workTitle ?? olid;
	const recipientUserIds = await listAdminUserIds(db);

	await dispatchNotification(db, {
		kind: "book_requested",
		recipientUserIds,
		excludeUserIds: [requesterUserId],
		title: "Book requested",
		body: `${memberDisplayName(requester)} requested “${titleLabel}”.`,
		href: `/books/new?olid=${encodeURIComponent(olid)}`,
	});
}

export async function notifyDocumentSubmitted(
	db: Database,
	_documentId: string,
	submitterUserId: string,
	bookSlug: string,
	bookTitle: string,
): Promise<void> {
	const submitter = await db.user.findUnique({
		where: { id: submitterUserId },
		select: { name: true, username: true },
	});

	if (!submitter) {
		return;
	}

	const recipientUserIds = await listAdminUserIds(db);

	await dispatchNotification(db, {
		kind: "document_submitted",
		recipientUserIds,
		excludeUserIds: [submitterUserId],
		title: "Document submitted",
		body: `${memberDisplayName(submitter)} submitted a document for “${bookTitle}”.`,
		href: `/books/${bookSlug}`,
	});
}

export async function notifyDocumentApproved(
	db: Database,
	authorUserId: string,
	bookSlug: string,
	bookTitle: string,
): Promise<void> {
	await dispatchNotification(db, {
		kind: "document_approved",
		recipientUserIds: [authorUserId],
		title: "Document approved",
		body: `Your document for “${bookTitle}” was approved.`,
		href: `/books/${bookSlug}`,
	});
}

export async function notifyDocumentRejected(
	db: Database,
	authorUserId: string,
	bookSlug: string,
	bookTitle: string,
	reason: string,
): Promise<void> {
	await dispatchNotification(db, {
		kind: "document_rejected",
		recipientUserIds: [authorUserId],
		title: "Document rejected",
		body: `Your document for “${bookTitle}” was rejected: ${reason}`,
		href: `/books/${bookSlug}`,
	});
}

export async function notifyBookAddedToLibrary(
	db: Database,
	bookSlug: string,
	options?: { onlyUserIds: string[] },
): Promise<void> {
	const book = await db.book.findUnique({
		where: { slug: bookSlug },
		select: { title: true },
	});

	if (!book) {
		return;
	}

	const recipientUserIds = options
		? options.onlyUserIds
		: await listActiveMemberUserIds(db);

	await dispatchNotification(db, {
		kind: "book_added_to_library",
		recipientUserIds,
		title: "Book added to library",
		body: `“${book.title}” was added to the club library.`,
		href: `/books/${bookSlug}`,
	});
}

/**
 * Tells members who follow one of the book's authors, once each even when they follow
 * several. Never the admin who added the book.
 */
export async function notifyFollowersOfNewBook(
	db: Database,
	bookSlug: string,
	options: { excludeUserIds?: string[] } = {},
): Promise<void> {
	const book = await db.book.findUnique({
		where: { slug: bookSlug },
		select: {
			title: true,
			authorLinks: {
				orderBy: { position: "asc" },
				select: {
					author: {
						select: {
							name: true,
							followers: {
								where: { targetType: "author" },
								select: { followerId: true },
							},
						},
					},
				},
			},
		},
	});
	if (!book) {
		return;
	}

	const activeMemberIds = new Set(await listActiveMemberUserIds(db));
	const excluded = new Set(options.excludeUserIds ?? []);
	const authorNamesByFollower = new Map<string, string[]>();
	for (const link of book.authorLinks) {
		for (const { followerId } of link.author.followers) {
			if (!activeMemberIds.has(followerId) || excluded.has(followerId)) {
				continue;
			}
			const names = authorNamesByFollower.get(followerId) ?? [];
			names.push(link.author.name);
			authorNamesByFollower.set(followerId, names);
		}
	}

	// One notification per distinct wording, so a follower of two authors gets a single one.
	const followersByTitle = new Map<string, string[]>();
	for (const [followerId, names] of authorNamesByFollower) {
		const label =
			names.length <= 2 ? names.join(" and ") : `${names[0]} and others`;
		const title = `A new book by ${label}`;
		const list = followersByTitle.get(title) ?? [];
		list.push(followerId);
		followersByTitle.set(title, list);
	}

	for (const [title, recipientUserIds] of followersByTitle) {
		await dispatchNotification(db, {
			kind: "author_new_book",
			recipientUserIds,
			title,
			body: `“${book.title}” was added to the club library.`,
			href: `/books/${bookSlug}`,
		});
	}
}

export async function notifySittingPollStarted(
	db: Database,
	sittingSlug: string,
): Promise<void> {
	const recipientUserIds = await listSittingParticipantUserIds(
		await sittingIdBySlug(db, sittingSlug),
		db,
	);

	await dispatchNotification(db, {
		kind: "sitting_poll_started",
		recipientUserIds,
		title: "Sitting poll started",
		body: "Vote for the next club read before the deadline.",
		href: `/sittings/${sittingSlug}`,
	});
}

export async function notifySittingPollClosed(
	db: Database,
	sittingSlug: string,
	bookTitle: string,
): Promise<void> {
	const recipientUserIds = await listSittingParticipantUserIds(
		await sittingIdBySlug(db, sittingSlug),
		db,
	);

	await dispatchNotification(db, {
		kind: "sitting_poll_closed",
		recipientUserIds,
		title: "Poll closed — reading starts",
		body: `The club will read “${bookTitle}”.`,
		href: `/sittings/${sittingSlug}`,
	});
}

export async function notifySittingFinished(
	db: Database,
	sittingSlug: string,
): Promise<void> {
	const recipientUserIds = await listSittingParticipantUserIds(
		await sittingIdBySlug(db, sittingSlug),
		db,
	);

	await dispatchNotification(db, {
		kind: "sitting_finished",
		recipientUserIds,
		title: "Sitting finished",
		body: "Reading time is over. Share your feedback on the book.",
		href: `/sittings/${sittingSlug}`,
	});
}

export async function notifyParticipantFinishedBook(
	db: Database,
	sittingSlug: string,
	completedUserId: string,
): Promise<void> {
	const sitting = await db.sitting.findUnique({
		where: { slug: sittingSlug },
		select: { id: true },
	});

	if (!sitting) {
		return;
	}

	const completedUser = await db.user.findUnique({
		where: { id: completedUserId },
		select: { name: true, username: true },
	});

	if (!completedUser) {
		return;
	}

	const recipientUserIds = (
		await listSittingParticipantUserIds(sitting.id, db)
	).filter((id) => id !== completedUserId);

	await dispatchNotification(db, {
		kind: "participant_finished_book",
		recipientUserIds,
		excludeUserIds: [completedUserId],
		title: "Participant finished reading",
		body: `${memberDisplayName(completedUser)} finished the sitting book.`,
		href: `/sittings/${sittingSlug}`,
	});
}

/** Participants who are still reading (not finished, not removed). */
async function listUnfinishedParticipantUserIds(
	db: Database,
	sittingId: string,
): Promise<string[]> {
	const rows = await db.participation.findMany({
		where: {
			sittingId,
			...activeParticipationWhere,
			progress: { in: ["not_started", "in_progress"] },
		},
		select: { userId: true },
	});
	return rows.map((row) => row.userId);
}

/**
 * A new sitting is open: tell the whole club, except the people who already
 * hear about it as participants, and whoever created it.
 */
export async function notifySittingOpened(
	db: Database,
	sittingSlug: string,
	createdById: string | null | undefined,
): Promise<void> {
	const sittingId = await sittingIdBySlug(db, sittingSlug);
	const [everyone, participants] = await Promise.all([
		listActiveMemberUserIds(db),
		listSittingParticipantUserIds(sittingId, db),
	]);

	await dispatchNotification(db, {
		kind: "sitting_opened",
		recipientUserIds: everyone,
		excludeUserIds: [...(createdById ? [createdById] : []), ...participants],
		title: "A new sitting is open",
		body: "Join the sitting and vote for the next club read.",
		href: `/sittings/${sittingSlug}`,
	});
}

/** Halfway through reading: a nudge to the people who have not finished. */
export async function notifySittingMidtermCheckin(
	db: Database,
	sittingSlug: string,
	bookTitle: string,
): Promise<void> {
	const sittingId = await sittingIdBySlug(db, sittingSlug);
	await dispatchNotification(db, {
		kind: "sitting_midterm_checkin",
		recipientUserIds: await listUnfinishedParticipantUserIds(db, sittingId),
		title: "Halfway through the sitting",
		body: `How is “${bookTitle}” going? Update your page so the club can see.`,
		href: `/sittings/${sittingSlug}`,
	});
}

/** A day before the deadline, to the people who have not finished. */
export async function notifySittingDeadline24h(
	db: Database,
	sittingSlug: string,
	bookTitle: string,
): Promise<void> {
	const sittingId = await sittingIdBySlug(db, sittingSlug);
	await dispatchNotification(db, {
		kind: "sitting_deadline_24h",
		recipientUserIds: await listUnfinishedParticipantUserIds(db, sittingId),
		title: "24 hours left",
		body: `Finish “${bookTitle}” before the sitting ends.`,
		href: `/sittings/${sittingSlug}`,
	});
}

/** The daily nudge while a sitting is being read. */
export async function notifySittingReadingReminder(
	db: Database,
	sittingSlug: string,
	bookTitle: string,
): Promise<void> {
	const sittingId = await sittingIdBySlug(db, sittingSlug);
	await dispatchNotification(db, {
		kind: "sitting_reading_reminder",
		recipientUserIds: await listUnfinishedParticipantUserIds(db, sittingId),
		title: "Time to read",
		body: `Pick up “${bookTitle}” today.`,
		href: `/sittings/${sittingSlug}`,
	});
}

async function sittingIdBySlug(db: Database, slug: string): Promise<string> {
	const sitting = await db.sitting.findUnique({
		where: { slug },
		select: { id: true },
	});
	if (!sitting) {
		throw new Error(`Sitting not found: ${slug}`);
	}
	return sitting.id;
}
