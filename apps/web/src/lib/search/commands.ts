import {
	type BookFilterSpec,
	getBookCountryName,
	parseBookFilterSegments,
	splitFilterSegments,
} from "@bbrc/shared";
import {
	Award,
	BookOpen,
	BookPlus,
	Clapperboard,
	Dices,
	Layers,
	LayoutList,
	LogIn,
	LogOut,
	type LucideIcon,
	Moon,
	PenLine,
	Plus,
	Send,
	Settings,
	Sofa,
	Target,
	Trophy,
	User,
	UserPen,
	UserPlus,
	Users,
} from "lucide-react";
import { adminNavSections } from "@/lib/admin-nav";

export type SearchCommandContext = {
	signedIn: boolean;
	isAdmin: boolean;
	username: string | null;
	/** Whether the ongoing-sitting lookup has finished. */
	ongoingLoaded: boolean;
	ongoing: { slug: string; viewerIsParticipant: boolean } | null;
};

export type CommandAction =
	| { kind: "navigate"; href: string }
	| { kind: "dialog"; dialog: "compose-post" | "create-goal" }
	| { kind: "random" }
	| { kind: "books" }
	| { kind: "theme" }
	| { kind: "signout" };

type CommandRequires = {
	auth?: boolean;
	admin?: boolean;
	nonAdmin?: boolean;
	guest?: boolean;
	participant?: boolean;
	noOngoing?: boolean;
};

export type SearchCommand = {
	id: string;
	/** Typed form, for example `settings:profile`. */
	keyword: string;
	aliases: string[];
	label: string;
	description: string;
	icon: LucideIcon;
	requires: CommandRequires;
	action: (ctx: SearchCommandContext) => CommandAction;
	/** `random` and `books` accept `:p<300:ir` style filters after the keyword. */
	acceptsFilters?: boolean;
	/** Shown in the idle list before anything is typed. */
	suggested?: boolean;
};

function navigate(href: string) {
	return () => ({ kind: "navigate", href }) as const;
}

function ownPath(suffix = "") {
	return (ctx: SearchCommandContext) =>
		({
			kind: "navigate",
			href: `/users/${ctx.username ?? ""}${suffix}`,
		}) as const;
}

const PROFILE_TABS = [
	{ key: "sittings", label: "Sittings", aliases: [] as string[] },
	{ key: "reads", label: "Reads", aliases: [] },
	{ key: "quizzes", label: "Quizzes", aliases: ["quiz"] },
	{ key: "posts", label: "Feed", aliases: ["feed"] },
	{ key: "feedbacks", label: "Feedbacks", aliases: ["reviews"] },
	{ key: "shelves", label: "Shelves", aliases: [] },
	{ key: "goals", label: "Goals", aliases: [] },
	{ key: "achievements", label: "Achievements", aliases: ["badges"] },
	{ key: "stats", label: "Stats", aliases: [] },
	{ key: "xp", label: "XP history", aliases: [] },
	{ key: "rp", label: "RP history", aliases: [] },
] as const;

const LEADERBOARD_BOARDS = [
	{ key: "xp", label: "XP" },
	{ key: "rp", label: "Reading points" },
	{ key: "reads", label: "Reads" },
	{ key: "posts", label: "Posts" },
	{ key: "participations", label: "Participations" },
] as const;

const SETTINGS_PAGES = [
	{
		key: "profile",
		label: "Profile settings",
		description: "Name, bio, photo and links",
	},
	{
		key: "notifications",
		label: "Notification settings",
		description: "What you hear about",
	},
	{
		key: "sessions",
		label: "Session settings",
		description: "Where you are signed in",
	},
	{
		key: "accounts",
		label: "Account settings",
		description: "Connected accounts",
	},
] as const;

/** Admin commands come from the admin navigation, so new pages appear on their own. */
function adminCommands(): SearchCommand[] {
	const seen = new Set<string>();
	const commands: SearchCommand[] = [];

	for (const section of adminNavSections) {
		for (const child of section.children) {
			const path = String(child.href).replace(/^\/admin\/?/, "");
			const keyword = path ? `admin:${path.split("/").join(":")}` : "admin";
			if (seen.has(keyword)) {
				continue;
			}
			seen.add(keyword);

			const isOverview =
				child.label === "Overview" || child.label === "Dashboard";
			commands.push({
				id: keyword,
				keyword,
				aliases:
					section.id === "members" && keyword.startsWith("admin:users")
						? [keyword.replace("admin:users", "admin:members")]
						: [],
				label: isOverview
					? `Admin · ${section.label}`
					: `Admin · ${section.label} ${child.label.toLowerCase()}`,
				description:
					keyword === "admin"
						? "Admin dashboard"
						: `Open the ${section.label.toLowerCase()} ${child.label.toLowerCase()} page`,
				icon: section.icon as LucideIcon,
				requires: { auth: true, admin: true },
				action: navigate(String(child.href)),
			});
		}
	}

	return commands;
}

