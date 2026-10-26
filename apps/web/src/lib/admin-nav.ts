import {
	BookOpen,
	Eye,
	Feather,
	FileStack,
	FileText,
	LayoutDashboard,
	Library,
	ListChecks,
	ListOrdered,
	MessageCircle,
	MessageSquareQuote,
	Sparkles,
	Users,
	UsersRound,
} from "lucide-react";
import type { Route } from "next";
import { isAdminAuthorScreen } from "@/lib/admin-author-screens";

export type AdminNavChild = {
	href: Route;
	label: string;
	isActive: (pathname: string) => boolean;
};

export type AdminNavSection = {
	id: string;
	label: string;
	icon: typeof LayoutDashboard;
	sectionActive: (pathname: string) => boolean;
	defaultHref: Route;
	children: AdminNavChild[];
};

export const adminNavSections: AdminNavSection[] = [
	{
		id: "overview",
		label: "Overview",
		icon: LayoutDashboard,
		defaultHref: "/admin" as Route,
		sectionActive: (pathname) => pathname === "/admin",
		children: [
			{
				href: "/admin" as Route,
				label: "Dashboard",
				isActive: (pathname) => pathname === "/admin",
			},
		],
	},
	{
		id: "members",
		label: "Members",
		icon: Users,
		defaultHref: "/admin/users" as Route,
		sectionActive: (pathname) => pathname.startsWith("/admin/users"),
		children: [
			{
				href: "/admin/users" as Route,
				label: "Overview",
				isActive: (pathname) => pathname === "/admin/users",
			},
			{
				href: "/admin/users/list" as Route,
				label: "List",
				isActive: (pathname) => pathname.startsWith("/admin/users/list"),
			},
			{
				href: "/admin/users/stats" as Route,
				label: "Stats",
				isActive: (pathname) => pathname.startsWith("/admin/users/stats"),
			},
		],
	},
	{
		id: "books",
		label: "Books",
		icon: BookOpen,
		defaultHref: "/admin/books" as Route,
		sectionActive: (pathname) => pathname.startsWith("/admin/books"),
		children: [
			{
				href: "/admin/books" as Route,
				label: "Overview",
				isActive: (pathname) => pathname === "/admin/books",
			},
			{
				href: "/admin/books/list" as Route,
				label: "List",
				isActive: (pathname) => pathname.startsWith("/admin/books/list"),
			},
			{
				href: "/admin/books/stats" as Route,
				label: "Stats",
				isActive: (pathname) => pathname.startsWith("/admin/books/stats"),
			},
		],
	},
	{
		id: "authors",
		label: "Authors",
		icon: Feather,
		defaultHref: "/admin/authors" as Route,
		sectionActive: (pathname) =>
			pathname.startsWith("/admin/authors") || isAdminAuthorScreen(pathname),
		children: [
			{
				href: "/admin/authors" as Route,
				label: "Overview",
				isActive: (pathname) => pathname === "/admin/authors",
			},
			{
				href: "/admin/authors/list" as Route,
				label: "List",
				isActive: (pathname) =>
					pathname.startsWith("/admin/authors/list") ||
					pathname.startsWith("/admin/authors/edit") ||
					isAdminAuthorScreen(pathname),
			},
			{
				href: "/admin/authors/stats" as Route,
				label: "Stats",
				isActive: (pathname) => pathname.startsWith("/admin/authors/stats"),
			},
			{
				href: "/admin/authors/review" as Route,
				label: "Needs review",
				isActive: (pathname) => pathname.startsWith("/admin/authors/review"),
			},
			{
				href: "/admin/authors/backfill" as Route,
				label: "Backfill",
				isActive: (pathname) => pathname.startsWith("/admin/authors/backfill"),
			},
		],
	},
	{
		id: "series",
		label: "Series",
		icon: ListOrdered,
		defaultHref: "/admin/series" as Route,
		sectionActive: (pathname) => pathname.startsWith("/admin/series"),
		children: [
			{
				href: "/admin/series" as Route,
				label: "Overview",
				isActive: (pathname) => pathname === "/admin/series",
			},
			{
				href: "/admin/series/list" as Route,
				label: "List",
				isActive: (pathname) =>
					pathname.startsWith("/admin/series/list") ||
					pathname.startsWith("/admin/series/new") ||
					(/^\/admin\/series\/[^/]+$/.test(pathname) &&
						!pathname.startsWith("/admin/series/list") &&
						!pathname.startsWith("/admin/series/stats")),
			},
			{
				href: "/admin/series/stats" as Route,
				label: "Stats",
				isActive: (pathname) => pathname.startsWith("/admin/series/stats"),
			},
		],
	},
	{
		id: "sittings",
		label: "Sittings",
		icon: UsersRound,
		defaultHref: "/admin/sittings" as Route,
		sectionActive: (pathname) => pathname.startsWith("/admin/sittings"),
		children: [
			{
				href: "/admin/sittings" as Route,
				label: "Overview",
				isActive: (pathname) => pathname === "/admin/sittings",
			},
			{
				href: "/admin/sittings/list" as Route,
				label: "List",
				isActive: (pathname) => pathname.startsWith("/admin/sittings/list"),
			},
			{
				href: "/admin/sittings/stats" as Route,
				label: "Stats",
				isActive: (pathname) => pathname.startsWith("/admin/sittings/stats"),
			},
		],
	},
	{
		id: "feedbacks",
		label: "Feedbacks",
		icon: MessageSquareQuote,
		defaultHref: "/admin/feedbacks" as Route,
		sectionActive: (pathname) => pathname.startsWith("/admin/feedbacks"),
		children: [
			{
				href: "/admin/feedbacks" as Route,
				label: "Overview",
				isActive: (pathname) => pathname === "/admin/feedbacks",
			},
			{
				href: "/admin/feedbacks/list" as Route,
				label: "List",
				isActive: (pathname) => pathname.startsWith("/admin/feedbacks/list"),
			},
			{
				href: "/admin/feedbacks/stats" as Route,
				label: "Stats",
				isActive: (pathname) => pathname.startsWith("/admin/feedbacks/stats"),
			},
		],
	},
	{
		id: "shelves",
		label: "Shelves",
		icon: Library,
		defaultHref: "/admin/shelves" as Route,
		sectionActive: (pathname) => pathname.startsWith("/admin/shelves"),
		children: [
			{
				href: "/admin/shelves" as Route,
				label: "Overview",
				isActive: (pathname) => pathname === "/admin/shelves",
			},
			{
				href: "/admin/shelves/list" as Route,
				label: "List",
				isActive: (pathname) => pathname.startsWith("/admin/shelves/list"),
			},
			{
				href: "/admin/shelves/stats" as Route,
				label: "Stats",
				isActive: (pathname) => pathname.startsWith("/admin/shelves/stats"),
			},
		],
	},
	{
		id: "posts",
		label: "Posts",
		icon: FileText,
		defaultHref: "/admin/posts" as Route,
		sectionActive: (pathname) => pathname.startsWith("/admin/posts"),
		children: [
			{
				href: "/admin/posts" as Route,
				label: "Overview",
				isActive: (pathname) => pathname === "/admin/posts",
			},
			{
				href: "/admin/posts/list" as Route,
				label: "List",
				isActive: (pathname) => pathname.startsWith("/admin/posts/list"),
			},
			{
				href: "/admin/posts/stats" as Route,
				label: "Stats",
				isActive: (pathname) => pathname.startsWith("/admin/posts/stats"),
			},
		],
	},
	{
		id: "comments",
		label: "Comments",
		icon: MessageCircle,
		defaultHref: "/admin/comments" as Route,
		sectionActive: (pathname) => pathname.startsWith("/admin/comments"),
		children: [
			{
				href: "/admin/comments" as Route,
				label: "Overview",
				isActive: (pathname) => pathname === "/admin/comments",
			},
			{
				href: "/admin/comments/list" as Route,
				label: "List",
				isActive: (pathname) => pathname.startsWith("/admin/comments/list"),
			},
			{
				href: "/admin/comments/stats" as Route,
				label: "Stats",
				isActive: (pathname) => pathname.startsWith("/admin/comments/stats"),
			},
		],
	},
	{
		id: "documents",
		label: "Documents",
		icon: FileStack,
		defaultHref: "/admin/documents" as Route,
		sectionActive: (pathname) => pathname.startsWith("/admin/documents"),
		children: [
			{
				href: "/admin/documents" as Route,
				label: "Overview",
				isActive: (pathname) => pathname === "/admin/documents",
			},
			{
				href: "/admin/documents/list" as Route,
				label: "List",
				isActive: (pathname) => pathname.startsWith("/admin/documents/list"),
			},
			{
				href: "/admin/documents/stats" as Route,
				label: "Stats",
				isActive: (pathname) => pathname.startsWith("/admin/documents/stats"),
			},
		],
	},
	{
		id: "quizzes",
		label: "Quizzes",
		icon: ListChecks,
		defaultHref: "/admin/quizzes" as Route,
		sectionActive: (pathname) => pathname.startsWith("/admin/quizzes"),
		children: [
			{
				href: "/admin/quizzes" as Route,
				label: "Overview",
				isActive: (pathname) => pathname === "/admin/quizzes",
			},
			{
				href: "/admin/quizzes/list" as Route,
				label: "List",
				isActive: (pathname) => pathname.startsWith("/admin/quizzes/list"),
			},
			{
				href: "/admin/quizzes/stats" as Route,
				label: "Stats",
				isActive: (pathname) => pathname.startsWith("/admin/quizzes/stats"),
			},
		],
	},
	{
		id: "views",
		label: "Views",
		icon: Eye,
		defaultHref: "/admin/views" as Route,
		sectionActive: (pathname) => pathname.startsWith("/admin/views"),
		children: [
			{
				href: "/admin/views" as Route,
				label: "Overview",
				isActive: (pathname) => pathname === "/admin/views",
			},
			{
				href: "/admin/views/list" as Route,
				label: "List",
				isActive: (pathname) => pathname.startsWith("/admin/views/list"),
			},
			{
				href: "/admin/views/stats" as Route,
				label: "Stats",
				isActive: (pathname) => pathname.startsWith("/admin/views/stats"),
			},
		],
	},
	{
		id: "facts",
		label: "Facts",
		icon: Sparkles,
		defaultHref: "/admin/facts/create" as Route,
		sectionActive: (pathname) => pathname.startsWith("/admin/facts"),
		children: [
			{
				href: "/admin/facts/create" as Route,
				label: "Create",
				isActive: (pathname) => pathname.startsWith("/admin/facts/create"),
			},
			{
				href: "/admin/facts/inventory" as Route,
				label: "Inventory",
				isActive: (pathname) => pathname.startsWith("/admin/facts/inventory"),
			},
		],
	},
];
