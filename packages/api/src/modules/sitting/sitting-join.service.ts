import type { Session } from "@bbrc/auth";
import type { Database, DatabaseTransaction } from "@bbrc/db";
import {
	DEFAULT_SITTING_JOIN_CONFIG,
	formatSittingDisplayName,
	inviteLinkState,
	inviteLinkStateMessage,
	joinTypeAllows,
	joinWindowMessage,
	MAX_SITTING_INVITE_LINKS,
	resolveClubTimeZone,
	type SittingJoinConfig,
	selfJoinWindow,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import {
	dispatchNotification,
	listAdminUserIds,
} from "../notification/notification.service";
import { visibleOnSiteUserWhere } from "../user/user-visibility";
import { awardParticipationXp } from "../xp/xp.service";
import type {
	InviteLinkList,
	InviteLinkPreview,
	MySittingInvitations,
	ParticipantJoinInfo,
	SearchSittingMembersOutput,
	SittingJoinConfigInput,
	SittingJoinState,
} from "./sitting-join.schema";

type Db = Database | DatabaseTransaction;
type Actor = { id: string; isAdmin: boolean };

const memberSelect = {
	select: { username: true, name: true, image: true },
} as const;

const sittingSelect = {
	id: true,
	slug: true,
	status: true,
	deadline: true,
	readingStartedAt: true,
	joinType: true,
	joinInVoting: true,
	joinInReading: true,
	joinReadingUntilPercent: true,
	createdById: true,
	selectedBook: {
		select: { title: true, coverId: true, authors: true, pages: true },
	},
	poll: { select: { deadline: true } },
	_count: { select: { participants: { where: { removedAt: null } } } },
} as const;

async function loadSitting(db: Db, slug: string) {
	const sitting = await db.sitting.findUnique({
		where: { slug },
		select: sittingSelect,
	});
	if (!sitting) {
		throw new ORPCError("NOT_FOUND", { message: "Sitting not found" });
	}
	return sitting;
}

type SittingRow = Awaited<ReturnType<typeof loadSitting>>;

export function actorFromSession(session: Session): Actor {
	return { id: session.user.id, isAdmin: Boolean(session.user.isAdmin) };
}

function canManage(sitting: Pick<SittingRow, "createdById">, actor: Actor) {
	return actor.isAdmin || sitting.createdById === actor.id;
}

function assertCanManage(
	sitting: Pick<SittingRow, "createdById">,
	actor: Actor,
) {
	if (!canManage(sitting, actor)) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only the sitting's organisers can do that.",
		});
	}
}

function windowOf(sitting: SittingRow, now = new Date()) {
	const window = selfJoinWindow(
		{
			status: sitting.status,
			readingStartedAt: sitting.readingStartedAt,
			deadline: sitting.deadline,
			joinType: sitting.joinType,
			joinInVoting: sitting.joinInVoting,
			joinInReading: sitting.joinInReading,
			joinReadingUntilPercent: sitting.joinReadingUntilPercent,
		},
		now,
	);
	return {
		...window,
		message: window.reason ? joinWindowMessage(window.reason) : null,
	};
}

function displayName(sitting: SittingRow) {
	return formatSittingDisplayName(
		sitting.slug,
		sitting.status,
		sitting.selectedBook?.title ?? null,
	);
}

function personName(user: { name: string; username: string }) {
	return user.name?.trim() || user.username;
}

const clubDate = (date: Date) =>
	new Intl.DateTimeFormat("en", {
		day: "numeric",
		month: "short",
		timeZone: resolveClubTimeZone(),
	}).format(date);

// ── Who can join ───────────────────────────────────────────────────────────

async function membershipOf(db: Db, sittingId: string, userId: string) {
	const row = await db.participation.findUnique({
		where: { userId_sittingId: { userId, sittingId } },
		select: { removedAt: true },
	});
	return {
		isParticipant: row != null && row.removedAt == null,
		removedByOrganiser: row != null && row.removedAt != null,
	};
}

type JoinVia = "button" | "link" | "invitation";

