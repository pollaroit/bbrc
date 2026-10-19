import type { LucideIcon } from "lucide-react";
import { Layers, LayoutList, Sofa, Trophy, UserPen, Users } from "lucide-react";
import type { Route } from "next";
import { isMobileNavActive } from "@/lib/mobile-nav-active";

export type BrowseNavItem = {
	label: string;
	href: Route;
	icon: LucideIcon;
	description?: string;
	section: "catalog" | "club";
};

export const browseNavItems: BrowseNavItem[] = [
	{
		label: "Authors",
		href: "/authors" as Route,
		icon: UserPen,
		description: "Writers in the club catalog",
		section: "catalog",
	},
	{
		label: "Series",
		href: "/series" as Route,
		icon: Layers,
		description: "Multi-volume reading order",
		section: "catalog",
	},
	{
		label: "Shelves",
		href: "/shelves" as Route,
		icon: LayoutList,
		description: "Member-curated lists",
		section: "catalog",
	},
	{
		label: "Sittings",
		href: "/sittings" as Route,
		icon: Sofa,
		description: "Club reading rounds",
		section: "club",
	},
	{
		label: "Leaderboard",
		href: "/leaderboard/overview" as Route,
		icon: Trophy,
		description: "XP, reads, and rankings",
		section: "club",
	},
];

export type BrowseNavPlaceholderItem = {
	label: string;
	description: string;
	icon?: LucideIcon;
};

export const browseNavPlaceholderItems: BrowseNavPlaceholderItem[] = [
	{ label: "Members", icon: Users, description: "Coming soon" },
	{ label: "Achievements", description: "Coming soon" },
	{ label: "Club stats", description: "Coming soon" },
];

export function isBrowseNavActive(pathname: string): boolean {
	if (browseNavItems.some((item) => isMobileNavActive(pathname, item.href))) {
		return true;
	}

	return pathname.startsWith("/leaderboard");
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
	{ id: "catalog" as const, label: "Catalog" },
	{ id: "club" as const, label: "Club" },
];
