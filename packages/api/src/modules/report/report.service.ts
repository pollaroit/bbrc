import type { Database, Prisma } from "@bbrc/db";
import {
	canApplyReportAction,
	REPORT_ACTION_LABELS,
	type ReportActionKind,
	type ReportReason,
	type ReportStatus,
	type ReportTargetKind,
	reportActionsFor,
	reporterTrack,
	reportLimitReached,
	reportNotificationText,
	sortReportGroups,
	statusAfterAction,
	type Viewer,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { recalculateBookAverageRating } from "../feedback/feedback.service";
import { dispatchNotification } from "../notification/notification.service";
import { tierlistImageUrls } from "../post-tierlist/post-tierlist.service";
import { tryDeleteR2PublicUrl } from "../storage/storage-r2-cleanup";
import type {
	ActOnReportInput,
	CreateReportInput,
	ListReportsInput,
	ListReportsOutput,
} from "./report.schema";
import {
	findReportTargetById,
	findReportTargetForViewer,
	reportTargetLabel,
} from "./report-target";

const DAY_MS = 24 * 60 * 60 * 1000;

function isUniqueViolation(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: unknown }).code === "P2002"
	);
}

/**
 * A member reports something they can see. What they cannot see reads as not
 * found, the same as a thing that does not exist, so a report cannot be used
 * to probe for private content.
 */
export async function createReport(
	db: Database,
	viewer: Viewer,
	reporterId: string,
	input: CreateReportInput,
) {
	const found = await findReportTargetForViewer(
		db,
		viewer,
		input.target,
		input.ref,
	);
	if (!found) {
		throw new ORPCError("NOT_FOUND", { message: "That is no longer there." });
	}
	if (found.ownerId === reporterId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "You cannot report your own content.",
		});
	}
	const ownerUsername = found.ownerIsAdmin ? null : found.ownerUsername;

	const existing = await db.report.findUnique({
		where: {
			reporterId_targetType_targetId: {
				reporterId,
				targetType: input.target,
				targetId: found.id,
			},
		},
		select: { id: true },
	});
	if (existing) return { alreadyReported: true, ownerUsername };

	const reportsToday = await db.report.count({
		where: { reporterId, createdAt: { gte: new Date(Date.now() - DAY_MS) } },
	});
	if (reportLimitReached(reportsToday)) {
		throw new ORPCError("TOO_MANY_REQUESTS", {
			message: "You have sent a lot of reports today. Please try again later.",
		});
	}

	try {
		await db.report.create({
			data: {
				targetType: input.target,
				targetId: found.id,
				reporterId,
				ownerId: found.ownerId,
				reason: input.reason,
				note: input.note ?? null,
				snapshotTitle: found.title,
				snapshotText: found.text,
				snapshotHref: found.href,
			},
		});
	} catch (error) {
		if (isUniqueViolation(error))
			return { alreadyReported: true, ownerUsername };
		throw error;
	}
	return { alreadyReported: false, ownerUsername };
}

function groupKey(targetType: string, targetId: string) {
	return `${targetType}:${targetId}`;
}

export async function countOpenReportGroups(db: Database): Promise<number> {
	const groups = await db.report.groupBy({
		by: ["targetType", "targetId"],
		where: { status: "open" },
	});
	return groups.length;
}

