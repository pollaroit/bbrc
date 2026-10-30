import { DEFAULT_WPM, type Viewer } from "@bbrc/shared";
import { mayViewDetail, mayViewProfile } from "./member-access";
import type { UserProfileOutput } from "./user-profile.schema";

/**
 * Cuts a member's profile down to what the viewer may see (pure).
 *
 * Always public: bio (name, username and avatar live on the user, not here).
 * Own level AND the profile: date of birth, gender, location.
 * The profile only: website, social links, favourite genres and subgenres, wpm.
 * The owner and admins see everything.
 */
export function gateProfileDetails(
	profile: UserProfileOutput,
	owner: { id: string; profileVisibility: "public" | "private" },
	viewer: Viewer,
): UserProfileOutput {
	const profileOk = mayViewProfile(viewer, owner);
	const detail = (
		level: UserProfileOutput["dateOfBirthVisibility"],
		fallbackLevel: "public" | "friends" | "private",
	) => mayViewDetail(viewer, owner, level ?? fallbackLevel);

	const owns =
		viewer.kind === "member" && (viewer.isAdmin || viewer.userId === owner.id);

	return {
		bio: profile.bio,
		dateOfBirth: detail(profile.dateOfBirthVisibility, "private")
			? profile.dateOfBirth
			: null,
		gender: detail(profile.genderVisibility, "private")
			? profile.gender
			: "not_specified",
		location: detail(profile.locationVisibility, "public")
			? profile.location
			: null,
		favoriteGenres: profileOk ? profile.favoriteGenres : [],
		favoriteSubgenres: profileOk ? profile.favoriteSubgenres : [],
		websiteUrl: profileOk ? profile.websiteUrl : null,
		socialLinks: profileOk ? profile.socialLinks : [],
		wpm: profileOk ? profile.wpm : DEFAULT_WPM,
		...(owns
			? {
					dateOfBirthVisibility: profile.dateOfBirthVisibility,
					genderVisibility: profile.genderVisibility,
					locationVisibility: profile.locationVisibility,
				}
			: {}),
	};
}
