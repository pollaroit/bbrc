import type { Database } from "@bbrc/db";
import { DEFAULT_WPM } from "@bbrc/shared";
import type {
	UpdateMyProfileParsed,
	UserProfileOutput,
} from "./user-profile.schema";

type StoredProfile = {
	dateOfBirth: Date | null;
	gender: UserProfileOutput["gender"];
	location: string | null;
	bio: string | null;
	favoriteGenres: string[];
	favoriteSubgenres: string[];
	websiteUrl: string | null;
	socialLinks: unknown;
	wpm: number;
};

/** Stored as `{ [siteSlug]: url }`. */
function socialLinksFromJson(json: unknown): UserProfileOutput["socialLinks"] {
	if (!json || typeof json !== "object" || Array.isArray(json)) return [];
	return Object.entries(json as Record<string, unknown>).flatMap(
		([site, url]) => (typeof url === "string" ? [{ site, url }] : []),
	);
}

function toOutput(profile: StoredProfile): UserProfileOutput {
	return {
		dateOfBirth: profile.dateOfBirth,
		gender: profile.gender,
		location: profile.location,
		bio: profile.bio,
		favoriteGenres: profile.favoriteGenres,
		favoriteSubgenres: profile.favoriteSubgenres,
		websiteUrl: profile.websiteUrl,
		socialLinks: socialLinksFromJson(profile.socialLinks),
		wpm: profile.wpm,
	};
}

export async function getProfileByUserId(
	userId: string,
	db: Database,
): Promise<UserProfileOutput> {
	const profile = await db.userProfile.findUnique({ where: { userId } });

	return toOutput(
		profile ?? {
			dateOfBirth: null,
			gender: "not_specified",
			location: null,
			bio: null,
			favoriteGenres: [],
			favoriteSubgenres: [],
			websiteUrl: null,
			socialLinks: null,
			wpm: DEFAULT_WPM,
		},
	);
}

export async function updateMyProfile(
	userId: string,
	input: UpdateMyProfileParsed,
	db: Database,
): Promise<UserProfileOutput> {
	const data = {
		dateOfBirth: input.dateOfBirth,
		gender: input.gender,
		location: input.location,
		bio: input.bio,
		favoriteGenres: input.favoriteGenres,
		favoriteSubgenres: input.favoriteSubgenres,
		websiteUrl: input.websiteUrl,
		socialLinks: Object.fromEntries(
			input.socialLinks.map((link) => [link.site, link.url]),
		),
		wpm: input.wpm,
	};

	const profile = await db.userProfile.upsert({
		where: { userId },
		create: { userId, ...data },
		update: data,
	});

	return toOutput(profile);
}