/** The sentence explaining why this person cannot join right now, or null when they can. */
async function joinBlocker(
	db: Db,
	sitting: SittingRow,
	userId: string | null,
	via: JoinVia,
): Promise<{
	reason: string | null;
	isParticipant: boolean;
	removed: boolean;
}> {
	if (!userId) {
		return { reason: "Sign in to join.", isParticipant: false, removed: false };
	}
	const [user, membership] = await Promise.all([
		db.user.findUnique({
			where: { id: userId },
			select: { status: true, isHidden: true },
		}),
		membershipOf(db, sitting.id, userId),
	]);
	const base = {
		isParticipant: membership.isParticipant,
		removed: membership.removedByOrganiser,
	};
	if (!user || user.isHidden) {
		return {
			...base,
			reason: "This action is not available for your account.",
		};
	}
	if (user.status === "banned") {
		return { ...base, reason: "Banned members cannot join a sitting." };
	}
	if (membership.isParticipant) {
		return { ...base, reason: "You are already in this sitting." };
	}
	if (membership.removedByOrganiser) {
		return {
			...base,
			reason:
				"An organiser removed you from this sitting, so only an organiser can add you back.",
		};
	}
	if (sitting.status === "finished") {
		return { ...base, reason: joinWindowMessage("finished") };
	}
	if (via !== "invitation") {
		if (!joinTypeAllows(sitting.joinType, via)) {
			return {
				...base,
				reason:
					sitting.joinType === "unlisted"
						? "This sitting is joined with an invitation link."
						: "This sitting is private. Only its organisers can add people.",
			};
		}
		const window = windowOf(sitting);
		if (!window.open) {
			return { ...base, reason: window.message };
		}
	}
	return { ...base, reason: null };
}

function assertCanJoin(blocker: Awaited<ReturnType<typeof joinBlocker>>) {
	if (blocker.reason) {
		throw new ORPCError(blocker.isParticipant ? "CONFLICT" : "FORBIDDEN", {
			message: blocker.reason,
		});
	}
}

// ── State ──────────────────────────────────────────────────────────────────

export async function getJoinState(
	db: Database,
	slug: string,
	session: Session | null,
): Promise<SittingJoinState> {
	const sitting = await loadSitting(db, slug);
	const actor = session ? actorFromSession(session) : null;
	const [blocker, invitation] = await Promise.all([
		joinBlocker(db, sitting, actor?.id ?? null, "button"),
		actor
			? db.sittingInvitation.findFirst({
					where: {
						sittingId: sitting.id,
						inviteeId: actor.id,
						status: "pending",
					},
					select: { id: true },
				})
			: Promise.resolve(null),
	]);

	return {
		sittingSlug: sitting.slug,
		status: sitting.status,
		config: {
			joinType: sitting.joinType,
			joinInVoting: sitting.joinInVoting,
			joinInReading: sitting.joinInReading,
			joinReadingUntilPercent: sitting.joinReadingUntilPercent,
		},
		window: windowOf(sitting),
		participantCount: sitting._count.participants,
		viewer: {
			signedIn: actor != null,
			isParticipant: blocker.isParticipant,
			removedByOrganiser: blocker.removed,
			canManage: actor ? canManage(sitting, actor) : false,
			canJoin: blocker.reason == null,
			joinBlockedReason: blocker.reason,
			canLeave:
				blocker.isParticipant &&
				sitting.status === "voting" &&
				sitting._count.participants > 1,
			pendingInvitationId: invitation?.id ?? null,
		},
	};
}

export async function updateJoinConfig(
	db: Database,
	slug: string,
	config: SittingJoinConfigInput,
	actor: Actor,
) {
	const sitting = await loadSitting(db, slug);
	assertCanManage(sitting, actor);
	if (sitting.status === "finished") {
		throw new ORPCError("BAD_REQUEST", {
			message: "This sitting has finished, so its join settings are fixed.",
		});
	}
	await db.sitting.update({
		where: { id: sitting.id },
		data: {
			joinType: config.joinType,
			joinInVoting: config.joinInVoting,
			joinInReading: config.joinInReading,
			joinReadingUntilPercent: config.joinReadingUntilPercent,
		},
	});
	return { ok: true as const };
}