export function buildSearchCommands(): SearchCommand[] {
	return [
		{
			id: "profile",
			keyword: "profile",
			aliases: ["me", "my-profile"],
			label: "My profile",
			description: "Open your profile",
			icon: User,
			requires: { auth: true },
			action: ownPath(),
			suggested: true,
		},
		...PROFILE_TABS.map(
			(tab): SearchCommand => ({
				id: `profile:${tab.key}`,
				keyword: `profile:${tab.key}`,
				aliases: tab.aliases.map((alias) => `profile:${alias}`),
				label: `My ${tab.label.toLowerCase()}`,
				description: `Open your ${tab.label.toLowerCase()} tab`,
				icon: User,
				requires: { auth: true },
				action: ownPath(`/${tab.key}`),
			}),
		),
		{
			id: "read",
			keyword: "read",
			aliases: ["current-sitting"],
			label: "Read",
			description: "Go to the sitting you are reading",
			icon: BookOpen,
			requires: { auth: true, participant: true },
			action: (ctx) => ({
				kind: "navigate",
				href: `/sittings/${ctx.ongoing?.slug ?? ""}`,
			}),
			suggested: true,
		},
		{
			id: "random",
			keyword: "random",
			aliases: ["lucky"],
			label: "Random book",
			description: "Pick a book for me. Add filters like :nr:p<400",
			icon: Dices,
			requires: {},
			action: () => ({ kind: "random" }),
			acceptsFilters: true,
			suggested: true,
		},
		{
			id: "settings",
			keyword: "settings",
			aliases: ["preferences"],
			label: "Settings",
			description: "Your account settings",
			icon: Settings,
			requires: { auth: true },
			action: navigate("/settings"),
			suggested: true,
		},
		...SETTINGS_PAGES.map(
			(page): SearchCommand => ({
				id: `settings:${page.key}`,
				keyword: `settings:${page.key}`,
				aliases: [],
				label: page.label,
				description: page.description,
				icon: Settings,
				requires: { auth: true },
				action: navigate(`/settings/${page.key}`),
			}),
		),
		{
			id: "authors",
			keyword: "authors",
			aliases: ["writers"],
			label: "Authors",
			description: "Writers in the club catalog",
			icon: UserPen,
			requires: {},
			action: navigate("/authors"),
		},
		{
			id: "books",
			keyword: "books",
			aliases: ["catalog"],
			label: "Books",
			description: "The club library. Add filters like :p<300:a[orwell]",
			icon: BookOpen,
			requires: {},
			action: () => ({ kind: "books" }),
			acceptsFilters: true,
			suggested: true,
		},
		{
			id: "shelves",
			keyword: "shelves",
			aliases: ["lists"],
			label: "Shelves",
			description: "Member-curated lists",
			icon: LayoutList,
			requires: {},
			action: navigate("/shelves"),
		},
		{
			id: "series",
			keyword: "series",
			aliases: [],
			label: "Series",
			description: "Multi-volume reading order",
			icon: Layers,
			requires: {},
			action: navigate("/series"),
		},
		{
			id: "people",
			keyword: "people",
			aliases: ["members", "users"],
			label: "People",
			description: "Everyone in the club",
			icon: Users,
			requires: {},
			action: navigate("/users"),
		},
		{
			id: "sittings",
			keyword: "sittings",
			aliases: [],
			label: "Sittings",
			description: "Club reading rounds",
			icon: Sofa,
			requires: {},
			action: navigate("/sittings"),
			suggested: true,
		},
		{
			id: "achievements",
			keyword: "achievements",
			aliases: ["badges"],
			label: "Achievements",
			description: "Badges you can earn",
			icon: Award,
			requires: {},
			action: navigate("/achievements"),
		},
		{
			id: "reels",
			keyword: "reels",
			aliases: [],
			label: "Reels",
			description: "Short fact replays from the club",
			icon: Clapperboard,
			requires: {},
			action: navigate("/reels"),
		},
		{
			id: "goals",
			keyword: "goals",
			aliases: ["my-goals"],
			label: "My goals",
			description: "Your reading goals",
			icon: Target,
			requires: { auth: true },
			action: ownPath("/goals"),
		},
		{
			id: "leaderboard",
			keyword: "leaderboard",
			aliases: ["ranking"],
			label: "Leaderboard",
			description: "XP, reads, and rankings",
			icon: Trophy,
			requires: {},
			action: navigate("/leaderboard/overview"),
			suggested: true,
		},
		...LEADERBOARD_BOARDS.map(
			(board): SearchCommand => ({
				id: `leaderboard:${board.key}`,
				keyword: `leaderboard:${board.key}`,
				aliases: [`ranking:${board.key}`],
				label: `Leaderboard · ${board.label}`,
				description: `Top members by ${board.label.toLowerCase()}`,
				icon: Trophy,
				requires: {},
				action: navigate(`/leaderboard/${board.key}`),
			}),
		),
		{
			id: "create:post",
			keyword: "create:post",
			aliases: ["new:post", "post"],
			label: "Create post",
			description: "Write a new post",
			icon: PenLine,
			requires: { auth: true },
			action: () => ({ kind: "dialog", dialog: "compose-post" }),
			suggested: true,
		},
		{
			id: "create:shelf",
			keyword: "create:shelf",
			aliases: ["new:shelf"],
			label: "Create shelf",
			description: "Start a new shelf",
			icon: Plus,
			requires: { auth: true },
			action: ownPath("/shelves/new"),
		},
		{
			id: "create:goal",
			keyword: "create:goal",
			aliases: ["new:goal"],
			label: "Create goal",
			description: "Set a reading goal",
			icon: Target,
			requires: { auth: true },
			action: () => ({ kind: "dialog", dialog: "create-goal" }),
		},
		{
			id: "create:sitting",
			keyword: "create:sitting",
			aliases: ["new:sitting"],
			label: "Create sitting",
			description: "Start a new reading round",
			icon: Sofa,
			requires: { auth: true, admin: true, noOngoing: true },
			action: navigate("/sittings/new"),
		},
		{
			id: "add",
			keyword: "add",
			aliases: ["add:book"],
			label: "Add a book",
			description: "Add a book to the library",
			icon: BookPlus,
			requires: { auth: true, admin: true },
			action: navigate("/books/new"),
		},
		{
			id: "request",
			keyword: "request",
			aliases: ["request:book"],
			label: "Request a book",
			description: "Ask admins to add a book",
			icon: Send,
			requires: { auth: true, nonAdmin: true },
			action: navigate("/books/request"),
		},
		...adminCommands(),
		{
			id: "theme",
			keyword: "theme",
			aliases: ["dark", "light", "dark-mode"],
			label: "Switch theme",
			description: "Toggle light and dark mode",
			icon: Moon,
			requires: {},
			action: () => ({ kind: "theme" }),
		},
		{
			id: "signout",
			keyword: "signout",
			aliases: ["logout", "sign-out", "log-out"],
			label: "Sign out",
			description: "Sign out of your account",
			icon: LogOut,
			requires: { auth: true },
			action: () => ({ kind: "signout" }),
		},
		{
			id: "signin",
			keyword: "signin",
			aliases: ["login", "sign-in", "log-in"],
			label: "Sign in",
			description: "Sign in to your account",
			icon: LogIn,
			requires: { guest: true },
			action: navigate("/sign-in"),
		},
		{
			id: "signup",
			keyword: "signup",
			aliases: ["register", "sign-up", "join"],
			label: "Sign up",
			description: "Create an account",
			icon: UserPlus,
			requires: { guest: true },
			action: navigate("/sign-up"),
		},
	];
}

