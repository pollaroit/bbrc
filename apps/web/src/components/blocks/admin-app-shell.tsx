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
	SidebarProvider,
	SidebarRail,
	SidebarSeparator,
	SidebarTrigger,
} from "@bbrc/ui/components/sidebar";
import { BookOpen, Home, LayoutDashboard, Sparkles, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

const mainNav = [
	{
		href: "/admin",
		label: "Overview",
		icon: LayoutDashboard,
		match: (pathname: string) => pathname === "/admin",
	},
	{
		href: "/admin/users",
		label: "Members",
		icon: Users,
		match: (pathname: string) => pathname.startsWith("/admin/users"),
	},
	{
		href: "/admin/books",
		label: "Books",
		icon: BookOpen,
		match: (pathname: string) => pathname.startsWith("/admin/books"),
	},
	{
		href: "/admin/facts",
		label: "Facts",
		icon: Sparkles,
		match: (pathname: string) => pathname.startsWith("/admin/facts"),
	},
] as const;

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
								{mainNav.map((item) => (
									<SidebarMenuItem key={item.href}>
										<SidebarMenuButton
											render={<Link href={item.href as Route} />}
											isActive={item.match(pathname)}
											tooltip={item.label}
										>
											<item.icon />
											<span>{item.label}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
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