/** Join settings for a new sitting: whatever was chosen, plus the defaults. */
export function withJoinDefaults(
	input: Partial<SittingJoinConfig> | undefined,
): SittingJoinConfig {
	return { ...DEFAULT_SITTING_JOIN_CONFIG, ...(input ?? {}) };
}

// ── Joining ────────────────────────────────────────────────────────────────

async function addParticipation(
	tx: DatabaseTransaction,
	input: {
		sittingId: string;
		userId: string;
		source: JoinVia;
		linkId?: string;
	},
) {
	await tx.participation.create({
		data: {
			userId: input.userId,
			sittingId: input.sittingId,
			joinSource: input.source,
			inviteLinkId: input.linkId ?? null,
		},
	});
	await awardParticipationXp(
		{ userId: input.userId, sittingId: input.sittingId },
		tx,
	);
}

/** Tell the new member what to expect, and let the organisers know (grouped). */
async function afterJoin(
	db: Database,
	sitting: SittingRow,
	joiner: { id: string; name: string; username: string },
	via: JoinVia,
) {
	const label = displayName(sitting);
	const href = `/sittings/${sitting.slug}`;
	const pollDeadline = sitting.poll?.deadline ?? null;
	const body =
		sitting.status === "reading"
			? `Reading ends ${clubDate(sitting.deadline)}. Mark your progress on the sitting page as you go.`
			: pollDeadline
				? `Voting is open until ${clubDate(pollDeadline)}. Pick the book you want to read.`
				: "Voting is open. Pick the book you want to read.";

	try {
		await dispatchNotification(db, {
			kind: "sitting_welcome",
			recipientUserIds: [joiner.id],
			title: `You joined ${label}`,
			body,
			href,
		});

		const recipients = sitting.createdById
			? [sitting.createdById]
			: await listAdminUserIds(db);
		for (const recipientId of recipients) {
			if (recipientId === joiner.id) continue;
			await notifyOrganiserOfJoin(db, {
				recipientId,
				sitting,
				joinerName: personName(joiner),
				via,
			});
		}
	} catch (error) {
		console.error("sitting join notification failed", error);
	}
}

const GROUP_WINDOW_MS = 6 * 60 * 60 * 1000;

/** One notification per organiser per few hours, updated as more people join. */
async function notifyOrganiserOfJoin(
	db: Database,
	input: {
		recipientId: string;
		sitting: SittingRow;
		joinerName: string;
		via: JoinVia;
	},
) {
	const href = `/sittings/${input.sitting.slug}/participants`;
	const label = displayName(input.sitting);
	const since = new Date(Date.now() - GROUP_WINDOW_MS);
	const existing = await db.notification.findFirst({
		where: {
			userId: input.recipientId,
			kind: "sitting_member_joined",
			href,
			readAt: null,
			createdAt: { gte: since },
		},
		orderBy: { createdAt: "desc" },
		select: { id: true, createdAt: true },
	});

	if (!existing) {
		await dispatchNotification(db, {
			kind: "sitting_member_joined",
			recipientUserIds: [input.recipientId],
			title: "Someone joined your sitting",
			body: `${input.joinerName} joined ${label}.`,
			href,
		});
		return;
	}

	const joined = await db.participation.findMany({
		where: {
			sittingId: input.sitting.id,
			removedAt: null,
			joinSource: { not: "organiser" },
			// The first joiner is saved a moment before their notice is.
			joinedAt: { gte: new Date(existing.createdAt.getTime() - 60_000) },
		},
		orderBy: { joinedAt: "desc" },
		select: { user: { select: { name: true, username: true } } },
	});
	const total = joined.length;
	await db.notification.update({
		where: { id: existing.id },
		data: {
			title:
				total > 1
					? `${total} members joined your sitting`
					: "Someone joined your sitting",
			body:
				total > 1
					? `${input.joinerName} and ${total - 1} ${total === 2 ? "other" : "others"} joined ${label}.`
					: `${input.joinerName} joined ${label}.`,
		},
	});
}

