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
import { type AdminNavSection, adminNavSections } from "@/lib/admin-nav";
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
