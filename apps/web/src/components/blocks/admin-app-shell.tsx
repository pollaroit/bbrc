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
	Home,
	LayoutDashboard,
	MessageSquareQuote,
	Sparkles,
	Users,
	UsersRound,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
			{showSubMenu ? (
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
			<SidebarInset>
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
				<div className="flex flex-col gap-8 p-6">{children}</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
