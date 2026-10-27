import type { LucideIcon } from "lucide-react";
import {
	Award,
	Clapperboard,
	Layers,
	LayoutList,
	Sofa,
	Trophy,
	UserPen,
	Users,
} from "lucide-react";
import type { Route } from "next";
import { isMobileNavActive } from "@/lib/mobile-nav-active";

export type BrowseNavId =
	| "authors"
	| "series"
	| "shelves"
	| "people"
	| "achievements"
	| "sittings"
	| "leaderboard"
	| "reels";

/** The texts of a destination live in the `shell.browse.items.<id>` messages. */
export type BrowseNavItem = {
	id: BrowseNavId;
	href: Route;
	icon: LucideIcon;
	section: "catalog" | "club";
};

export const browseNavItems: BrowseNavItem[] = [
	{
		id: "authors",
		href: "/authors" as Route,
		icon: UserPen,
		section: "catalog",
	},
	{
		id: "series",
		href: "/series" as Route,
		icon: Layers,
		section: "catalog",
	},
	{
		id: "shelves",
		href: "/shelves" as Route,
		icon: LayoutList,
		section: "catalog",
	},
	{
		id: "people",
		href: "/users" as Route,
		icon: Users,
		section: "club",
	},
	{
		id: "achievements",
		href: "/achievements" as Route,
		icon: Award,
		section: "club",
	},
	{
		id: "sittings",
		href: "/sittings" as Route,
		icon: Sofa,
		section: "club",
	},
	{
		id: "leaderboard",
		href: "/leaderboard/overview" as Route,
		icon: Trophy,
		section: "club",
	},
	{
		id: "reels",
		href: "/reels" as Route,
		icon: Clapperboard,
		section: "club",
	},
];

export type BrowseNavPlaceholderItem = {
	id: "clubStats";
	icon?: LucideIcon;
};

export const browseNavPlaceholderItems: BrowseNavPlaceholderItem[] = [
	{ id: "clubStats" },
];

export function isBrowseNavActive(pathname: string): boolean {
	if (browseNavItems.some((item) => isMobileNavActive(pathname, item.href))) {
		return true;
	}

	if (pathname.startsWith("/leaderboard") || pathname.startsWith("/reels")) {
		return true;
	}

	return false;
}

export function isBrowseNavItemActive(pathname: string, href: Route): boolean {
	const hrefString = href as string;
	if (hrefString.startsWith("/leaderboard")) {
		return pathname.startsWith("/leaderboard");
	}
	return isMobileNavActive(pathname, href);
}

/** Shared browse destinations for desktop dropdown (excludes top-level duplicates if any). */
export const browseMenuItems: BrowseNavItem[] = browseNavItems.filter(
	(item) => item.href !== "/sittings",
);

export const browseNavSections = [
	{ id: "catalog" as const },
	{ id: "club" as const },
];
