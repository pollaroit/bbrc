import zod from "zod";

/**
 * What a member can follow. Built as a union so members following members slots in as
 * `{ type: "user", username }` without changing any caller; only authors work today.
 */
export const FollowTargetSchema = zod.discriminatedUnion("type", [
	zod.object({
		type: zod.literal("author"),
		slug: zod.string().min(1).max(80),
	}),
	zod.object({
		type: zod.literal("user"),
		username: zod.string().min(3).max(20),
	}),
]);

export type FollowTarget = zod.infer<typeof FollowTargetSchema>;

export const ToggleFollowInputSchema = zod.object({
	target: FollowTargetSchema,
});
export const FollowStateInputSchema = zod.object({
	target: FollowTargetSchema,
});
export const FollowStatesInputSchema = zod.object({
	targets: zod.array(FollowTargetSchema).min(1).max(60),
});

export const FollowStateSchema = zod.object({
	following: zod.boolean(),
	/** How many members follow (never who). */
	followerCount: zod.number().int().min(0),
});
