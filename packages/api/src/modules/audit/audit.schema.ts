import { OffsetPaginationOutputSchema } from "@bbrc/schemas";
import { AUDIT_SORT_FIELDS } from "@bbrc/shared";
import zod from "zod";

export const ListAuditLogInputSchema = zod.object({
	page: zod.number().int().min(1).default(1),
	limit: zod.number().int().min(1).max(100).default(25),
	/** Text in the target's name or the actor's name. */
	search: zod.string().trim().max(100).optional(),
	actions: zod.array(zod.string().max(80)).max(100).optional(),
	/** Usernames of the members who did it. */
	actorUsernames: zod.array(zod.string().min(1).max(40)).max(50).optional(),
	targetType: zod.string().min(1).max(40).optional(),
	from: zod.date().optional(),
	to: zod.date().optional(),
	sortBy: zod.enum(AUDIT_SORT_FIELDS).default("createdAt"),
	sortDirection: zod.enum(["asc", "desc"]).default("desc"),
});

export type ListAuditLogInput = zod.infer<typeof ListAuditLogInputSchema>;

export const AuditLogItemSchema = zod.object({
	id: zod.string(),
	createdAt: zod.date(),
	action: zod.string(),
	actor: zod.object({
		id: zod.string().nullable(),
		name: zod.string(),
		username: zod.string().nullable(),
		image: zod.string().nullable(),
	}),
	targetType: zod.string(),
	targetId: zod.string().nullable(),
	targetLabel: zod.string().nullable(),
	/** Where the target lives now, or null when it is gone or has no page. */
	targetHref: zod.string().nullable(),
	metadata: zod.unknown(),
});

export const ListAuditLogOutputSchema =
	OffsetPaginationOutputSchema(AuditLogItemSchema);

export type AuditLogItem = zod.infer<typeof AuditLogItemSchema>;
export type ListAuditLogOutput = zod.infer<typeof ListAuditLogOutputSchema>;
