import type { LucideIcon } from "lucide-react";
import { Layers, LayoutList, Sofa, Trophy, UserPen, Users } from "lucide-react";
import type { Route } from "next";
import { isMobileNavActive } from "@/lib/mobile-nav-active";

export type BrowseNavItem = {
	label: string;
	href: Route;
	icon: LucideIcon;
	description?: string;
};

export const browseNavItems: BrowseNavItem[] = [
	{
		label: "Authors",
		href: "/authors" as Route,
		icon: UserPen,
		description: "Writers in the club catalog",
	},
	{
		label: "Series",
		href: "/series" as Route,
		icon: Layers,
		description: "Multi-volume reading order",
	},
	{
		label: "Shelves",
		href: "/shelves" as Route,
		icon: LayoutList,
		description: "Member-curated book lists",
	},
	{
		label: "Sittings",
		href: "/sittings" as Route,
		icon: Sofa,
		description: "Club reading rounds",
	},
	{
		label: "Leaderboard",
		href: "/leaderboard/overview" as Route,
		icon: Trophy,
		description: "XP, reads, and rankings",
	},
	{
		label: "Members",
		href: "/users" as Route,
		icon: Users,
		description: "The brigade",
	},
];

export const browseNavPlaceholderItems = [
	{ label: "Achievements", description: "Coming soon" },
	{ label: "Club stats", description: "Coming soon" },
] as const;

export function isBrowseNavActive(pathname: string): boolean {
	if (browseNavItems.some((item) => isMobileNavActive(pathname, item.href))) {
		return true;
	}

	return pathname.startsWith("/leaderboard");
}

/** Shared browse destinations for desktop dropdown (excludes top-level duplicates if any). */
export const browseMenuItems: BrowseNavItem[] = browseNavItems.filter(
	(item) => item.href !== "/sittings",
);