/** The admin queue: one entry per reported thing, newest report first. */
export async function listReports(
	db: Database,
	input: ListReportsInput,
): Promise<ListReportsOutput> {
	const where: Prisma.ReportWhereInput = {
		status: input.tab === "open" ? "open" : { in: ["resolved", "dismissed"] },
		...(input.target ? { targetType: input.target } : {}),
		...(input.reason ? { reason: input.reason } : {}),
	};
	const [matching, openTotal] = await Promise.all([
		db.report.groupBy({
			by: ["targetType", "targetId"],
			where,
			_max: { ownerId: true },
		}),
		countOpenReportGroups(db),
	]);

	// Sorting uses the numbers the cards show: every report of the item (not only
	// the ones in this tab) and every report ever filed against its owner.
	const [counts, ownerTotals] =
		matching.length === 0
			? [[], []]
			: await Promise.all([
					db.report.groupBy({
						by: ["targetType", "targetId"],
						where: {
							OR: matching.map((g) => ({
								targetType: g.targetType,
								targetId: g.targetId,
							})),
						},
						_count: { _all: true },
						_max: { createdAt: true },
					}),
					db.report.groupBy({
						by: ["ownerId"],
						where: {
							ownerId: {
								in: matching.flatMap((g) =>
									g._max.ownerId ? [g._max.ownerId] : [],
								),
							},
						},
						_count: { _all: true },
					}),
				]);
	const ownerReports = new Map(
		ownerTotals.flatMap((row) =>
			row.ownerId ? [[row.ownerId, row._count._all] as const] : [],
		),
	);
	const stats = new Map(
		counts.map((row) => [
			groupKey(row.targetType, row.targetId),
			{ count: row._count._all, latestAt: row._max.createdAt ?? new Date(0) },
		]),
	);
	const allGroups = sortReportGroups(
		matching.map((g) => {
			const found = stats.get(groupKey(g.targetType, g.targetId));
			return {
				targetType: g.targetType,
				targetId: g.targetId,
				latestAt: found?.latestAt ?? new Date(0),
				count: found?.count ?? 0,
				ownerReports: g._max.ownerId
					? (ownerReports.get(g._max.ownerId) ?? 0)
					: 0,
			};
		}),
		input.sortBy,
		input.sortDirection,
	);

	const total = allGroups.length;
	const pageCount = Math.max(1, Math.ceil(total / input.limit));
	const page = Math.min(input.page, pageCount);
	const groups = allGroups.slice((page - 1) * input.limit, page * input.limit);
	if (groups.length === 0) {
		return { items: [], total, page, pageCount, openTotal };
	}

	const inGroups = {
		OR: groups.map((g) => ({
			targetType: g.targetType,
			targetId: g.targetId,
		})),
	};
	const [reports, actions] = await Promise.all([
		db.report.findMany({
			where: inGroups,
			orderBy: { createdAt: "desc" },
			include: {
				reporter: { select: { username: true, name: true, image: true } },
			},
		}),
		db.reportAction.findMany({
			where: inGroups,
			orderBy: { createdAt: "desc" },
			include: { admin: { select: { username: true, name: true } } },
		}),
	]);

	const reporterIds = [...new Set(reports.map((r) => r.reporterId))];
	const ownerIds = [
		...new Set(reports.flatMap((r) => (r.ownerId ? [r.ownerId] : []))),
	];
	const [tracks, owners, against, live] = await Promise.all([
		db.report.groupBy({
			by: ["reporterId", "status"],
			where: {
				reporterId: { in: reporterIds },
				status: { in: ["resolved", "dismissed"] },
			},
			_count: { _all: true },
		}),
		db.user.findMany({
			where: { id: { in: ownerIds } },
			select: {
				id: true,
				username: true,
				name: true,
				image: true,
				status: true,
				isAdmin: true,
			},
		}),
		db.report.groupBy({
			by: ["ownerId"],
			where: { ownerId: { in: ownerIds } },
			_count: { _all: true },
		}),
		Promise.all(
			groups.map((g) => findReportTargetById(db, g.targetType, g.targetId)),
		),
	]);

	const trackByReporter = new Map<
		string,
		{ resolved: number; dismissed: number }
	>();
	for (const row of tracks) {
		const entry = trackByReporter.get(row.reporterId) ?? {
			resolved: 0,
			dismissed: 0,
		};
		if (row.status === "dismissed") entry.dismissed = row._count._all;
		else entry.resolved = row._count._all;
		trackByReporter.set(row.reporterId, entry);
	}
	const ownerById = new Map(owners.map((o) => [o.id, o]));
	const againstByOwner = new Map(
		against.flatMap((row) =>
			row.ownerId ? [[row.ownerId, row._count._all] as const] : [],
		),
	);

	const items = groups.map((group, index) => {
		const key = groupKey(group.targetType, group.targetId);
		const mine = reports.filter(
			(r) => groupKey(r.targetType, r.targetId) === key,
		);
		const newest = mine[0];
		const liveInfo = live[index];
		const openCount = mine.filter((r) => r.status === "open").length;
		const status: ReportStatus =
			openCount > 0 ? "open" : (newest?.status ?? "dismissed");
		const ownerId = liveInfo?.ownerId ?? newest?.ownerId ?? null;
		const owner = ownerId ? ownerById.get(ownerId) : undefined;

		const reasonCounts = new Map<ReportReason, number>();
		for (const r of mine) {
			reasonCounts.set(r.reason, (reasonCounts.get(r.reason) ?? 0) + 1);
		}

		return {
			target: group.targetType,
			targetId: group.targetId,
			status,
			count: mine.length,
			openCount,
			latestAt: newest?.createdAt ?? new Date(0),
			reasons: [...reasonCounts.entries()]
				.map(([reason, count]) => ({ reason, count }))
				.sort((a, b) => b.count - a.count),
			live: Boolean(liveInfo),
			title: liveInfo?.title ?? newest?.snapshotTitle ?? null,
			text: liveInfo?.text ?? newest?.snapshotText ?? null,
			href: liveInfo?.href ?? null,
			owner: owner
				? {
						username: owner.username,
						name: owner.name,
						image: owner.image,
						status: owner.status,
						isAdmin: owner.isAdmin,
						reportsAgainst: againstByOwner.get(owner.id) ?? 0,
					}
				: null,
			reports: mine.map((r) => ({
				id: r.id,
				createdAt: r.createdAt,
				reporter: r.reporter,
				reason: r.reason,
				note: r.note,
				status: r.status,
				reporterTrack: reporterTrack(
					trackByReporter.get(r.reporterId) ?? { resolved: 0, dismissed: 0 },
				),
			})),
			actions: actions
				.filter((a) => groupKey(a.targetType, a.targetId) === key)
				.map((a) => ({
					id: a.id,
					createdAt: a.createdAt,
					action: a.action,
					note: a.note,
					admin: a.admin,
				})),
		};
	});

	return { items, total, page, pageCount, openTotal };
}

