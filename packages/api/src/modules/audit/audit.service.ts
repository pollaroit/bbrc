import type { Database, Prisma } from "@bbrc/db";
import {
	AUDIT_ACTIONS,
	type AuditActionKey,
	type AuditMetadata,
	type AuditTargetType,
	clipAuditText,
} from "@bbrc/shared";
import type { ListAuditLogInput, ListAuditLogOutput } from "./audit.schema";

/** Anything that can insert an audit row: the database or a transaction. */
export type AuditWriter = Pick<Database, "auditLog">;

export interface AuditActor {
	id: string;
	name: string;
}

export interface AuditTarget {
	type: AuditTargetType;
	id?: string | null;
	/** The target's name now, so the entry still reads right once it is gone. */
	label?: string | null;
}

export interface AuditEntryInput<K extends AuditActionKey> {
	actor: AuditActor;
	action: K;
	target: AuditTarget;
	metadata?: AuditMetadata<K>;
}

/**
 * Writes one audit row. Call it after the action succeeded, or inside the same transaction as
 * the change when the two must stand or fall together (a role change). `metadata` is checked
 * against the action's schema in the registry; a mismatch is logged and the row is kept with
 * empty details rather than losing the entry.
 */
export async function recordAudit<K extends AuditActionKey>(
	db: AuditWriter,
	entry: AuditEntryInput<K>,
): Promise<void> {
	const parsed = AUDIT_ACTIONS[entry.action].metadata.safeParse(
		entry.metadata ?? {},
	);
	if (!parsed.success) {
		console.error(
			`Audit metadata for ${entry.action} does not match its schema`,
			parsed.error.message,
		);
	}
	await db.auditLog.create({
		data: {
			actorId: entry.actor.id,
			actorName: clipAuditText(entry.actor.name) ?? "Unknown",
			action: entry.action,
			targetType: entry.target.type,
			targetId: entry.target.id ?? null,
			targetLabel: clipAuditText(entry.target.label),
			metadata: parsed.success ? (parsed.data as object) : {},
		},
	});
}

const sortOrder = (
	sortBy: ListAuditLogInput["sortBy"],
	direction: "asc" | "desc",
): Prisma.AuditLogOrderByWithRelationInput[] => {
	if (sortBy === "action") {
		return [{ action: direction }, { createdAt: "desc" }];
	}
	if (sortBy === "actor") {
		return [{ actorName: direction }, { createdAt: "desc" }];
	}
	return [{ createdAt: direction }];
};

/**
 * Pages of the log for the admin screen. Reading it is not itself logged. Each row also says
 * where its target lives now (a member, author, book, series or sitting that still exists).
 */
export async function listAuditLog(
	db: Database,
	input: ListAuditLogInput,
): Promise<ListAuditLogOutput> {
	const where: Prisma.AuditLogWhereInput = {
		...(input.actions?.length ? { action: { in: input.actions } } : {}),
		...(input.actorUsernames?.length
			? { actor: { username: { in: input.actorUsernames } } }
			: {}),
		...(input.targetType ? { targetType: input.targetType } : {}),
		...(input.from || input.to
			? { createdAt: { gte: input.from, lte: input.to } }
			: {}),
		...(input.search
			? {
					OR: [
						{ targetLabel: { contains: input.search, mode: "insensitive" } },
						{ actorName: { contains: input.search, mode: "insensitive" } },
					],
				}
			: {}),
	};

	const [total, rows] = await Promise.all([
		db.auditLog.count({ where }),
		db.auditLog.findMany({
			where,
			orderBy: sortOrder(input.sortBy, input.sortDirection),
			skip: (input.page - 1) * input.limit,
			take: input.limit,
			include: {
				actor: { select: { username: true, image: true } },
			},
		}),
	]);

	const hrefs = await resolveTargetHrefs(db, rows);
	const totalPages = Math.ceil(total / input.limit);

	return {
		items: rows.map((row) => ({
			id: row.id,
			createdAt: row.createdAt,
			action: row.action,
			actor: {
				id: row.actorId,
				name: row.actorName,
				username: row.actor?.username ?? null,
				image: row.actor?.image ?? null,
			},
			targetType: row.targetType,
			targetId: row.targetId,
			targetLabel: row.targetLabel,
			targetHref: hrefs.get(row.id) ?? null,
			metadata: row.metadata,
		})),
		metadata: {
			page: input.page,
			limit: input.limit,
			total,
			totalPages,
			hasNextPage: input.page < totalPages,
			nextPage: input.page < totalPages ? input.page + 1 : null,
			prevPage: input.page > 1 ? input.page - 1 : null,
		},
	};
}

type TargetRow = {
	id: string;
	targetType: string;
	targetId: string | null;
};

/** Links for the targets that still exist, found with one query per kind. */
async function resolveTargetHrefs(
	db: Database,
	rows: TargetRow[],
): Promise<Map<string, string>> {
	const idsOf = (type: string) => [
		...new Set(
			rows.flatMap((r) =>
				r.targetType === type && r.targetId ? [r.targetId] : [],
			),
		),
	];
	const [members, authors, books, seriesList, sittings] = await Promise.all([
		db.user.findMany({
			where: { id: { in: idsOf("member") } },
			select: { id: true, username: true },
		}),
		db.author.findMany({
			where: { id: { in: idsOf("author") } },
			select: { id: true, slug: true },
		}),
		db.book.findMany({
			where: { id: { in: idsOf("book") } },
			select: { id: true, slug: true },
		}),
		db.series.findMany({
			where: { id: { in: idsOf("series") } },
			select: { id: true, slug: true },
		}),
		db.sitting.findMany({
			where: { slug: { in: idsOf("sitting") } },
			select: { slug: true },
		}),
	]);

	const byType: Record<string, Map<string, string>> = {
		member: new Map(members.map((m) => [m.id, `/users/${m.username}`])),
		author: new Map(authors.map((a) => [a.id, `/authors/${a.slug}`])),
		book: new Map(books.map((b) => [b.id, `/books/${b.slug}`])),
		series: new Map(seriesList.map((s) => [s.id, `/series/${s.slug}`])),
		sitting: new Map(sittings.map((s) => [s.slug, `/sittings/${s.slug}`])),
	};

	const out = new Map<string, string>();
	for (const row of rows) {
		const href = row.targetId
			? byType[row.targetType]?.get(row.targetId)
			: undefined;
		if (href) out.set(row.id, href);
	}
	return out;
}
