import type { ProfileSection } from "./levels";

/*
 * Every kind of thing a viewer can be allowed or refused, and where its
 * visibility comes from. Nothing else decides visibility: reads, notifications,
 * OG cards, the sitemap and the feeds all go through this table.
 *
 * To add a resource, add an entry here (and its where-builder in the API's
 * visibility module). The registry test fails if an entry is missing or odd.
 */

/**
 * - `profile`: the owner's profile level caps it.
 * - `section`: one of the owner's profile section settings applies.
 * - `item`: the item carries its own level.
 * - `parent`: its level is its parent's (a comment follows its post).
 * - `ignoresOwnerProfile`: the owner's own profile level does not apply, only the parent's:
 *   a comment or like on a public post is public space.
 * - `clubLevel`: not restricted by the owner at all (a sitting participant).
 */
export type ResourcePolicy = {
	profile: boolean;
	section?: ProfileSection;
	item?: boolean;
	parent?: ResourceKind;
	ignoresOwnerProfile?: boolean;
	clubLevel?: boolean;
	/** One line for whoever reads this table. */
	note: string;
};

export const RESOURCE_KINDS = [
	"post",
	"comment",
	"like",
	"postPoll",
	"tierlist",
	"shelf",
	"shelfBook",
	"wishlist",
	"review",
	"goal",
	"read",
	"favorite",
	"reading",
	"achievement",
	"xpEvent",
	"stats",
	"quizResult",
	"sittingHistory",
	"participation",
	"profileDetails",
	"friendList",
] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];

export const VISIBILITY_REGISTRY: Record<ResourceKind, ResourcePolicy> = {
	post: {
		profile: true,
		item: true,
		note: "A post has its own level, capped by the author's profile.",
	},
	comment: {
		profile: false,
		parent: "post",
		ignoresOwnerProfile: true,
		note: "A reply in someone else's conversation is public space: it follows its post only.",
	},
	like: {
		profile: false,
		parent: "post",
		ignoresOwnerProfile: true,
		note: "Same as a comment.",
	},
	postPoll: {
		profile: false,
		parent: "post",
		note: "Poll, ballots and results follow the post.",
	},
	tierlist: {
		profile: false,
		parent: "post",
		note: "A tierlist belongs to its post.",
	},
	shelf: {
		profile: true,
		item: true,
		note: "Own level (3 levels), capped by the owner's profile. Collaborators and invitees keep their own access.",
	},
	shelfBook: {
		profile: false,
		parent: "shelf",
		note: "Books on a shelf follow the shelf.",
	},
	wishlist: {
		profile: true,
		section: "wishlist",
		item: true,
		note: "The wishlist is a shelf with its own section setting; default Only me.",
	},
	review: {
		profile: true,
		section: "reviews",
		item: true,
		note: "The member's own content: their reviews setting, the item's level and the profile.",
	},
	goal: {
		profile: true,
		section: "goals",
		item: true,
		note: "Goals setting, the item's level and the profile.",
	},
	read: {
		profile: true,
		section: "reads",
		note: "Reads setting and the profile.",
	},
	favorite: {
		profile: true,
		section: "favorites",
		note: "Favourites setting and the profile.",
	},
	reading: {
		profile: true,
		section: "reading",
		note: "Currently reading setting and the profile.",
	},
	achievement: { profile: true, note: "Follows the profile." },
	xpEvent: { profile: true, note: "XP and RP events follow the profile." },
	stats: { profile: true, note: "A member's own stats follow the profile." },
	quizResult: { profile: true, note: "Follows the profile." },
	sittingHistory: {
		profile: true,
		note: "Sitting history follows the profile.",
	},
	participation: {
		profile: false,
		clubLevel: true,
		note: "Taking part in a sitting is club activity: participants always see each other.",
	},
	profileDetails: {
		profile: true,
		note: "Date of birth, gender and location have their own levels; the rest follow the profile.",
	},
	friendList: {
		profile: false,
		note: "The owner and their friends see the list; everyone else sees only the count.",
	},
};
