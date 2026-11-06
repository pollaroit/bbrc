import { z } from "zod";

/**
 * The audit log's vocabulary: every privileged action that is written down, grouped by domain.
 * Adding an action is one `defineAudit` entry below (and the `audited(...)` line on its
 * procedure); nothing else needs to learn about it. `audit.test.ts` keeps the keys, labels and
 * metadata schemas honest.
 */

export const AUDIT_DOMAINS = {
	member: { label: "Members", icon: "users" },
	author: { label: "Authors", icon: "feather" },
	book: { label: "Books", icon: "book" },
	series: { label: "Series", icon: "library" },
	sitting: { label: "Sittings", icon: "armchair" },
	document: { label: "Documents", icon: "file" },
	fact: { label: "Facts", icon: "lightbulb" },
	quiz: { label: "Quizzes", icon: "circle-help" },
	achievement: { label: "Achievements", icon: "trophy" },
	request: { label: "Book requests", icon: "inbox" },
	report: { label: "Reports", icon: "flag" },
} as const;

export type AuditDomain = keyof typeof AUDIT_DOMAINS;
export const AUDIT_DOMAIN_KEYS = Object.keys(AUDIT_DOMAINS) as AuditDomain[];

/** What an entry points at. Free text in the table; these are the kinds the app writes. */
export const AUDIT_TARGET_TYPES = [
	"member",
	"author",
	"book",
	"edition",
	"series",
	"sitting",
	"document",
	"fact",
	"quiz",
	"achievement",
	"request",
	"report",
	"open_library_work",
	"system",
] as const;
export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[number];

export interface AuditActionDefinition<S extends z.ZodType = z.ZodType> {
	domain: AuditDomain;
	/** Short name for chips and filters ("Role changed"). */
	label: string;
	/** One sentence for the row's summary line when there is nothing more specific. */
	description: string;
	/** Shape of `metadata`. Never put secrets or personal contact details in it. */
	metadata: S;
}

const noMetadata = z.object({});
const text = z.string().max(300);

function defineAudit<S extends z.ZodType = typeof noMetadata>(
	domain: AuditDomain,
	label: string,
	description: string,
	metadata?: S,
): AuditActionDefinition<S> {
	return {
		domain,
		label,
		description,
		metadata: (metadata ?? noMetadata) as S,
	};
}

const fromTo = z.object({ from: text.nullable(), to: text.nullable() });

