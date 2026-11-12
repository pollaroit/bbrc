import {
	BarChart3,
	BookCheck,
	BookCopy,
	BookOpen,
	Ellipsis,
	Eye,
	FileStack,
	FileText,
	Heart,
	LayoutDashboard,
	Library,
	ListChecks,
	type LucideIcon,
	Star,
	Users,
} from "lucide-react";
import type { Route } from "next";
import type { BookTone } from "@/lib/book-tones";

export type BookDetailTabId =
	| "overview"
	| "about"
	| "editions"
	| "documents"
	| "shelves"
	| "reviews"
	| "reads"
	| "reading"
	| "sittings"
	| "stats"
	| "favorites"
	| "quizzes"
	| "insights"
	| "more";

export type BookDetailTab = {
	id: BookDetailTabId;
	label: string;
	icon: LucideIcon;
	/** The colour the tab wears when it is open. */
	tone: BookTone;
	href: (slug: string) => Route;
};

export const BOOK_DETAIL_TABS: BookDetailTab[] = [
	{
		id: "overview",
		label: "Overview",
		icon: LayoutDashboard,
		tone: "info",
		href: (slug) => `/books/${slug}` as Route,
	},
	{
		id: "about",
		label: "About",
		icon: FileText,
		tone: "violet",
		href: (slug) => `/books/${slug}/about` as Route,
	},
	{
		id: "editions",
		label: "Editions",
		icon: BookCopy,
		tone: "pink",
		href: (slug) => `/books/${slug}/editions` as Route,
	},
	{
		id: "documents",
		label: "Documents",
		icon: FileStack,
		tone: "info",
		href: (slug) => `/books/${slug}/documents` as Route,
	},
	{
		id: "shelves",
		label: "Shelves",
		icon: Library,
		tone: "violet",
		href: (slug) => `/books/${slug}/shelves` as Route,
	},
	{
		id: "reviews",
		label: "Reviews",
		icon: Star,
		tone: "warning",
		href: (slug) => `/books/${slug}/reviews` as Route,
	},
	{
		id: "reads",
		label: "Reads",
		icon: BookCheck,
		tone: "success",
		href: (slug) => `/books/${slug}/reads` as Route,
	},
	{
		id: "reading",
		label: "Reading",
		icon: BookOpen,
		tone: "info",
		href: (slug) => `/books/${slug}/reading` as Route,
	},
	{
		id: "sittings",
		label: "Sittings",
		icon: Users,
		tone: "pink",
		href: (slug) => `/books/${slug}/sittings` as Route,
	},
	{
		id: "stats",
		label: "Stats",
		icon: BarChart3,
		tone: "success",
		href: (slug) => `/books/${slug}/stats` as Route,
	},
	{
		id: "favorites",
		label: "Favorites",
		icon: Heart,
		tone: "pink",
		href: (slug) => `/books/${slug}/favorites` as Route,
	},
	{
		id: "quizzes",
		label: "Quizzes",
		icon: ListChecks,
		tone: "warning",
		href: (slug) => `/books/${slug}/quizzes` as Route,
	},
	{
		id: "insights",
		label: "Insights",
		icon: Eye,
		tone: "info",
		href: (slug) => `/books/${slug}/insights` as Route,
	},
	{
		id: "more",
		label: "More",
		icon: Ellipsis,
		tone: "violet",
		href: (slug) => `/books/${slug}/more` as Route,
	},
];

export function bookDetailTabFromPathname(
	slug: string,
	pathname: string,
): BookDetailTabId {
	const base = `/books/${slug}`;
	if (pathname === base || pathname === `${base}/`) {
		return "overview";
	}
	for (const tab of BOOK_DETAIL_TABS) {
		if (tab.id === "overview") {
			continue;
		}
		const href = tab.href(slug);
		if (pathname === href || pathname.startsWith(`${href}/`)) {
			return tab.id;
		}
	}
	return "overview";
}
