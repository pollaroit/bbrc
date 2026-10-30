/*
 * Who may see something, as an ordered list of levels. The ONLY place that
 * knows the levels and which kind of viewer reaches which: to add a level
 * (say "close friends"), add it to `VISIBILITY_LEVELS` in order, say which
 * relations reach it in `LEVEL_REACH`, and add its label.
 */

/** Widest first. The database stores these as a Postgres enum; the order lives here. */
export const VISIBILITY_LEVELS = ["public", "friends", "private"] as const;
export type Visibility = (typeof VISIBILITY_LEVELS)[number];

/** How a viewer stands to the owner of what they are looking at. */
export const VIEWER_RELATIONS = [
	"admin",
	"self",
	"friend",
	/** Signed in, no friendship. */
	"member",
	"anonymous",
	/** Either of them blocked the other: sees nothing of theirs in the app. */
	"blocked",
] as const;
export type ViewerRelation = (typeof VIEWER_RELATIONS)[number];

/** Which relations may view something at each level. Admin and self are handled before this. */
export const LEVEL_REACH: Record<Visibility, readonly ViewerRelation[]> = {
	public: ["admin", "self", "friend", "member", "anonymous"],
	friends: ["admin", "self", "friend"],
	private: ["admin", "self"],
};

export const VISIBILITY_LABELS: Record<Visibility, string> = {
	public: "Everyone",
	friends: "Friends",
	private: "Only me",
};

export const VISIBILITY_DESCRIPTIONS: Record<Visibility, string> = {
	public: "Anyone, signed in or not",
	friends: "Only your friends",
	private: "Only you",
};

export function isVisibility(value: unknown): value is Visibility {
	return (
		typeof value === "string" &&
		(VISIBILITY_LEVELS as readonly string[]).includes(value)
	);
}

/** 0 for the widest level; larger is stricter. */
export function visibilityRank(level: Visibility): number {
	return VISIBILITY_LEVELS.indexOf(level);
}

/** The stricter of two levels. */
export function stricterVisibility(a: Visibility, b: Visibility): Visibility {
	return visibilityRank(a) >= visibilityRank(b) ? a : b;
}

/** A profile is public or private; a private profile caps everything at "friends". */
export const PROFILE_VISIBILITIES = ["public", "private"] as const;
export type ProfileVisibility = (typeof PROFILE_VISIBILITIES)[number];

export function profileCap(profile: ProfileVisibility): Visibility {
	return profile === "private" ? "friends" : "public";
}

/** The profile sections a member can set (each takes a `Visibility`). */
export const PROFILE_SECTIONS = [
	"reads",
	"reviews",
	"favorites",
	"goals",
	"reading",
	"wishlist",
] as const;
export type ProfileSection = (typeof PROFILE_SECTIONS)[number];

/** Profile details with their own level; the rest follow the profile. */
export const PROFILE_DETAIL_FIELDS = [
	"dateOfBirth",
	"gender",
	"location",
] as const;
export type ProfileDetailField = (typeof PROFILE_DETAIL_FIELDS)[number];
