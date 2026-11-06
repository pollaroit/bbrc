/*
 * The stats pages (a member's and the club's) are built from one list of sections.
 * This file is the pure half of that list: which tab a section sits on, what it is
 * made of (so privacy can decide whether a viewer may see it), and whether the club
 * page has it too. The web app maps each id to a component; adding a section is one
 * entry here and one component there.
 */

export const STATS_TABS = [
	"overview",
	"reading",
	"taste",
	"community",
	"club-life",
] as const;

export type StatsTab = (typeof STATS_TABS)[number];

export const STATS_TAB_LABELS: Record<StatsTab, string> = {
	overview: "Overview",
	reading: "Reading",
	taste: "Taste",
	community: "Community",
	"club-life": "Club life",
};

/** What a section is made of; each source has its own visibility rule. */
export const STATS_SOURCES = [
	"profile",
	"reads",
	"reviews",
	"readingActivity",
	"goals",
] as const;

export type StatsSource = (typeof STATS_SOURCES)[number];

/** Which sources a viewer may see for one member. */
export type StatsAccess = Record<StatsSource, boolean>;

export type StatsSectionDef = {
	id: string;
	tab: StatsTab;
	title: string;
	/** The data it is built from; the viewer needs that source to see it. */
	source: StatsSource;
	/** The club page has this section too (it needs data that exists for the whole club). */
	club: boolean;
};

export const STATS_SECTIONS: readonly StatsSectionDef[] = [
	// Overview
	{
		id: "scoreboard",
		tab: "overview",
		title: "Scoreboard",
		source: "reads",
		club: true,
	},
	{
		id: "books-read",
		tab: "overview",
		title: "Books read",
		source: "reads",
		club: false,
	},
	{
		id: "reads-over-time",
		tab: "overview",
		title: "Reads over time",
		source: "reads",
		club: true,
	},
	// Reading
	{
		id: "progress",
		tab: "reading",
		title: "Reading progress",
		source: "reads",
		club: true,
	},
	{
		id: "pace",
		tab: "reading",
		title: "Reading pace",
		source: "reads",
		club: true,
	},
	{
		id: "reading-time",
		tab: "reading",
		title: "Time and sessions",
		source: "readingActivity",
		club: true,
	},
	{
		id: "pages",
		tab: "reading",
		title: "Books by page count",
		source: "reads",
		club: true,
	},
	{
		id: "publication",
		tab: "reading",
		title: "Books by publication period",
		source: "reads",
		club: true,
	},
	// Taste
	{
		id: "subjects",
		tab: "taste",
		title: "Subjects",
		source: "reads",
		club: true,
	},
	{
		id: "authors",
		tab: "taste",
		title: "Authors",
		source: "reads",
		club: true,
	},
	{
		id: "countries",
		tab: "taste",
		title: "Countries",
		source: "reads",
		club: true,
	},
	{ id: "map", tab: "taste", title: "Map", source: "reads", club: true },
	{ id: "series", tab: "taste", title: "Series", source: "reads", club: true },
	{
		id: "club-rating",
		tab: "taste",
		title: "Books by club rating",
		source: "reads",
		club: true,
	},
	{
		id: "popular",
		tab: "taste",
		title: "Most and least popular reads",
		source: "reads",
		club: true,
	},
	{
		id: "rated-vs-club",
		tab: "taste",
		title: "Rated against the club",
		source: "reviews",
		club: false,
	},
	// Community
	{
		id: "reviews",
		tab: "community",
		title: "Reviews",
		source: "reviews",
		club: true,
	},
	{
		id: "posts",
		tab: "community",
		title: "Posts",
		source: "profile",
		club: true,
	},
	{
		id: "shelves",
		tab: "community",
		title: "Shelves",
		source: "profile",
		club: true,
	},
	{
		id: "friends",
		tab: "community",
		title: "Friends",
		source: "profile",
		club: true,
	},
	// Club life
	{
		id: "sittings",
		tab: "club-life",
		title: "Sittings",
		source: "profile",
		club: true,
	},
	{
		id: "goals",
		tab: "club-life",
		title: "Goals",
		source: "goals",
		club: true,
	},
	{
		id: "achievements",
		tab: "club-life",
		title: "Achievements",
		source: "profile",
		club: true,
	},
	{
		id: "standing",
		tab: "club-life",
		title: "XP and rank",
		source: "profile",
		club: true,
	},
];

export type StatsPage = "member" | "club";

/** The sections a viewer may see, in order. On the club page access is not per member. */
export function visibleStatsSections(
	access: StatsAccess,
	page: StatsPage = "member",
): StatsSectionDef[] {
	return STATS_SECTIONS.filter((section) =>
		page === "club" ? section.club : access[section.source],
	);
}

/** How many sections the viewer cannot see, for the one "some sections are private" note. */
export function hiddenStatsSectionCount(access: StatsAccess): number {
	return STATS_SECTIONS.filter((section) => !access[section.source]).length;
}

/** The tabs that still have a section for this viewer; an empty tab is not shown. */
export function visibleStatsTabs(
	sections: readonly StatsSectionDef[],
): StatsTab[] {
	const present = new Set(sections.map((section) => section.tab));
	return STATS_TABS.filter((tab) => present.has(tab));
}

export const NO_STATS_ACCESS: StatsAccess = {
	profile: false,
	reads: false,
	reviews: false,
	readingActivity: false,
	goals: false,
};

export const FULL_STATS_ACCESS: StatsAccess = {
	profile: true,
	reads: true,
	reviews: true,
	readingActivity: true,
	goals: true,
};

export function isStatsTab(value: unknown): value is StatsTab {
	return (STATS_TABS as readonly unknown[]).includes(value);
}