/** Removes the reported content and the files that belong to it. */
async function deleteReportedContent(
	db: Database,
	kind: ReportTargetKind,
	id: string,
): Promise<void> {
	if (kind === "post") {
		const post = await db.post.findUnique({
			where: { id },
			select: { imageUrl: true },
		});
		if (!post) return;
		await tryDeleteR2PublicUrl(post.imageUrl);
		for (const url of await tierlistImageUrls(db, id)) {
			await tryDeleteR2PublicUrl(url);
		}
		await db.post.delete({ where: { id } });
		return;
	}
	if (kind === "comment") {
		const comment = await db.comment.findUnique({
			where: { id },
			select: { imageUrl: true },
		});
		if (!comment) return;
		await tryDeleteR2PublicUrl(comment.imageUrl);
		await db.comment.delete({ where: { id } });
		return;
	}
	if (kind === "review") {
		const review = await db.feedback.findUnique({
			where: { id },
			select: { bookId: true, imageUrl: true },
		});
		if (!review) return;
		await tryDeleteR2PublicUrl(review.imageUrl);
		await db.$transaction(async (tx) => {
			await tx.feedback.delete({ where: { id } });
			await recalculateBookAverageRating(review.bookId, tx);
		});
		return;
	}
	if (kind === "shelf") {
		const shelf = await db.shelf.findUnique({
			where: { id },
			select: { coverImageUrl: true, isWishlist: true },
		});
		if (!shelf) return;
		if (shelf.isWishlist) {
			throw new ORPCError("BAD_REQUEST", {
				message: "A Wishlist cannot be deleted.",
			});
		}
		await tryDeleteR2PublicUrl(shelf.coverImageUrl);
		await db.shelf.delete({ where: { id } });
		return;
	}
	throw new ORPCError("BAD_REQUEST", {
		message: "A profile has no content to delete. Warn or ban the member.",
	});
}

function noticeFor(
	action: "delete_content" | "warn_owner" | "ban_owner",
	targetLabel: string,
	adminNote: string | undefined,
) {
	const reason = adminNote ? ` Moderator's note: ${adminNote}` : "";
	if (action === "delete_content") {
		return {
			title: "A moderator removed your content",
			body: `Your ${targetLabel.toLowerCase()} was reported and removed because it did not fit the club's rules.${reason}`,
		};
	}
	return {
		title: "A moderator warned you",
		body: `Something you shared was reported and reviewed. Please keep to the club's rules; repeated problems can lead to a ban.${reason}`,
	};
}