export async function joinSitting(db: Database, slug: string, actor: Actor) {
	const sitting = await loadSitting(db, slug);
	const blocker = await joinBlocker(db, sitting, actor.id, "button");
	if (blocker.isParticipant) {
		return { sittingSlug: sitting.slug, alreadyParticipant: true };
	}
	assertCanJoin(blocker);

	try {
		await db.$transaction((tx) =>
			addParticipation(tx, {
				sittingId: sitting.id,
				userId: actor.id,
				source: "button",
			}),
		);
	} catch (error) {
		if ((error as { code?: string }).code === "P2002") {
			return { sittingSlug: sitting.slug, alreadyParticipant: true };
		}
		throw error;
	}

	const joiner = await db.user.findUniqueOrThrow({
		where: { id: actor.id },
		select: { id: true, name: true, username: true },
	});
	void afterJoin(db, sitting, joiner, "button");
	return { sittingSlug: sitting.slug, alreadyParticipant: false };
}

export async function leaveSitting(db: Database, slug: string, actor: Actor) {
	const sitting = await loadSitting(db, slug);
	if (sitting.status !== "voting") {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"You can only leave while voting is open. Once reading starts, everyone who is in stays in.",
		});
	}
	const membership = await membershipOf(db, sitting.id, actor.id);
	if (!membership.isParticipant) {
		throw new ORPCError("BAD_REQUEST", {
			message: "You are not in this sitting.",
		});
	}
	if (sitting._count.participants <= 1) {
		throw new ORPCError("BAD_REQUEST", {
			message: "You are the last person in this sitting, so you cannot leave.",
		});
	}

	await db.$transaction([
		db.pollVote.deleteMany({
			where: { userId: actor.id, option: { poll: { sittingId: sitting.id } } },
		}),
		db.participation.delete({
			where: { userId_sittingId: { userId: actor.id, sittingId: sitting.id } },
		}),
	]);
	return { ok: true as const };
}

// ── Invitation links ───────────────────────────────────────────────────────

