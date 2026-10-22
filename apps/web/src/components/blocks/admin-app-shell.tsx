"use client";

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarRail,
	SidebarSeparator,
	SidebarTrigger,
} from "@bbrc/ui/components/sidebar";
import {
	BookOpen,
	ChevronRight,
	FileStack,
	FileText,
	Home,
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
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const ADMIN_NAV_OPEN_STORAGE_KEY = "bbrc-admin-nav-open";

function readAdminNavOpenState(): Record<string, boolean> {
	try {
		const raw = localStorage.getItem(ADMIN_NAV_OPEN_STORAGE_KEY);
		if (!raw) {
			return {};
		}
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== "object" || parsed === null) {
			return {};
		}
		return parsed as Record<string, boolean>;
	} catch {
		return {};
	}
}

function writeAdminNavOpenState(sectionId: string, open: boolean) {
	try {
		const stored = readAdminNavOpenState();
		localStorage.setItem(
			ADMIN_NAV_OPEN_STORAGE_KEY,
			JSON.stringify({ ...stored, [sectionId]: open }),
		);
	} catch {
		// private mode / quota
	}
}

type AdminNavChild = {
	href: Route;
	label: string;
	isActive: (pathname: string) => boolean;
};

type AdminNavSection = {
	id: string;
	label: string;
	icon: typeof LayoutDashboard;
	sectionActive: (pathname: string) => boolean;
	defaultHref: Route;
	children: AdminNavChild[];
};

const adminNavSections: AdminNavSection[] = [
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
				label: "Quizzes",
				isActive: (pathname) => pathname.startsWith("/admin/quizzes"),
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

function AdminSidebarNavItem({
	section,
	pathname,
}: {
	section: AdminNavSection;
	pathname: string;
}) {
	const sectionIsActive = section.sectionActive(pathname);
	const showSubMenu = section.children.length > 1;
	const wasActiveRef = useRef(sectionIsActive);

	const [subMenuOpen, setSubMenuOpen] = useState(sectionIsActive);

	useEffect(() => {
		const stored = readAdminNavOpenState()[section.id];
		if (stored !== undefined) {
			setSubMenuOpen(stored);
		}
	}, [section.id]);

	useEffect(() => {
		if (sectionIsActive && !wasActiveRef.current) {
			setSubMenuOpen(true);
			writeAdminNavOpenState(section.id, true);
		}
		wasActiveRef.current = sectionIsActive;
	}, [section.id, sectionIsActive]);

	const setSubMenuOpenPersisted = (open: boolean) => {
		setSubMenuOpen(open);
		writeAdminNavOpenState(section.id, open);
	};

	if (!showSubMenu) {
		return (
			<SidebarMenuItem>
				<SidebarMenuButton
					render={<Link href={section.defaultHref} />}
					isActive={sectionIsActive}
					tooltip={section.label}
				>
					<section.icon />
					<span>{section.label}</span>
				</SidebarMenuButton>
			</SidebarMenuItem>
		);
	}

	return (
		<SidebarMenuItem>
			<SidebarMenuButton
				type="button"
				isActive={sectionIsActive}
				tooltip={section.label}
				aria-expanded={subMenuOpen}
				onClick={() => setSubMenuOpenPersisted(!subMenuOpen)}
			>
				<section.icon />
				<span>{section.label}</span>
				<ChevronRight
					className={cn(
						"ml-auto size-4 shrink-0 transition-transform duration-200",
						subMenuOpen && "rotate-90",
					)}
					aria-hidden
				/>
			</SidebarMenuButton>
			{subMenuOpen ? (
				<SidebarMenuSub>
					{section.children.map((child) => (
						<SidebarMenuSubItem key={child.href}>
							<SidebarMenuSubButton
								render={<Link href={child.href} />}
								isActive={child.isActive(pathname)}
							>
								<span>{child.label}</span>
							</SidebarMenuSubButton>
						</SidebarMenuSubItem>
					))}
				</SidebarMenuSub>
			) : null}
		</SidebarMenuItem>
	);
}

export function AdminAppShell({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();

	return (
		<SidebarProvider className="min-h-dvh w-full md:min-h-[calc(100dvh-4rem)]">
			<Sidebar
				collapsible="icon"
				variant="sidebar"
				className="top-0 h-dvh md:top-16 md:h-[calc(100svh-4rem)]"
			>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>Resources</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{adminNavSections.map((section) => (
									<AdminSidebarNavItem
										key={section.id}
										section={section}
										pathname={pathname}
									/>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
				<SidebarFooter className="pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pb-2">
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton
								render={<Link href={"/" as Route} />}
								tooltip="Back to club"
							>
								<Home />
								<span>Back to club</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>
				<SidebarRail />
			</Sidebar>
			<SidebarInset className="min-w-0">
				<header className="flex h-12 shrink-0 items-center gap-2 border-border border-b px-4">
					<SidebarTrigger />
					<SidebarSeparator
						orientation="vertical"
						className="mr-2 data-[orientation=vertical]:h-4"
					/>
					<span className="text-muted-foreground text-sm">
						Club administration
					</span>
				</header>
				<div className="flex min-w-0 flex-col gap-8 p-6">{children}</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