export function isCommandAvailable(
	command: SearchCommand,
	ctx: SearchCommandContext,
): boolean {
	const { requires } = command;
	if (requires.guest && ctx.signedIn) return false;
	if (requires.auth && !ctx.signedIn) return false;
	if (requires.admin && !ctx.isAdmin) return false;
	if (requires.nonAdmin && ctx.isAdmin) return false;
	if (requires.participant && !ctx.ongoing?.viewerIsParticipant) return false;
	if (requires.noOngoing && (!ctx.ongoingLoaded || ctx.ongoing != null)) {
		return false;
	}
	return true;
}

export type CommandMatch = {
	command: SearchCommand;
	/** Text after the keyword for filter commands (`p<300:ir`), else null. */
	filtersText: string | null;
	score: number;
};

export type CommandSearchResult = {
	matches: CommandMatch[];
	/** Signed-out visitor typed a signed-in-only keyword. */
	signInHint: SearchCommand | null;
	/** More commands matched than fit; shown as a nudge to keep typing. */
	hiddenCount: number;
};

export function normalizeCommandQuery(raw: string): string {
	return raw.trim().toLowerCase().replace(/\s+/g, ":");
}

function namesOf(command: SearchCommand): string[] {
	return [command.keyword, ...command.aliases];
}

export function searchCommands(
	rawQuery: string,
	commands: SearchCommand[],
	ctx: SearchCommandContext,
	limit: number,
): CommandSearchResult {
	const query = normalizeCommandQuery(rawQuery);
	if (!query) {
		return { matches: [], signInHint: null, hiddenCount: 0 };
	}

	const all: CommandMatch[] = [];
	const hiddenByAuth: SearchCommand[] = [];
	const [root = ""] = splitFilterSegments(query);
	const rootEnd = query.indexOf(":");
	const hasFilterTail = rootEnd !== -1;

	commands.forEach((command, order) => {
		let match: CommandMatch | null = null;

		if (
			command.acceptsFilters &&
			hasFilterTail &&
			namesOf(command).includes(root)
		) {
			match = {
				command,
				filtersText: query.slice(rootEnd + 1),
				score: 0,
			};
		} else {
			const names = namesOf(command);
			// Without a colon only top-level names match, so "set" finds settings
			// but not every settings page; type "settings:" to see those.
			const prefixNames = query.includes(":")
				? names
				: names.filter((name) => !name.includes(":"));
			if (names.includes(query)) {
				match = { command, filtersText: null, score: 0 };
			} else if (prefixNames.some((name) => name.startsWith(query))) {
				match = { command, filtersText: null, score: 1 };
			}
		}

		if (!match) {
			return;
		}

		if (isCommandAvailable(command, ctx)) {
			all.push({ ...match, score: match.score * 1000 + order });
		} else {
			hiddenByAuth.push(command);
		}
	});

	all.sort((a, b) => a.score - b.score);

	const signInHint =
		all.length === 0 &&
		!ctx.signedIn &&
		hiddenByAuth.some((command) => command.requires.auth)
			? (commands.find((command) => command.id === "signin") ?? null)
			: null;

	return {
		matches: all.slice(0, limit),
		signInHint,
		hiddenCount: Math.max(0, all.length - limit),
	};
}