/**
 * An admin acts on everything reported about one thing. Closing actions close
 * every open report of it and tell each reporter once; `reopen` and `note` are
 * logged too. Nothing is hidden automatically before an admin acts.
 */
export async function actOnReport(
	db: Database,
	adminId: string,
	input: ActOnReportInput,
) {
	const { target, targetId, action, note } = input;
	if (!reportActionsFor(target).includes(action)) {
		throw new ORPCError("BAD_REQUEST", {
			message: `${REPORT_ACTION_LABELS[action]} does not apply to this kind of report.`,
		});
	}

	const reports = await db.report.findMany({
		where: { targetType: target, targetId },
		select: { id: true, status: true, ownerId: true },
	});
	if (reports.length === 0) {
		throw new ORPCError("NOT_FOUND", { message: "Report not found." });
	}
	const groupStatus: ReportStatus = reports.some((r) => r.status === "open")
		? "open"
		: "resolved";
	if (!canApplyReportAction(groupStatus, action)) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				action === "reopen"
					? "This report is already open."
					: "This report is already closed. Reopen it first.",
		});
	}

	const live = await findReportTargetById(db, target, targetId);
	const ownerId = live?.ownerId ?? reports[0]?.ownerId ?? null;
	const label = reportTargetLabel(target);

	if (action === "warn_owner" || action === "ban_owner") {
		if (!ownerId) {
			throw new ORPCError("BAD_REQUEST", {
				message: "The owner's account no longer exists.",
			});
		}
		const owner = await db.user.findUnique({
			where: { id: ownerId },
			select: { isAdmin: true },
		});
		if (owner?.isAdmin || ownerId === adminId) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Admins cannot be warned or banned from the queue.",
			});
		}
	}

	if (action === "delete_content") {
		await deleteReportedContent(db, target, targetId);
	}
	if (action === "warn_owner" && ownerId) {
		// Never lifts a ban: only an active member becomes "warned".
		await db.user.updateMany({
			where: { id: ownerId, status: "active" },
			data: { status: "warned" },
		});
	}
	if (action === "ban_owner" && ownerId) {
		await db.user.update({
			where: { id: ownerId },
			data: { status: "banned" },
		});
	}

	const next = statusAfterAction(action);
	const now = new Date();
	await db.$transaction(async (tx) => {
		await tx.reportAction.create({
			data: {
				targetType: target,
				targetId,
				adminId,
				action,
				note: note ?? null,
			},
		});
		if (action === "reopen") {
			await tx.report.updateMany({
				where: { targetType: target, targetId, status: { not: "open" } },
				data: {
					status: "open",
					resolvedAt: null,
					resolvedById: null,
					resolution: null,
				},
			});
		} else if (next) {
			await tx.report.updateMany({
				where: { targetType: target, targetId, status: "open" },
				data: {
					status: next,
					resolvedAt: now,
					resolvedById: adminId,
					resolution: action as ReportActionKind,
				},
			});
		}
	});

	// Best effort from here on: a phone that cannot be reached must not undo a decision.
	let notified = 0;
	if (next === "resolved" || next === "dismissed") {
		if (ownerId && (action === "delete_content" || action === "warn_owner")) {
			const notice = noticeFor(action, label, note);
			await dispatchNotification(db, {
				kind: "moderation_notice",
				recipientUserIds: [ownerId],
				...notice,
			}).catch((error) => console.error("moderation notice failed", error));
		}
		const toTell = await db.report.findMany({
			where: {
				targetType: target,
				targetId,
				status: next,
				reporterNotifiedAt: null,
			},
			select: { id: true, reporterId: true },
		});
		if (toTell.length > 0) {
			const text = reportNotificationText(next, label);
			try {
				await dispatchNotification(db, {
					kind: "report_resolved",
					recipientUserIds: toTell.map((r) => r.reporterId),
					...text,
				});
				await db.report.updateMany({
					where: { id: { in: toTell.map((r) => r.id) } },
					data: { reporterNotifiedAt: now },
				});
				notified = toTell.length;
			} catch (error) {
				console.error("report notification failed", error);
			}
		}
	}

	return { status: next ?? groupStatus, notified };
}
