import { BookSchema, UserSchema } from "@bbrc/schemas";
import {
	allowedGoalYears,
	isAuthorSlug,
	normalizeGoalAuthorSlugs,
	normalizeGoalCountryCodes,
} from "@bbrc/shared";
import type { z } from "zod";
import zod from "zod";

export const GoalScopeKindSchema = zod.enum(["none", "authors", "countries"]);

export const GoalScopeSchema = zod.object({
	kind: GoalScopeKindSchema,
	authorSlugs: zod.array(zod.string()).max(20),
	countryCodes: zod.array(zod.string()).max(20),
});

export const GoalListItemSchema = zod.object({
	id: zod.uuid(),
	slug: zod.string(),
	title: zod.string(),
	description: zod.string().nullable(),
	year: zod.number().int(),
	target: zod.number().int().min(1),
	current: zod.number().int().min(0),
	scope: GoalScopeSchema,
	isComplete: zod.boolean(),
	isExpired: zod.boolean(),
	createdAt: zod.coerce.date(),
});

export const ListGoalsByUsernameInputSchema = zod.object({
	username: UserSchema.shape.username,
});

export const ListGoalsByUsernameOutputSchema = zod.object({
	items: zod.array(GoalListItemSchema),
	active: zod.array(GoalListItemSchema),
	expired: zod.array(GoalListItemSchema),
	isOwner: zod.boolean(),
	allowedYears: zod.tuple([zod.number().int(), zod.number().int()]),
	/** True when the member keeps their goals from this viewer (the lists are empty). */
	hidden: zod.boolean().optional(),
});

export type ListGoalsByUsernameOutput = z.infer<
	typeof ListGoalsByUsernameOutputSchema
>;

export const GoalMatchedBookSchema = zod.object({
	readEndYear: zod.number().int(),
	readEndMonth: zod.number().int().min(1).max(12),
	book: BookSchema.pick({
		slug: true,
		title: true,
		authors: true,
		coverId: true,
		countries: true,
	}),
});

export const GetGoalBySlugInputSchema = zod.object({
	username: UserSchema.shape.username,
	goalSlug: zod.string().min(3).max(60),
});

export const GetGoalBySlugOutputSchema = GoalListItemSchema.extend({
	books: zod.array(GoalMatchedBookSchema),
	isOwner: zod.boolean(),
});

export type GetGoalBySlugOutput = z.infer<typeof GetGoalBySlugOutputSchema>;

const CreateGoalScopeFieldsSchema = zod.object({
	scopeKind: GoalScopeKindSchema.default("none"),
	scopeAuthorSlugs: zod.array(zod.string()).max(20).optional(),
	scopeCountryCodes: zod.array(zod.string()).max(20).optional(),
});

const GoalBodyFieldsSchema = zod
	.object({
		title: zod.string().trim().min(1).max(120),
		description: zod.string().trim().max(2000).optional(),
		year: zod.number().int().min(1000).max(2100),
		target: zod.number().int().min(1).max(10_000),
	})
	.merge(CreateGoalScopeFieldsSchema);

function refineGoalScopeFields(
	value: z.infer<typeof GoalBodyFieldsSchema>,
	ctx: zod.core.$RefinementCtx,
) {
	if (value.scopeKind === "none") {
		if (
			(value.scopeAuthorSlugs?.length ?? 0) > 0 ||
			(value.scopeCountryCodes?.length ?? 0) > 0
		) {
			ctx.addIssue({
				code: "custom",
				message: "Remove scope filters when scope is set to all books.",
				path: ["scopeKind"],
			});
		}
		return;
	}

	if (value.scopeKind === "authors") {
		if ((value.scopeCountryCodes?.length ?? 0) > 0) {
			ctx.addIssue({
				code: "custom",
				message: "Pick either authors or countries, not both.",
				path: ["scopeCountryCodes"],
			});
		}
		const slugs = normalizeGoalAuthorSlugs(value.scopeAuthorSlugs ?? []);
		if (slugs.length === 0) {
			ctx.addIssue({
				code: "custom",
				message: "Select at least one author.",
				path: ["scopeAuthorSlugs"],
			});
		}
		for (const slug of slugs) {
			if (!isAuthorSlug(slug)) {
				ctx.addIssue({
					code: "custom",
					message: "Invalid author selection.",
					path: ["scopeAuthorSlugs"],
				});
				break;
			}
		}
		return;
	}

	if ((value.scopeAuthorSlugs?.length ?? 0) > 0) {
		ctx.addIssue({
			code: "custom",
			message: "Pick either authors or countries, not both.",
			path: ["scopeAuthorSlugs"],
		});
	}
	const codes = normalizeGoalCountryCodes(value.scopeCountryCodes ?? []);
	if (codes.length === 0) {
		ctx.addIssue({
			code: "custom",
			message: "Select at least one country.",
			path: ["scopeCountryCodes"],
		});
	}
}

export const CreateGoalInputSchema = GoalBodyFieldsSchema.superRefine(
	(value, ctx) => {
		const { min, max } = allowedGoalYears();
		if (value.year < min || value.year > max) {
			ctx.addIssue({
				code: "custom",
				message: `Goals can only be created for ${min} or ${max}.`,
				path: ["year"],
			});
		}
		refineGoalScopeFields(value, ctx);
	},
);

export const CreateGoalOutputSchema = zod.object({
	slug: zod.string(),
});

export type CreateGoalInput = z.infer<typeof CreateGoalInputSchema>;

export const UpdateGoalInputSchema = GoalBodyFieldsSchema.extend({
	goalSlug: zod.string().min(3).max(60),
}).superRefine((value, ctx) => {
	refineGoalScopeFields(value, ctx);
});

export const UpdateGoalOutputSchema = zod.object({
	slug: zod.string(),
});

export type UpdateGoalInput = z.infer<typeof UpdateGoalInputSchema>;