export function suggestedCommands(
	commands: SearchCommand[],
	ctx: SearchCommandContext,
	limit: number,
): SearchCommand[] {
	const available = commands.filter((command) =>
		isCommandAvailable(command, ctx),
	);
	const suggested = available.filter((command) => command.suggested);
	const fallback = available.filter(
		(command) => !command.suggested && !command.keyword.includes(":"),
	);
	return [...suggested, ...fallback].slice(0, limit);
}

/** Parses the text after a filter command's keyword; errors are meant for a toast. */
export function parseCommandFilters(
	filtersText: string | null,
): { ok: true; filters: BookFilterSpec } | { ok: false; error: string } {
	if (!filtersText) {
		return { ok: true, filters: {} };
	}
	return parseBookFilterSegments(splitFilterSegments(filtersText));
}

/** Plain-language summary of a filter set, for the command's description. */
export function describeBookFilters(filters: BookFilterSpec): string {
	const parts: string[] = [];

	if (filters.viewerRead === "read") parts.push("books I read");
	if (filters.viewerRead === "unread") parts.push("books I have not read");

	const range = (
		min: number | undefined,
		max: number | undefined,
		unit: string,
	) => {
		if (min != null && max != null) {
			parts.push(min === max ? `${min} ${unit}` : `${min}–${max} ${unit}`);
		} else if (min != null) {
			parts.push(`${min}+ ${unit}`);
		} else if (max != null) {
			parts.push(`up to ${max} ${unit}`);
		}
	};
	range(filters.minPages, filters.maxPages, "pages");
	if (filters.minPublishedIn != null && filters.maxPublishedIn != null) {
		parts.push(
			filters.minPublishedIn === filters.maxPublishedIn
				? `published ${filters.minPublishedIn}`
				: `published ${filters.minPublishedIn}–${filters.maxPublishedIn}`,
		);
	} else if (filters.minPublishedIn != null) {
		parts.push(`published ${filters.minPublishedIn} or later`);
	} else if (filters.maxPublishedIn != null) {
		parts.push(`published ${filters.maxPublishedIn} or earlier`);
	}
	range(filters.minReads, filters.maxReads, "reads");
	range(filters.minFeedbacks, filters.maxFeedbacks, "reviews");
	range(filters.minAverageRating, filters.maxAverageRating, "club rating");

	if (filters.authors?.length) parts.push(`by ${filters.authors.join(", ")}`);
	if (filters.countries?.length) {
		parts.push(
			filters.countries
				.map((code) => getBookCountryName(code) ?? code)
				.join(", "),
		);
	}
	if (filters.statuses?.length) parts.push(filters.statuses.join(" or "));

	return parts.length > 0 ? parts.join(" · ") : "any book";
}

/** Query string for `/books` that reproduces a filter set. */
export function bookFiltersToSearchParams(filters: BookFilterSpec): string {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(filters)) {
		if (value == null) {
			continue;
		}
		params.set(key, Array.isArray(value) ? value.join(",") : String(value));
	}
	return params.toString();
}
