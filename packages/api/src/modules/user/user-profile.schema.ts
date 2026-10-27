import { validationError, validationMessage } from "@bbrc/i18n";
import { GenderSchema } from "@bbrc/schemas";
import {
	contentPlainText,
	DEFAULT_WPM,
	getSubgenreParent,
	isBirthDateInRange,
	isGenreSlug,
	isSubgenreSlug,
	MAX_WPM,
	MIN_WPM,
	normalizeContentForStorage,
	PROFILE_BIO_MAX_PLAIN_CHARS,
	PROFILE_LOCATION_MAX_CHARS,
	PROFILE_WEBSITE_MAX_CHARS,
	socialSites,
} from "@bbrc/shared";
import zod from "zod";

const socialSiteBySlug = new Map<string, (typeof socialSites)[number]>(
	socialSites.map((site) => [site.slug, site]),
);

const SocialLinkSchema = zod.object({
	site: zod.string(),
	url: zod.string().trim().max(PROFILE_WEBSITE_MAX_CHARS),
});

const WebsiteUrlSchema = zod
	.string()
	.trim()
	.max(PROFILE_WEBSITE_MAX_CHARS)
	.refine(
		(value) => {
			try {
				return new URL(value).protocol === "https:";
			} catch {
				return false;
			}
		},
		{ error: validationError("profile.websiteUrl") },
	);

export const UserProfileOutputSchema = zod.object({
	dateOfBirth: zod.coerce.date().nullable(),
	gender: GenderSchema,
	location: zod.string().nullable(),
	bio: zod.string().nullable(),
	favoriteGenres: zod.array(zod.string()),
	favoriteSubgenres: zod.array(zod.string()),
	websiteUrl: zod.string().nullable(),
	socialLinks: zod.array(SocialLinkSchema),
	wpm: zod.number().int(),
});

export type UserProfileOutput = zod.infer<typeof UserProfileOutputSchema>;

export const GetMyProfileOutputSchema = UserProfileOutputSchema;

export const UpdateMyProfileInputSchema = zod
	.object({
		dateOfBirth: zod.coerce
			.date()
			.nullable()
			.refine(
				(value) => value === null || isBirthDateInRange(value),
				"Date of birth must make you between 12 and 112 years old",
			),
		gender: GenderSchema,
		location: zod
			.string()
			.trim()
			.max(PROFILE_LOCATION_MAX_CHARS)
			.nullable()
			.transform((value) => value || null),
		bio: zod
			.string()
			.nullable()
			.transform((value, ctx) => {
				if (value === null) return null;
				const normalized = normalizeContentForStorage(value);
				const plain = contentPlainText(normalized).trim();
				if (plain.length === 0) return null;
				if (plain.length > PROFILE_BIO_MAX_PLAIN_CHARS) {
					ctx.addIssue({
						code: "custom",
						message: validationMessage("profile.bioTooLong", {
							max: PROFILE_BIO_MAX_PLAIN_CHARS,
						}),
					});
					return zod.NEVER;
				}
				return normalized;
			}),
		favoriteGenres: zod.array(
			zod.string().refine(isGenreSlug, {
				error: validationError("profile.unknownGenre"),
			}),
		),
		favoriteSubgenres: zod.array(
			zod.string().refine(isSubgenreSlug, {
				error: validationError("profile.unknownSubgenre"),
			}),
		),
		websiteUrl: WebsiteUrlSchema.nullable(),
		socialLinks: zod.array(SocialLinkSchema).max(socialSites.length),
		wpm: zod.number().int().min(MIN_WPM).max(MAX_WPM).default(DEFAULT_WPM),
	})
	.superRefine((value, ctx) => {
		const genres = new Set(value.favoriteGenres);
		for (const sub of value.favoriteSubgenres) {
			const parent = getSubgenreParent(sub);
			if (!parent || !genres.has(parent)) {
				ctx.addIssue({
					code: "custom",
					path: ["favoriteSubgenres"],
					message: validationMessage("profile.subgenreNeedsGenre"),
				});
				break;
			}
		}

		const seen = new Set<string>();
		value.socialLinks.forEach((link, index) => {
			const site = socialSiteBySlug.get(link.site);
			if (!site) {
				ctx.addIssue({
					code: "custom",
					path: ["socialLinks", index, "site"],
					message: validationMessage("profile.unknownSocialSite"),
				});
				return;
			}
			if (seen.has(link.site)) {
				ctx.addIssue({
					code: "custom",
					path: ["socialLinks", index, "site"],
					message: validationMessage("profile.socialAlreadyAdded", {
						site: site.name,
					}),
				});
			}
			seen.add(link.site);
			if (!site.regex.test(link.url)) {
				ctx.addIssue({
					code: "custom",
					path: ["socialLinks", index, "url"],
					message: validationMessage("profile.socialInvalidUrl", {
						site: site.name,
						example: site.example,
					}),
				});
			}
		});
	});

export type UpdateMyProfileInput = zod.input<typeof UpdateMyProfileInputSchema>;
export type UpdateMyProfileParsed = zod.output<
	typeof UpdateMyProfileInputSchema
>;

export const UpdateMyProfileOutputSchema = UserProfileOutputSchema;