export const AUDIT_ACTIONS = {
	// Members
	"member.role_changed": defineAudit(
		"member",
		"Role changed",
		"Changed a member's role.",
		fromTo,
	),
	"member.renamed": defineAudit(
		"member",
		"Member renamed",
		"Changed a member's display name.",
		z.object({ name: fromTo }),
	),
	"member.deleted": defineAudit(
		"member",
		"Member deleted",
		"Deleted a member and everything they made.",
	),
	"member.password_reset": defineAudit(
		"member",
		"Password reset",
		"Set a new password for a member.",
	),
	"member.email_verified": defineAudit(
		"member",
		"Email verified",
		"Marked a member's email as verified.",
	),

	// Authors
	"author.created": defineAudit("author", "Author created", "Added an author."),
	"author.updated": defineAudit(
		"author",
		"Author edited",
		"Edited an author's details.",
		z.object({ fields: z.array(text).max(50) }),
	),
	"author.lock_changed": defineAudit(
		"author",
		"Field lock changed",
		"Locked or unlocked an author field.",
		z.object({ field: text, locked: z.boolean() }),
	),
	"author.alias_added": defineAudit(
		"author",
		"Alias added",
		"Added another spelling of an author's name.",
		z.object({ alias: text }),
	),
	"author.alias_removed": defineAudit(
		"author",
		"Alias removed",
		"Removed an alias of an author.",
		z.object({ alias: text.optional() }),
	),
	"author.confirmed": defineAudit(
		"author",
		"Author confirmed",
		"Marked an author as checked.",
	),
	"author.refreshed": defineAudit(
		"author",
		"Author refreshed",
		"Pulled fresh details for an author.",
	),
	"author.merged": defineAudit(
		"author",
		"Authors merged",
		"Merged one author into another.",
		z.object({ mergedName: text.optional(), mergedId: text.optional() }),
	),
	"author.deleted": defineAudit(
		"author",
		"Author deleted",
		"Deleted an author.",
	),
	"author.photo_changed": defineAudit(
		"author",
		"Photo changed",
		"Applied, uploaded or removed an author's photo.",
		z.object({ change: z.enum(["applied", "uploaded", "removed"]) }),
	),
	"author.nationalities_fixed": defineAudit(
		"author",
		"Nationalities fixed",
		"Rewrote author nationalities in bulk.",
		z.object({ changed: z.number().int().optional() }),
	),
	"author.backfill_run": defineAudit(
		"author",
		"Backfill run",
		"Ran a batch of the author backfill.",
		z.object({ processed: z.number().int().optional() }),
	),
	"author.backfill_retried": defineAudit(
		"author",
		"Backfill retried",
		"Retried authors whose enrichment failed.",
	),

	// Books
	"book.created": defineAudit("book", "Book added", "Added a book."),
	"book.created_manual": defineAudit(
		"book",
		"Book added by hand",
		"Added a book that is not on Open Library, with its first edition.",
	),
	"book.updated": defineAudit("book", "Book edited", "Edited a book."),
	"book.removed": defineAudit("book", "Book removed", "Removed a book."),
	"book.hidden": defineAudit(
		"book",
		"Book hidden",
		"Hid a book from sittings.",
	),
	"book.unhidden": defineAudit(
		"book",
		"Book unhidden",
		"Offered a hidden book to sittings again.",
	),
	"book.work_blocked": defineAudit(
		"book",
		"Work blocked",
		"Blocked an Open Library work from being added.",
	),
	"book.work_unblocked": defineAudit(
		"book",
		"Work unblocked",
		"Allowed a blocked Open Library work again.",
	),
	"book.edition_primary_set": defineAudit(
		"book",
		"Primary edition changed",
		"Made an edition the one a book takes its pages and cover from.",
	),
	"book.edition_verified": defineAudit(
		"book",
		"Edition verified",
		"Marked a member-added edition as verified.",
	),
	"book.edition_unverified": defineAudit(
		"book",
		"Edition unverified",
		"Removed the verified mark from an edition.",
	),
	"book.edition_merged": defineAudit(
		"book",
		"Editions merged",
		"Merged one member-added edition into another.",
	),
	"book.edition_linked": defineAudit(
		"book",
		"Edition linked",
		"Linked a member-added edition to an Open Library edition.",
	),

	// Series
	"series.created": defineAudit("series", "Series created", "Added a series."),
	"series.updated": defineAudit("series", "Series edited", "Edited a series."),
	"series.deleted": defineAudit(
		"series",
		"Series deleted",
		"Deleted a series.",
	),
	"series.book_added": defineAudit(
		"series",
		"Book added to series",
		"Placed a book in a series.",
		z.object({ book: text.optional() }),
	),
	"series.book_removed": defineAudit(
		"series",
		"Book removed from series",
		"Took a book out of a series.",
		z.object({ book: text.optional() }),
	),
	"series.reordered": defineAudit(
		"series",
		"Series reordered",
		"Changed the order of a series.",
	),

	// Sittings
	"sitting.created": defineAudit(
		"sitting",
		"Sitting created",
		"Created a sitting.",
	),
	"sitting.phase_changed": defineAudit(
		"sitting",
		"Phase changed",
		"Moved a sitting to another phase.",
		z.object({ to: text.optional() }),
	),
	"sitting.deadlines_changed": defineAudit(
		"sitting",
		"Deadlines changed",
		"Changed a sitting's deadlines.",
	),
	"sitting.participation_changed": defineAudit(
		"sitting",
		"Participation changed",
		"Changed a participant's progress in a sitting.",
		z.object({ progress: text.optional() }),
	),
	"sitting.participant_added": defineAudit(
		"sitting",
		"Participant added",
		"Added a member to a sitting.",
		z.object({ member: text.optional() }),
	),
	"sitting.participant_removed": defineAudit(
		"sitting",
		"Participant removed",
		"Removed a member from a sitting.",
		z.object({ member: text.optional() }),
	),

	// Documents
	"document.approved": defineAudit(
		"document",
		"Document approved",
		"Approved a member's document.",
	),
	"document.rejected": defineAudit(
		"document",
		"Document rejected",
		"Rejected a member's document.",
		z.object({ reason: text.nullable().optional() }),
	),

	// Facts
	"fact.created": defineAudit("fact", "Fact created", "Wrote a fact."),
	"fact.batch_created": defineAudit(
		"fact",
		"Facts created",
		"Wrote several facts at once.",
		z.object({ count: z.number().int() }),
	),
	"fact.published": defineAudit("fact", "Fact published", "Published a fact."),
	"fact.deleted": defineAudit("fact", "Fact deleted", "Deleted a fact."),

	// Quizzes
	"quiz.deleted": defineAudit("quiz", "Quiz deleted", "Deleted a quiz."),
	"quiz.unavailable_cleared": defineAudit(
		"quiz",
		"Quiz made available",
		"Cleared a quiz's unavailable mark.",
	),
	"quiz.regenerated": defineAudit(
		"quiz",
		"Quiz regenerated",
		"Generated a quiz again.",
	),

	// Achievements
	"achievement.revoked": defineAudit(
		"achievement",
		"Achievement revoked",
		"Took an achievement away from a member.",
		z.object({ achievement: text.optional() }),
	),

	// Book requests
	"request.rejected": defineAudit(
		"request",
		"Request declined",
		"Declined a book request.",
		z.object({ reason: text.nullable().optional() }),
	),

	// Reports
	"report.decided": defineAudit(
		"report",
		"Report decided",
		"Acted on a report.",
		z.object({
			decision: text,
			note: text.nullable().optional(),
		}),
	),
} satisfies Record<string, AuditActionDefinition>;