function newToken(): string {
	return `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
}

export async function listInviteLinks(
	db: Database,
	slug: string,
	actor: Actor,
): Promise<InviteLinkList> {
	const sitting = await loadSitting(db, slug);
	assertCanManage(sitting, actor);

	const links = await db.sittingInviteLink.findMany({
		where: { sittingId: sitting.id },
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			token: true,
			label: true,
			createdAt: true,
			expiresAt: true,
			maxUses: true,
			uses: true,
			revokedAt: true,
			createdBy: memberSelect,
			_count: { select: { visits: true } },
			participations: {
				where: { removedAt: null },
				orderBy: { joinedAt: "desc" },
				take: 30,
				select: { joinedAt: true, user: memberSelect },
			},
		},
	});

	const now = new Date();
	return {
		items: links.map((link) => ({
			id: link.id,
			token: link.token,
			label: link.label,
			createdAt: link.createdAt,
			expiresAt: link.expiresAt,
			maxUses: link.maxUses,
			uses: link.uses,
			opens: link._count.visits,
			revokedAt: link.revokedAt,
			state: inviteLinkState(link, now),
			createdBy: link.createdBy,
			joins: link.participations.map((row) => ({
				...row.user,
				joinedAt: row.joinedAt,
			})),
		})),
	};
}

export async function createInviteLink(
	db: Database,
	input: {
		sittingSlug: string;
		label?: string;
		expiresAt?: Date | null;
		maxUses?: number | null;
	},
	actor: Actor,
) {
	const sitting = await loadSitting(db, input.sittingSlug);
	assertCanManage(sitting, actor);
	if (sitting.joinType === "private") {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"Private sittings have no invitation links. Make it Unlisted or Public first.",
		});
	}
	if (sitting.status === "finished") {
		throw new ORPCError("BAD_REQUEST", {
			message: "This sitting has finished.",
		});
	}
	const now = new Date();
	if (input.expiresAt) {
		const days = (input.expiresAt.getTime() - now.getTime()) / 86_400_000;
		if (days <= 0) {
			throw new ORPCError("BAD_REQUEST", {
				message: "The expiry must be in the future.",
			});
		}
		if (days > 365) {
			throw new ORPCError("BAD_REQUEST", {
				message: "A link can last at most a year.",
			});
		}
	}

	const live = await db.sittingInviteLink.count({
		where: { sittingId: sitting.id, revokedAt: null },
	});
	if (live >= MAX_SITTING_INVITE_LINKS) {
		throw new ORPCError("BAD_REQUEST", {
			message: `A sitting can have at most ${MAX_SITTING_INVITE_LINKS} links. End one first.`,
		});
	}

	const link = await db.sittingInviteLink.create({
		data: {
			sittingId: sitting.id,
			token: newToken(),
			label: input.label?.trim() || null,
			expiresAt: input.expiresAt ?? null,
			maxUses: input.maxUses ?? null,
			createdById: actor.id,
		},
		select: { id: true, token: true },
	});
	return link;
}

export async function revokeInviteLink(
	db: Database,
	linkId: string,
	actor: Actor,
) {
	const link = await db.sittingInviteLink.findUnique({
		where: { id: linkId },
		select: {
			id: true,
			revokedAt: true,
			sitting: { select: { createdById: true } },
		},
	});
	if (!link) {
		throw new ORPCError("NOT_FOUND", { message: "Link not found" });
	}
	assertCanManage(link.sitting, actor);
	if (!link.revokedAt) {
		await db.sittingInviteLink.update({
			where: { id: link.id },
			data: { revokedAt: new Date() },
		});
	}
	return { ok: true as const };
}

async function loadLinkByToken(db: Db, token: string) {
	const link = await db.sittingInviteLink.findUnique({
		where: { token },
		select: {
			id: true,
			label: true,
			expiresAt: true,
			maxUses: true,
			uses: true,
			revokedAt: true,
			sitting: { select: sittingSelect },
		},
	});
	if (!link) {
		throw new ORPCError("NOT_FOUND", { message: "Invitation link not found" });
	}
	return link;
}

export async function previewInviteLink(
	db: Database,
	token: string,
	actor: Actor,
): Promise<InviteLinkPreview> {
	const link = await loadLinkByToken(db, token);
	const sitting = link.sitting;
	const state = inviteLinkState(link);
	const window = windowOf(sitting);

	const [user, blocker] = await Promise.all([
		db.user.findUnique({ where: { id: actor.id }, select: { status: true } }),
		joinBlocker(db, sitting, actor.id, "link"),
	]);

	let reason = blocker.reason;
	if (!reason && state !== "active") {
		reason = inviteLinkStateMessage(state);
	}

	return {
		linkId: link.id,
		label: link.label,
		state,
		stateMessage: inviteLinkStateMessage(state),
		sitting: {
			slug: sitting.slug,
			displayName: displayName(sitting),
			status: sitting.status,
			deadline: sitting.deadline,
			pollDeadline: sitting.poll?.deadline ?? null,
			participantCount: sitting._count.participants,
			bookTitle: sitting.selectedBook?.title ?? null,
			bookCoverId: sitting.selectedBook?.coverId ?? null,
			bookAuthors: sitting.selectedBook?.authors ?? [],
			bookPages: sitting.selectedBook?.pages ?? null,
			joinType: sitting.joinType,
		},
		window,
		readingWarning: sitting.status === "reading",
		viewer: {
			isParticipant: blocker.isParticipant,
			removedByOrganiser: blocker.removed,
			banned: user?.status === "banned",
		},
		canJoin: reason == null,
		joinBlockedReason: reason,
	};
}

/** Count each person once per link, so "opens" means people. */
export async function recordInviteLinkOpen(
	db: Database,
	token: string,
	actor: Actor,
) {
	const link = await db.sittingInviteLink.findUnique({
		where: { token },
		select: { id: true },
	});
	if (!link) {
		return { ok: true as const };
	}
	await db.sittingInviteLinkVisit.upsert({
		where: { linkId_userId: { linkId: link.id, userId: actor.id } },
		create: { linkId: link.id, userId: actor.id },
		update: {},
	});
	return { ok: true as const };
}

export async function joinWithInviteLink(
	db: Database,
	token: string,
	actor: Actor,
) {
	const link = await loadLinkByToken(db, token);
	const sitting = link.sitting;

	const blocker = await joinBlocker(db, sitting, actor.id, "link");
	if (blocker.isParticipant) {
		return { sittingSlug: sitting.slug, alreadyParticipant: true };
	}
	assertCanJoin(blocker);

	const state = inviteLinkState(link);
	if (state !== "active") {
		throw new ORPCError("FORBIDDEN", {
			message: inviteLinkStateMessage(state),
		});
	}

	try {
		await db.$transaction(async (tx) => {
			// Claim a use in one statement so two people cannot take the last one.
			const claimed = await tx.$executeRaw`
				UPDATE sitting_invite_link
				SET uses = uses + 1
				WHERE id = ${link.id}
					AND revoked_at IS NULL
					AND (expires_at IS NULL OR expires_at > now())
					AND (max_uses IS NULL OR uses < max_uses)
			`;
			if (claimed === 0) {
				throw new ORPCError("FORBIDDEN", {
					message: inviteLinkStateMessage("exhausted"),
				});
			}
			await addParticipation(tx, {
				sittingId: sitting.id,
				userId: actor.id,
				source: "link",
				linkId: link.id,
			});
		});
	} catch (error) {
		if ((error as { code?: string }).code === "P2002") {
			return { sittingSlug: sitting.slug, alreadyParticipant: true };
		}
		throw error;
	}

	const joiner = await db.user.findUniqueOrThrow({
		where: { id: actor.id },
		select: { id: true, name: true, username: true },
	});
	void afterJoin(db, sitting, joiner, "link");
	return { sittingSlug: sitting.slug, alreadyParticipant: false };
}

// ── Direct invitations ─────────────────────────────────────────────────────

export async function createSittingInvitation(
	db: Database,
	input: { sittingSlug: string; username: string },
	actor: Actor,
) {
	const sitting = await loadSitting(db, input.sittingSlug);
	assertCanManage(sitting, actor);
	if (sitting.status === "finished") {
		throw new ORPCError("BAD_REQUEST", {
			message: "This sitting has finished.",
		});
	}

	const invitee = await db.user.findFirst({
		where: { username: input.username, ...visibleOnSiteUserWhere },
		select: {
			id: true,
			name: true,
			username: true,
			status: true,
			allowSittingInvites: true,
		},
	});
	if (!invitee) {
		throw new ORPCError("NOT_FOUND", { message: "Member not found." });
	}
	if (invitee.status === "banned") {
		throw new ORPCError("BAD_REQUEST", {
			message: "Banned members cannot join a sitting.",
		});
	}
	if (!invitee.allowSittingInvites) {
		throw new ORPCError("FORBIDDEN", {
			message: `${personName(invitee)} does not accept sitting invitations.`,
		});
	}
	const membership = await membershipOf(db, sitting.id, invitee.id);
	if (membership.isParticipant) {
		throw new ORPCError("CONFLICT", {
			message: `${personName(invitee)} is already in this sitting.`,
		});
	}
	if (membership.removedByOrganiser) {
		throw new ORPCError("BAD_REQUEST", {
			message: `${personName(invitee)} was removed from this sitting. Add them back directly instead.`,
		});
	}
	const pending = await db.sittingInvitation.findFirst({
		where: { sittingId: sitting.id, inviteeId: invitee.id, status: "pending" },
		select: { id: true },
	});
	if (pending) {
		throw new ORPCError("CONFLICT", {
			message: `${personName(invitee)} already has an invitation.`,
		});
	}

	const invitation = await db.sittingInvitation.create({
		data: {
			sittingId: sitting.id,
			inviteeId: invitee.id,
			invitedById: actor.id,
		},
		select: { id: true },
	});

	const inviter = await db.user.findUnique({
		where: { id: actor.id },
		select: { name: true, username: true },
	});
	void dispatchNotification(db, {
		kind: "sitting_invitation",
		recipientUserIds: [invitee.id],
		title: "You were invited to a sitting",
		body: `${inviter ? personName(inviter) : "An organiser"} invited you to join ${displayName(sitting)}.`,
		href: `/sittings/${sitting.slug}`,
	}).catch((error) =>
		console.error("sitting invitation notification failed", error),
	);

	return { id: invitation.id };
}

export async function cancelSittingInvitation(
	db: Database,
	invitationId: string,
	actor: Actor,
) {
	const invitation = await db.sittingInvitation.findUnique({
		where: { id: invitationId },
		select: {
			id: true,
			status: true,
			sitting: { select: { createdById: true } },
		},
	});
	if (!invitation) {
		throw new ORPCError("NOT_FOUND", { message: "Invitation not found." });
	}
	assertCanManage(invitation.sitting, actor);
	if (invitation.status === "pending") {
		await db.sittingInvitation.update({
			where: { id: invitation.id },
			data: { status: "cancelled", respondedAt: new Date() },
		});
	}
	return { ok: true as const };
}

export async function respondToSittingInvitation(
	db: Database,
	input: { invitationId: string; accept: boolean },
	actor: Actor,
) {
	const invitation = await db.sittingInvitation.findUnique({
		where: { id: input.invitationId },
		select: {
			id: true,
			inviteeId: true,
			status: true,
			sitting: { select: sittingSelect },
		},
	});
	if (!invitation || invitation.inviteeId !== actor.id) {
		throw new ORPCError("NOT_FOUND", { message: "Invitation not found." });
	}
	if (invitation.status !== "pending") {
		throw new ORPCError("BAD_REQUEST", {
			message:
				invitation.status === "cancelled"
					? "This invitation was cancelled."
					: "You already answered this invitation.",
		});
	}
	const sitting = invitation.sitting;

	if (!input.accept) {
		await db.sittingInvitation.update({
			where: { id: invitation.id },
			data: { status: "declined", respondedAt: new Date() },
		});
		return { accepted: false, sittingSlug: sitting.slug };
	}

	// An accepted invitation is the organiser's call, so the self-join window does not apply.
	const blocker = await joinBlocker(db, sitting, actor.id, "invitation");
	if (!blocker.isParticipant) {
		assertCanJoin(blocker);
	}

	try {
		await db.$transaction(async (tx) => {
			await tx.sittingInvitation.update({
				where: { id: invitation.id },
				data: { status: "accepted", respondedAt: new Date() },
			});
			if (!blocker.isParticipant) {
				await addParticipation(tx, {
					sittingId: sitting.id,
					userId: actor.id,
					source: "invitation",
				});
			}
		});
	} catch (error) {
		if ((error as { code?: string }).code !== "P2002") {
			throw error;
		}
	}

	if (!blocker.isParticipant) {
		const joiner = await db.user.findUniqueOrThrow({
			where: { id: actor.id },
			select: { id: true, name: true, username: true },
		});
		void afterJoin(db, sitting, joiner, "invitation");
	}
	return { accepted: true, sittingSlug: sitting.slug };
}

export async function listSittingInvitations(
	db: Database,
	slug: string,
	actor: Actor,
) {
	const sitting = await loadSitting(db, slug);
	assertCanManage(sitting, actor);
	const rows = await db.sittingInvitation.findMany({
		where: { sittingId: sitting.id, status: "pending" },
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			createdAt: true,
			invitee: memberSelect,
			invitedBy: memberSelect,
		},
	});
	return { items: rows };
}

export async function mySittingInvitations(
	db: Database,
	actor: Actor,
): Promise<MySittingInvitations> {
	const rows = await db.sittingInvitation.findMany({
		where: {
			inviteeId: actor.id,
			status: "pending",
			sitting: { status: { in: ["voting", "reading"] } },
		},
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			createdAt: true,
			invitedBy: memberSelect,
			sitting: {
				select: {
					slug: true,
					status: true,
					selectedBook: { select: { title: true } },
				},
			},
		},
	});
	return {
		items: rows.map((row) => ({
			id: row.id,
			createdAt: row.createdAt,
			sittingSlug: row.sitting.slug,
			displayName: formatSittingDisplayName(
				row.sitting.slug,
				row.sitting.status,
				row.sitting.selectedBook?.title ?? null,
			),
			status: row.sitting.status,
			invitedBy: row.invitedBy,
		})),
	};
}

// ── Finding members to add or invite ───────────────────────────────────────

export async function searchSittingMembers(
	db: Database,
	input: { sittingSlug: string; query: string },
	actor: Actor,
): Promise<SearchSittingMembersOutput> {
	const sitting = await loadSitting(db, input.sittingSlug);
	assertCanManage(sitting, actor);

	const users = await db.user.findMany({
		where: {
			...visibleOnSiteUserWhere,
			OR: [
				{ username: { contains: input.query, mode: "insensitive" } },
				{ name: { contains: input.query, mode: "insensitive" } },
			],
		},
		orderBy: { username: "asc" },
		take: 8,
		select: {
			id: true,
			username: true,
			name: true,
			image: true,
			status: true,
			allowSittingAutoAdd: true,
			allowSittingInvites: true,
		},
	});
	const ids = users.map((user) => user.id);
	const [participations, invitations] = await Promise.all([
		db.participation.findMany({
			where: { sittingId: sitting.id, userId: { in: ids } },
			select: { userId: true, removedAt: true },
		}),
		db.sittingInvitation.findMany({
			where: {
				sittingId: sitting.id,
				inviteeId: { in: ids },
				status: "pending",
			},
			select: { inviteeId: true },
		}),
	]);
	const participation = new Map(participations.map((row) => [row.userId, row]));
	const invited = new Set(invitations.map((row) => row.inviteeId));

	return {
		items: users.map((user) => {
			const row = participation.get(user.id);
			const state =
				row && row.removedAt == null
					? ("participant" as const)
					: row
						? ("removed" as const)
						: user.status === "banned"
							? ("banned" as const)
							: invited.has(user.id)
								? ("invited" as const)
								: user.allowSittingAutoAdd || user.id === actor.id
									? ("can_add" as const)
									: user.allowSittingInvites
										? ("invite_only" as const)
										: ("closed" as const);
			return {
				userId: user.id,
				username: user.username,
				name: user.name,
				image: user.image,
				state,
			};
		}),
	};
}

// ── Joined-how info for the participants page ──────────────────────────────

export async function participantJoinInfo(
	db: Database,
	slug: string,
	actor: Actor,
): Promise<ParticipantJoinInfo> {
	const sitting = await loadSitting(db, slug);
	assertCanManage(sitting, actor);
	const rows = await db.participation.findMany({
		where: { sittingId: sitting.id, removedAt: null },
		orderBy: { joinedAt: "desc" },
		select: {
			joinedAt: true,
			joinSource: true,
			user: { select: { username: true } },
			inviteLink: { select: { label: true } },
		},
	});
	return {
		items: rows.map((row) => ({
			username: row.user.username,
			joinedAt: row.joinedAt,
			source: row.joinSource,
			linkLabel: row.inviteLink?.label ?? null,
		})),
	};
}

// ── Preferences ────────────────────────────────────────────────────────────

export async function getJoinPreferences(db: Database, userId: string) {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { allowSittingAutoAdd: true, allowSittingInvites: true },
	});
	return {
		allowAutoAdd: user?.allowSittingAutoAdd ?? true,
		allowInvites: user?.allowSittingInvites ?? true,
	};
}

export async function setJoinPreferences(
	db: Database,
	userId: string,
	input: { allowAutoAdd: boolean; allowInvites: boolean },
) {
	const user = await db.user.update({
		where: { id: userId },
		data: {
			allowSittingAutoAdd: input.allowAutoAdd,
			allowSittingInvites: input.allowInvites,
		},
		select: { allowSittingAutoAdd: true, allowSittingInvites: true },
	});
	return {
		allowAutoAdd: user.allowSittingAutoAdd,
		allowInvites: user.allowSittingInvites,
	};
}
