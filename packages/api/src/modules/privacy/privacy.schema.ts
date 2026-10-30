import { PROFILE_VISIBILITIES, VISIBILITY_LEVELS } from "@bbrc/shared";
import type { z } from "zod";
import zod from "zod";

const Level = zod.enum(VISIBILITY_LEVELS);

export const PrivacySettingsSchema = zod.object({
	/** A private profile shows only name, username, avatar, bio and the friend count to non-friends. */
	profileVisibility: zod.enum(PROFILE_VISIBILITIES),
	/** Friend requests are accepted at once. Only for a public profile. */
	autoAcceptFriends: zod.boolean(),
	sections: zod.object({
		reads: Level,
		reviews: Level,
		favorites: Level,
		goals: Level,
		reading: Level,
		/** The wishlist is a shelf: this is its level. */
		wishlist: Level,
	}),
	/** Show the page and percent to whoever may see what I am reading. */
	showReadingProgress: zod.boolean(),
	details: zod.object({
		dateOfBirth: Level,
		gender: Level,
		location: Level,
	}),
	friendCount: zod.number().int().min(0),
});

export const UpdatePrivacySettingsInputSchema = zod.object({
	profileVisibility: zod.enum(PROFILE_VISIBILITIES).optional(),
	autoAcceptFriends: zod.boolean().optional(),
	sections: PrivacySettingsSchema.shape.sections.partial().optional(),
	showReadingProgress: zod.boolean().optional(),
	details: PrivacySettingsSchema.shape.details.partial().optional(),
});

export type PrivacySettings = z.infer<typeof PrivacySettingsSchema>;
export type UpdatePrivacySettingsInput = z.infer<
	typeof UpdatePrivacySettingsInputSchema
>;
