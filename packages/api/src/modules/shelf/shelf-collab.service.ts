import type { Database } from "@bbrc/db";
import {
	canManageCollaborators,
	MAX_SHELF_COLLABORATORS,
	missingGrants,
	normalizeShelfPermissions,
	outranks,
	SHELF_INVITATION_TTL_DAYS,
	SHELF_PERMISSION_PRESETS,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { visibleOnSiteUserWhere } from "../user/user-visibility";
import { mapShelfListItem, shelfListItemSelect } from "./shelf.schema";
import { loadCoverPreviewMap } from "./shelf.service";
import {
	assertNotWishlist,
	canViewShelf,
	loadShelfAccess,
	logShelfActivity,
	requireOwner,
	requireShelfPermission,
	type ShelfAccess,
} from "./shelf-access";
import type {
	GetInvitationOutput,
	ListCollaboratorsOutput,
	ListMyInvitationsOutput,
	ListShelfActivityOutput,
	SearchInvitableOutput,
} from "./shelf-collab.schema";
import {
	displayName,
	notifyShelfCollaboration,
	shelfPath,
} from "./shelf-notify";
import { generateShelfSlug } from "./shelf-slug";

type ShelfRef = { ownerUsername?: string; shelfSlug: string };

const memberRef = {
	select: { username: true, name: true, image: true },
} as const;

function newToken(): string {
	return `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
}

function inviteLink(token: string): string {
	return `/shelf-invitations/${token}`;
}

function toRef(user: { username: string; name: string; image: string | null }) {
	return { username: user.username, name: user.name, image: user.image };
}

async function loadActor(db: Database, userId: string) {
	const actor = await db.user.findUnique({
		where: { id: userId },
		select: { id: true, name: true, username: true, image: true },
	});
	if (!actor) {
		throw new ORPCError("UNAUTHORIZED", { message: "Sign in again." });
	}
	return actor;
}

async function findCollaborator(
	db: Database,
	shelfId: string,
	username: string,
) {
	const row = await db.shelfCollaborator.findFirst({
		where: { shelfId, user: { username } },
		select: {
			id: true,
			permissions: true,
			userId: true,
			user: { select: { username: true, name: true, image: true } },
		},
	});
	if (!row) {
		throw new ORPCError("NOT_FOUND", {
			message: "That member is not a collaborator on this shelf.",
		});
	}
	return row;
}

// ── Finding people to invite ────────────────────────────────────────────────

export async function searchInvitableMembers(
	input: ShelfRef & { query: string },
	actorId: string,
	db: Database,
): Promise<SearchInvitableOutput> {
	const access = await loadShelfAccess(db, { ...input, actorId });
	requireShelfPermission(access, "add_collaborator");
	assertNotWishlist(
		access.shelf,
		"Your Wishlist is personal, so it cannot be shared.",
	);

	const users = await db.user.findMany({
		where: {
			...visibleOnSiteUserWhere,
			id: { not: actorId },
			OR: [
				{ username: { contains: input.query, mode: "insensitive" } },
				{ name: { contains: input.query, mode: "insensitive" } },
			],
		},
		orderBy: [{ username: "asc" }],
		take: 8,
		select: {
			id: true,
			username: true,
			name: true,
			image: true,
			allowShelfInvites: true,
		},
	});

	const ids = users.map((user) => user.id);
	const [collaborators, invitations] = await Promise.all([
		db.shelfCollaborator.findMany({
			where: { shelfId: access.shelf.id, userId: { in: ids } },
			select: { userId: true },
		}),
		db.shelfInvitation.findMany({
			where: {
				shelfId: access.shelf.id,
				inviteeId: { in: ids },
				status: "pending",
				expiresAt: { gt: new Date() },
			},
			select: { inviteeId: true },
		}),
	]);
	const collaboratorIds = new Set(collaborators.map((row) => row.userId));
	const invitedIds = new Set(invitations.map((row) => row.inviteeId));

	return {
		items: users.map((user) => ({
			...toRef(user),
			state:
				user.id === access.owner.id
					? ("owner" as const)
					: collaboratorIds.has(user.id)
						? ("collaborator" as const)
						: invitedIds.has(user.id)
							? ("invited" as const)
							: user.allowShelfInvites
								? ("available" as const)
								: ("invites_off" as const),
		})),
	};
}

// ── Invitations ─────────────────────────────────────────────────────────────

export async function inviteCollaborator(
	input: ShelfRef & { username: string; permissions: string[] },
	actorId: string,
	db: Database,
) {
	const access = await loadShelfAccess(db, { ...input, actorId });
	requireShelfPermission(access, "add_collaborator");
	assertNotWishlist(
		access.shelf,
		"Your Wishlist is personal, so it cannot be shared.",
	);

	const permissions = normalizeShelfPermissions(input.permissions);
	if (permissions.length === 0) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Choose at least one permission.",
		});
	}
	if (missingGrants(access.permissions, permissions).length > 0) {
		throw new ORPCError("FORBIDDEN", {
			message: "You can only give permissions that you have yourself.",
		});
	}

	const invitee = await db.user.findUnique({
		where: { username: input.username },
		select: {
			id: true,
			username: true,
			name: true,
			isHidden: true,
			allowShelfInvites: true,
		},
	});
	if (!invitee || invitee.isHidden) {
		throw new ORPCError("NOT_FOUND", { message: "Member not found." });
	}
	if (invitee.id === actorId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "You cannot invite yourself.",
		});
	}
	if (invitee.id === access.owner.id) {
		throw new ORPCError("BAD_REQUEST", {
			message: "That member already owns this shelf.",
		});
	}
	if (!invitee.allowShelfInvites) {
		throw new ORPCError("FORBIDDEN", {
			message: `${displayName(invitee)} is not accepting shelf invitations.`,
		});
	}

	const now = new Date();
	const [alreadyCollaborator, pending, collaboratorCount, pendingCount] =
		await Promise.all([
			db.shelfCollaborator.findUnique({
				where: {
					shelfId_userId: { shelfId: access.shelf.id, userId: invitee.id },
				},
				select: { id: true },
			}),
			db.shelfInvitation.findFirst({
				where: {
					shelfId: access.shelf.id,
					inviteeId: invitee.id,
					status: "pending",
				},
				select: { id: true, expiresAt: true },
			}),
			db.shelfCollaborator.count({ where: { shelfId: access.shelf.id } }),
			db.shelfInvitation.count({
				where: {
					shelfId: access.shelf.id,
					status: "pending",
					expiresAt: { gt: now },
				},
			}),
		]);

	if (alreadyCollaborator) {
		throw new ORPCError("CONFLICT", {
			message: "That member is already a collaborator.",
		});
	}
	if (pending && pending.expiresAt > now) {
		throw new ORPCError("CONFLICT", {
			message: "That member already has a pending invitation.",
		});
	}
	if (collaboratorCount + pendingCount >= MAX_SHELF_COLLABORATORS) {
		throw new ORPCError("BAD_REQUEST", {
			message: `A shelf can have at most ${MAX_SHELF_COLLABORATORS} collaborators.`,
		});
	}

	const token = newToken();
	const invitation = await db.$transaction(async (tx) => {
		if (pending) {
			await tx.shelfInvitation.update({
				where: { id: pending.id },
				data: { status: "cancelled", respondedAt: now },
			});
		}
		return tx.shelfInvitation.create({
			data: {
				shelfId: access.shelf.id,
				inviteeId: invitee.id,
				invitedById: actorId,
				permissions,
				token,
				expiresAt: new Date(
					now.getTime() + SHELF_INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000,
				),
			},
			select: { id: true },
		});
	});

	const actor = await loadActor(db, actorId);
	await notifyShelfCollaboration(db, {
		kind: "shelf_invitation",
		recipientUserIds: [invitee.id],
		title: "You were invited to a shelf",
		body: `${displayName(actor)} invited you to help with "${access.shelf.title}".`,
		href: inviteLink(token),
	});

	return { invitationId: invitation.id, token };
}

export async function getInvitationByToken(
	token: string,
	actorId: string,
	db: Database,
): Promise<GetInvitationOutput> {
	const invitation = await db.shelfInvitation.findUnique({
		where: { token },
		select: {
			id: true,
			inviteeId: true,
			status: true,
			expiresAt: true,
			permissions: true,
			invitedBy: memberRef,
			shelf: {
				select: {
					...shelfListItemSelect,
					user: memberRef,
				},
			},
		},
	});

	// A link only opens for the member it was made for.
	if (!invitation || invitation.inviteeId !== actorId) {
		throw new ORPCError("NOT_FOUND", { message: "Invitation not found." });
	}

	const coverMap = await loadCoverPreviewMap([invitation.shelf.id], db);
	const expired =
		invitation.status === "pending" && invitation.expiresAt <= new Date();

	return {
		id: invitation.id,
		status: expired ? "expired" : invitation.status,
		expiresAt: invitation.expiresAt,
		permissions: normalizeShelfPermissions(invitation.permissions),
		shelf: mapShelfListItem(
			invitation.shelf,
			coverMap.get(invitation.shelf.id) ?? [],
		),
		owner: toRef(invitation.shelf.user),
		invitedBy: toRef(invitation.invitedBy),
	};
}

export async function listMyInvitations(
	actorId: string,
	db: Database,
): Promise<ListMyInvitationsOutput> {
	const rows = await db.shelfInvitation.findMany({
		where: {
			inviteeId: actorId,
			status: "pending",
			expiresAt: { gt: new Date() },
		},
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			token: true,
			createdAt: true,
			expiresAt: true,
			permissions: true,
			invitedBy: memberRef,
			shelf: { select: { title: true, slug: true, user: memberRef } },
		},
	});

	return {
		items: rows.map((row) => ({
			id: row.id,
			token: row.token,
			createdAt: row.createdAt,
			expiresAt: row.expiresAt,
			shelfTitle: row.shelf.title,
			shelfSlug: row.shelf.slug,
			owner: toRef(row.shelf.user),
			invitedBy: toRef(row.invitedBy),
			permissionCount: row.permissions.length,
		})),
	};
}

export async function respondToInvitation(
	input: { invitationId: string; accept: boolean },
	actorId: string,
	db: Database,
) {
	const invitation = await db.shelfInvitation.findUnique({
		where: { id: input.invitationId },
		select: {
			id: true,
			inviteeId: true,
			invitedById: true,
			status: true,
			expiresAt: true,
			permissions: true,
			shelf: {
				select: {
					id: true,
					slug: true,
					title: true,
					userId: true,
					user: { select: { username: true } },
				},
			},
		},
	});

	if (!invitation || invitation.inviteeId !== actorId) {
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
	if (invitation.expiresAt <= new Date()) {
		throw new ORPCError("BAD_REQUEST", {
			message: "This invitation has expired. Ask for a new one.",
		});
	}

	const actor = await loadActor(db, actorId);
	const { shelf } = invitation;
	const now = new Date();

	await db.$transaction(async (tx) => {
		if (input.accept) {
			const permissions = normalizeShelfPermissions(invitation.permissions);
			await tx.shelfCollaborator.upsert({
				where: { shelfId_userId: { shelfId: shelf.id, userId: actorId } },
				create: {
					shelfId: shelf.id,
					userId: actorId,
					permissions,
					invitedById: invitation.invitedById,
				},
				update: { permissions },
			});
			await logShelfActivity(tx, {
				shelfId: shelf.id,
				actorId,
				kind: "collaborator_joined",
			});
		}
		await tx.shelfInvitation.update({
			where: { id: invitation.id },
			data: {
				status: input.accept ? "accepted" : "rejected",
				respondedAt: now,
			},
		});
	});

	await notifyShelfCollaboration(db, {
		recipientUserIds: [invitation.invitedById, shelf.userId],
		excludeUserIds: [actorId],
		title: input.accept ? "Invitation accepted" : "Invitation declined",
		body: input.accept
			? `${displayName(actor)} joined "${shelf.title}".`
			: `${displayName(actor)} declined to help with "${shelf.title}".`,
		href: shelfPath(shelf.user.username, shelf.slug),
	});

	return {
		accepted: input.accept,
		ownerUsername: shelf.user.username,
		shelfSlug: shelf.slug,
	};
}

export async function cancelInvitation(
	invitationId: string,
	actorId: string,
	db: Database,
) {
	const invitation = await db.shelfInvitation.findUnique({
		where: { id: invitationId },
		select: {
			id: true,
			status: true,
			invitedById: true,
			shelf: { select: { slug: true, user: { select: { username: true } } } },
		},
	});
	if (!invitation) {
		throw new ORPCError("NOT_FOUND", { message: "Invitation not found." });
	}

	const access = await loadShelfAccess(db, {
		ownerUsername: invitation.shelf.user.username,
		shelfSlug: invitation.shelf.slug,
		actorId,
	});
	if (
		invitation.invitedById !== actorId &&
		!access.permissions.has("remove_collaborator")
	) {
		requireShelfPermission(access, "remove_collaborator");
	}
	if (invitation.status !== "pending") {
		return { ok: true as const };
	}

	await db.shelfInvitation.update({
		where: { id: invitation.id },
		data: { status: "cancelled", respondedAt: new Date() },
	});
	return { ok: true as const };
}

// ── People on a shelf ───────────────────────────────────────────────────────

export async function listCollaborators(
	input: ShelfRef,
	actorId: string,
	db: Database,
): Promise<ListCollaboratorsOutput> {
	const access = await loadShelfAccess(db, { ...input, actorId });
	const now = new Date();

	const [collaborators, invitations, mine] = await Promise.all([
		db.shelfCollaborator.findMany({
			where: { shelfId: access.shelf.id },
			orderBy: { createdAt: "asc" },
			select: {
				userId: true,
				permissions: true,
				createdAt: true,
				user: memberRef,
				invitedBy: memberRef,
			},
		}),
		db.shelfInvitation.findMany({
			where: {
				shelfId: access.shelf.id,
				status: "pending",
				expiresAt: { gt: now },
			},
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				token: true,
				invitedById: true,
				permissions: true,
				createdAt: true,
				expiresAt: true,
				invitee: memberRef,
				invitedBy: memberRef,
			},
		}),
		db.shelfInvitation.count({
			where: {
				shelfId: access.shelf.id,
				inviteeId: actorId,
				status: "pending",
				expiresAt: { gt: now },
			},
		}),
	]);

	if (
		!canViewShelf(access.shelf, {
			userId: actorId,
			permissions: access.permissions,
			hasPendingInvitation: mine > 0,
		})
	) {
		throw new ORPCError("NOT_FOUND", { message: "Shelf not found" });
	}

	const manages = canManageCollaborators(access.permissions);
	const canInvite = access.permissions.has("add_collaborator");

	return {
		owner: toRef(access.owner),
		viewer: {
			role: access.isOwner
				? "owner"
				: access.collaborator
					? "collaborator"
					: "visitor",
			permissions: [...access.permissions],
		},
		collaborators: collaborators.map((row) => ({
			...toRef(row.user),
			permissions:
				manages || row.userId === actorId
					? normalizeShelfPermissions(row.permissions)
					: [],
			joinedAt: row.createdAt,
			invitedBy: row.invitedBy ? toRef(row.invitedBy) : null,
		})),
		invitations: manages
			? invitations.map((row) => ({
					id: row.id,
					token: canInvite || row.invitedById === actorId ? row.token : null,
					invitee: toRef(row.invitee),
					invitedBy: toRef(row.invitedBy),
					permissions: normalizeShelfPermissions(row.permissions),
					createdAt: row.createdAt,
					expiresAt: row.expiresAt,
				}))
			: [],
	};
}

export async function updateCollaboratorPermissions(
	input: ShelfRef & { username: string; permissions: string[] },
	actorId: string,
	db: Database,
) {
	const access = await loadShelfAccess(db, { ...input, actorId });
	requireShelfPermission(access, "edit_permissions");

	const target = await findCollaborator(db, access.shelf.id, input.username);
	if (target.userId === actorId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "You cannot change your own permissions.",
		});
	}

	const current = normalizeShelfPermissions(target.permissions);
	if (!outranks(access.permissions, current)) {
		throw new ORPCError("FORBIDDEN", {
			message: "That member can do more than you, so you cannot change them.",
		});
	}

	const next = normalizeShelfPermissions(input.permissions);
	if (next.length === 0) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Choose at least one permission, or remove the collaborator.",
		});
	}
	if (missingGrants(access.permissions, next).length > 0) {
		throw new ORPCError("FORBIDDEN", {
			message: "You can only give permissions that you have yourself.",
		});
	}

	await db.$transaction(async (tx) => {
		await tx.shelfCollaborator.update({
			where: { id: target.id },
			data: { permissions: next },
		});
		await logShelfActivity(tx, {
			shelfId: access.shelf.id,
			actorId,
			kind: "permissions_changed",
			targetUserId: target.userId,
			meta: { from: current, to: next },
		});
	});

	const actor = await loadActor(db, actorId);
	await notifyShelfCollaboration(db, {
		recipientUserIds: [target.userId],
		title: "Your shelf permissions changed",
		body: `${displayName(actor)} updated what you can do on "${access.shelf.title}".`,
		href: shelfPath(access.owner.username, access.shelf.slug),
	});

	return { ok: true as const };
}

export async function removeCollaborator(
	input: ShelfRef & { username: string },
	actorId: string,
	db: Database,
) {
	const access = await loadShelfAccess(db, { ...input, actorId });
	requireShelfPermission(access, "remove_collaborator");

	const target = await findCollaborator(db, access.shelf.id, input.username);
	if (target.userId === actorId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Use “Leave shelf” to remove yourself.",
		});
	}
	if (
		!outranks(access.permissions, normalizeShelfPermissions(target.permissions))
	) {
		throw new ORPCError("FORBIDDEN", {
			message: "That member can do more than you, so you cannot remove them.",
		});
	}

	await db.$transaction(async (tx) => {
		await tx.shelfCollaborator.delete({ where: { id: target.id } });
		await logShelfActivity(tx, {
			shelfId: access.shelf.id,
			actorId,
			kind: "collaborator_removed",
			targetUserId: target.userId,
		});
	});

	const actor = await loadActor(db, actorId);
	await notifyShelfCollaboration(db, {
		recipientUserIds: [target.userId],
		title: "Removed from a shelf",
		body: `${displayName(actor)} removed you from "${access.shelf.title}".`,
	});

	return { ok: true as const, removedUserId: target.userId };
}

export async function leaveShelf(
	input: ShelfRef,
	actorId: string,
	db: Database,
) {
	const access = await loadShelfAccess(db, { ...input, actorId });
	if (access.isOwner || !access.collaborator) {
		throw new ORPCError("BAD_REQUEST", {
			message: access.isOwner
				? "Owners cannot leave their own shelf. Transfer it or delete it."
				: "You are not a collaborator on this shelf.",
		});
	}

	await db.$transaction(async (tx) => {
		await tx.shelfCollaborator.delete({
			where: { id: access.collaborator?.id },
		});
		await logShelfActivity(tx, {
			shelfId: access.shelf.id,
			actorId,
			kind: "collaborator_left",
		});
	});

	const actor = await loadActor(db, actorId);
	await notifyShelfCollaboration(db, {
		recipientUserIds: [access.owner.id],
		title: "A collaborator left your shelf",
		body: `${displayName(actor)} left "${access.shelf.title}".`,
		href: shelfPath(access.owner.username, access.shelf.slug),
	});

	return { ok: true as const };
}

export async function transferShelfOwnership(
	input: { ownerUsername?: string; shelfSlug: string; username: string },
	actorId: string,
	db: Database,
) {
	const access = await loadShelfAccess(db, {
		ownerUsername: input.ownerUsername,
		shelfSlug: input.shelfSlug,
		actorId,
	});
	requireOwner(access);
	assertNotWishlist(
		access.shelf,
		"Your Wishlist cannot be handed over to someone else.",
	);

	const target = await findCollaborator(db, access.shelf.id, input.username);
	const manager = SHELF_PERMISSION_PRESETS.find(
		(preset) => preset.id === "manager",
	);

	const result = await db.$transaction(async (tx) => {
		const clash = await tx.shelf.findUnique({
			where: {
				userId_slug: { userId: target.userId, slug: access.shelf.slug },
			},
			select: { id: true },
		});
		// The new owner may already have a shelf with this slug.
		const slug = clash
			? await generateShelfSlug(access.shelf.title, target.userId, tx)
			: access.shelf.slug;

		await tx.shelfCollaborator.delete({ where: { id: target.id } });
		await tx.shelf.update({
			where: { id: access.shelf.id },
			data: { userId: target.userId, slug },
		});
		await tx.shelfCollaborator.create({
			data: {
				shelfId: access.shelf.id,
				userId: actorId,
				permissions: [...(manager?.permissions ?? [])],
				invitedById: target.userId,
			},
		});
		await logShelfActivity(tx, {
			shelfId: access.shelf.id,
			actorId,
			kind: "ownership_transferred",
			targetUserId: target.userId,
		});
		return { slug };
	});

	await notifyShelfCollaboration(db, {
		recipientUserIds: [target.userId],
		title: "You now own a shelf",
		body: `${displayName(access.owner)} handed "${access.shelf.title}" over to you.`,
		href: shelfPath(target.user.username, result.slug),
	});

	return { ownerUsername: target.user.username, shelfSlug: result.slug };
}

// ── Activity log ────────────────────────────────────────────────────────────

export async function listShelfActivity(
	input: ShelfRef & { cursor?: string; limit: number },
	actorId: string,
	db: Database,
): Promise<ListShelfActivityOutput> {
	const access = await loadShelfAccess(db, { ...input, actorId });
	assertCanSeeActivity(access);

	const rows = await db.shelfActivity.findMany({
		where: { shelfId: access.shelf.id },
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
		take: input.limit + 1,
		select: {
			id: true,
			kind: true,
			createdAt: true,
			meta: true,
			actor: memberRef,
			targetUser: memberRef,
		},
	});

	const hasMore = rows.length > input.limit;
	const page = hasMore ? rows.slice(0, input.limit) : rows;

	return {
		items: page.map((row) => ({
			id: row.id,
			kind: row.kind,
			createdAt: row.createdAt,
			actor: row.actor ? toRef(row.actor) : null,
			target: row.targetUser ? toRef(row.targetUser) : null,
			meta:
				row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
					? (row.meta as Record<string, unknown>)
					: null,
		})),
		nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
	};
}

function assertCanSeeActivity(access: ShelfAccess) {
	if (access.isOwner || canManageCollaborators(access.permissions)) {
		return;
	}
	throw new ORPCError("FORBIDDEN", {
		message: "Only people who manage collaborators can see the activity log.",
	});
}

// ── Invitation preference ───────────────────────────────────────────────────

export async function getShelfInvitePreference(userId: string, db: Database) {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { allowShelfInvites: true },
	});
	return { allowInvites: user?.allowShelfInvites ?? true };
}

export async function setShelfInvitePreference(
	allowInvites: boolean,
	userId: string,
	db: Database,
) {
	const user = await db.user.update({
		where: { id: userId },
		data: { allowShelfInvites: allowInvites },
		select: { allowShelfInvites: true },
	});
	return { allowInvites: user.allowShelfInvites };
}