export type AuditActionKey = keyof typeof AUDIT_ACTIONS;
export const AUDIT_ACTION_KEYS = Object.keys(AUDIT_ACTIONS) as AuditActionKey[];

export type AuditMetadata<K extends AuditActionKey> = z.input<
	(typeof AUDIT_ACTIONS)[K]["metadata"]
>;

export function isAuditActionKey(value: string): value is AuditActionKey {
	return Object.hasOwn(AUDIT_ACTIONS, value);
}

export function auditActionsOfDomain(domain: AuditDomain): AuditActionKey[] {
	return AUDIT_ACTION_KEYS.filter((k) => AUDIT_ACTIONS[k].domain === domain);
}

/** Actions grouped by domain, in registry order, for the filter's grouped list. */
export function groupedAuditActions() {
	return AUDIT_DOMAIN_KEYS.map((domain) => ({
		domain,
		label: AUDIT_DOMAINS[domain].label,
		actions: auditActionsOfDomain(domain).map((key) => ({
			key,
			label: AUDIT_ACTIONS[key].label,
		})),
	})).filter((g) => g.actions.length > 0);
}

export function auditActionLabel(key: string): string {
	return isAuditActionKey(key) ? AUDIT_ACTIONS[key].label : key;
}

export function auditActionDomain(key: string): AuditDomain | null {
	return isAuditActionKey(key) ? AUDIT_ACTIONS[key].domain : null;
}

/** Cuts a stored label to what the table keeps. */
export function clipAuditText(value: string | null | undefined, max = 200) {
	if (!value) return null;
	const trimmed = value.trim();
	if (trimmed === "") return null;
	return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

/**
 * The plain-language line for a row. Specific where the metadata allows it, the action's own
 * description otherwise. `metadata` is whatever was stored (older rows may not match today's schema).
 */
export function summarizeAudit(
	key: string,
	metadata: unknown,
	target: string | null,
): string {
	const meta =
		metadata && typeof metadata === "object"
			? (metadata as Record<string, unknown>)
			: {};
	const who = target ?? "it";
	const str = (v: unknown) => (typeof v === "string" && v ? v : null);

	switch (key) {
		case "member.role_changed": {
			const from = str(meta.from);
			const to = str(meta.to);
			if (from && to) return `Changed ${who}'s role from ${from} to ${to}.`;
			break;
		}
		case "member.renamed": {
			const name = meta.name as Record<string, unknown> | undefined;
			const from = str(name?.from);
			const to = str(name?.to);
			if (from && to) return `Renamed ${from} to ${to}.`;
			break;
		}
		case "fact.batch_created":
			if (typeof meta.count === "number") {
				return `Created ${meta.count} fact${meta.count === 1 ? "" : "s"} at once.`;
			}
			break;
		case "author.updated": {
			const fields = Array.isArray(meta.fields) ? meta.fields : [];
			if (fields.length > 0) {
				return `Edited ${who}: ${fields.join(", ")}.`;
			}
			break;
		}
		case "author.lock_changed": {
			const field = str(meta.field);
			if (field) {
				return `${meta.locked ? "Locked" : "Unlocked"} ${field} on ${who}.`;
			}
			break;
		}
		case "sitting.phase_changed": {
			const to = str(meta.to);
			if (to) return `Moved ${who} to ${to}.`;
			break;
		}
		case "report.decided": {
			const decision = str(meta.decision);
			if (decision) return `Decided a report: ${decision}.`;
			break;
		}
		default:
			break;
	}
	return isAuditActionKey(key)
		? AUDIT_ACTIONS[key].description
		: "Unknown action.";
}

export const AUDIT_SORT_FIELDS = ["createdAt", "action", "actor"] as const;
export type AuditSortField = (typeof AUDIT_SORT_FIELDS)[number];
