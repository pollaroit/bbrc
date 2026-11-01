import { RoleSchema } from "@bbrc/schemas";
import {
	REPORT_ACTIONS,
	REPORT_ADMIN_NOTE_MAX,
	REPORT_NOTE_MAX,
	REPORT_REASONS,
	REPORT_SORT_FIELDS,
	REPORT_STATUSES,
	REPORT_TARGETS,
} from "@bbrc/shared";
import type { z } from "zod";
import zod from "zod";

export const ReportTargetSchema = zod.enum(REPORT_TARGETS);
export const ReportReasonSchema = zod.enum(REPORT_REASONS);
export const ReportStatusSchema = zod.enum(REPORT_STATUSES);
export const ReportActionSchema = zod.enum(REPORT_ACTIONS);

/** `ref` is what the browser knows: a slug, a username, or `username/shelf-slug`. */
export const CreateReportInputSchema = zod.object({
	target: ReportTargetSchema,
	ref: zod.string().min(1).max(200),
	reason: ReportReasonSchema,
	note: zod
		.string()
		.trim()
		.max(REPORT_NOTE_MAX)
		.optional()
		.transform((value) => value || undefined),
});

export const CreateReportOutputSchema = zod.object({
	/** The member had already reported this; nothing new was stored. */
	alreadyReported: zod.boolean(),
	/** For the "Block this person" offer; empty when blocking makes no sense (an admin). */
	ownerUsername: zod.string().nullable(),
});

export const ListReportsInputSchema = zod.object({
	/** `open`: anything with an open report. `closed`: everything that was resolved or dismissed. */
	tab: zod.enum(["open", "closed"]).default("open"),
	target: ReportTargetSchema.optional(),
	/** Only items with a report of this reason. */
	reason: ReportReasonSchema.optional(),
	sortBy: zod.enum(REPORT_SORT_FIELDS).default("date"),
	sortDirection: zod.enum(["asc", "desc"]).default("desc"),
	page: zod.number().int().min(1).default(1),
	limit: zod.number().int().min(1).max(50).default(20),
});

const ReportPersonSchema = zod.object({
	username: zod.string(),
	name: zod.string(),
	image: zod.string().nullable(),
});

export const ReportEntrySchema = zod.object({
	id: zod.string(),
	createdAt: zod.coerce.date(),
	reporter: ReportPersonSchema.nullable(),
	reason: ReportReasonSchema,
	note: zod.string().nullable(),
	status: ReportStatusSchema,
	/** How this reporter's earlier reports ended, for the admin's judgement. */
	reporterTrack: zod.object({
		closed: zod.number().int(),
		dismissedShare: zod.number().nullable(),
		label: zod.string(),
	}),
});

export const ReportActionEntrySchema = zod.object({
	id: zod.string(),
	createdAt: zod.coerce.date(),
	action: ReportActionSchema,
	note: zod.string().nullable(),
	admin: zod.object({ username: zod.string(), name: zod.string() }).nullable(),
});

export const ReportGroupSchema = zod.object({
	target: ReportTargetSchema,
	targetId: zod.string(),
	/** `open` while any report of it is open. */
	status: ReportStatusSchema,
	count: zod.number().int(),
	openCount: zod.number().int(),
	latestAt: zod.coerce.date(),
	reasons: zod.array(
		zod.object({ reason: ReportReasonSchema, count: zod.number().int() }),
	),
	/** The thing as it is now; `null` when it has been deleted (the snapshot is shown instead). */
	live: zod.boolean(),
	title: zod.string().nullable(),
	text: zod.string().nullable(),
	href: zod.string().nullable(),
	owner: zod
		.object({
			username: zod.string(),
			name: zod.string(),
			image: zod.string().nullable(),
			role: RoleSchema,
			/** Open reports and past reports against this member, across all their content. */
			reportsAgainst: zod.number().int(),
		})
		.nullable(),
	reports: zod.array(ReportEntrySchema),
	actions: zod.array(ReportActionEntrySchema),
});

export const ListReportsOutputSchema = zod.object({
	items: zod.array(ReportGroupSchema),
	total: zod.number().int(),
	page: zod.number().int(),
	pageCount: zod.number().int(),
	openTotal: zod.number().int(),
});

export const ActOnReportInputSchema = zod.object({
	target: ReportTargetSchema,
	targetId: zod.string().min(1).max(100),
	action: ReportActionSchema,
	note: zod
		.string()
		.trim()
		.max(REPORT_ADMIN_NOTE_MAX)
		.optional()
		.transform((value) => value || undefined),
});

export const ActOnReportOutputSchema = zod.object({
	status: ReportStatusSchema,
	/** Reporters who were told the outcome by this action. */
	notified: zod.number().int(),
});

export const OpenReportCountOutputSchema = zod.object({
	count: zod.number().int().min(0),
});

export type CreateReportInput = z.infer<typeof CreateReportInputSchema>;
export type ListReportsInput = z.infer<typeof ListReportsInputSchema>;
export type ActOnReportInput = z.infer<typeof ActOnReportInputSchema>;
export type ReportGroup = z.infer<typeof ReportGroupSchema>;
export type ListReportsOutput = z.infer<typeof ListReportsOutputSchema>;
