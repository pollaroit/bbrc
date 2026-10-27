"use client";

import {
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
} from "@bbrc/ui/components/dropdown-menu";
import type { LucideIcon } from "lucide-react";
import {
	BarChart3,
	BookCheck,
	BookOpen,
	LayoutList,
	MessageSquare,
	Settings,
	Shield,
	Target,
	User,
} from "lucide-react";
import type { Route } from "next";
import {
	MobileChromeSheetSection,
	MobileSheetRowBody,
	MobileSheetRowIcon,
	mobileSheetRowClass,
} from "@/components/blocks/mobile-chrome-sheet";
import { UserAccountSignOutButton } from "@/components/blocks/user-account-sign-out-button";
import type { UserPanel } from "@/components/blocks/user-panel";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type UserMenuUser = React.ComponentProps<typeof UserPanel>["user"];

type UserMenuItemsProps = {
	user: UserMenuUser;
	onNavigate?: () => void;
	itemClassName?: string;
	variant?: "default" | "drawer" | "dropdown";
	hideSignOut?: boolean;
};

type MenuEntry = {
	label: string;
	href: Route;
	icon: LucideIcon;
};

function userMenuActivityEntries(user: UserMenuUser): MenuEntry[] {
	const base = `/users/${user.username}` as Route;
	return [
		{ label: "Profile", href: base, icon: User },
		{ label: "My reads", href: `${base}/reads` as Route, icon: BookCheck },
		{ label: "My posts", href: `${base}/posts` as Route, icon: MessageSquare },
		{
			label: "My feedbacks",
			href: `${base}/feedbacks` as Route,
			icon: BookOpen,
		},
		{ label: "My shelves", href: `${base}/shelves` as Route, icon: LayoutList },
		{ label: "My goals", href: `${base}/goals` as Route, icon: Target },
		{ label: "My stats", href: `${base}/stats` as Route, icon: BarChart3 },
	];
}

function userMenuAccountEntries(user: UserMenuUser): MenuEntry[] {
	const entries: MenuEntry[] = [
		{ label: "Settings", href: "/settings" as Route, icon: Settings },
	];
	if (user.isAdmin) {
		entries.push(
			{
				label: "Blocked works",
				href: "/books/blocked" as Route,
				icon: BookOpen,
			},
			{ label: "Dashboard", href: "/admin" as Route, icon: Shield },
		);
	}
	return entries;
}

function factReplaysHref(user: UserMenuUser): Route {
	return `/users/${user.username}/reels` as Route;
}

export function UserMenuItems({
	user,
	onNavigate,
	itemClassName,
	variant = "default",
	hideSignOut = false,
}: UserMenuItemsProps) {
	const itemClass = cn(
		"flex w-full items-center gap-3 text-left text-sm transition-colors",
		variant === "drawer" ? mobileSheetRowClass : "px-3 py-2.5 hover:bg-muted",
		itemClassName,
	);

	const activity = userMenuActivityEntries(user);
	const account = userMenuAccountEntries(user);
	const reelsHref = factReplaysHref(user);

	if (variant === "dropdown") {
		return (
			<>
				<DropdownMenuGroup>
					<DropdownMenuLabel className="text-muted-foreground text-xs">
						Your activity
					</DropdownMenuLabel>
					{activity.map((entry) => (
						<DropdownMenuItem
							key={entry.href}
							render={
								<Link href={entry.href} onClick={onNavigate} prefetch={false} />
							}
							nativeButton={false}
						>
							<entry.icon aria-hidden />
							{entry.label}
						</DropdownMenuItem>
					))}
					<DropdownMenuItem
						render={
							<Link href={reelsHref} onClick={onNavigate} prefetch={false} />
						}
						nativeButton={false}
					>
						<span className="flex size-4 shrink-0 items-center justify-center font-serif text-sm leading-none">
							?
						</span>
						My fact replays
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuLabel className="text-muted-foreground text-xs">
						Account
					</DropdownMenuLabel>
					{account.map((entry) => (
						<DropdownMenuItem
							key={entry.href}
							render={
								<Link href={entry.href} onClick={onNavigate} prefetch={false} />
							}
							nativeButton={false}
						>
							<entry.icon aria-hidden />
							{entry.label}
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
			</>
		);
	}

	const drawerRowClass = cn(mobileSheetRowClass, "gap-2.5 py-2", itemClassName);

	if (variant === "drawer") {
		return (
			<nav className="flex flex-col pb-2">
				<MobileChromeSheetSection
					title="Your activity"
					className="[&_h3]:pt-2 [&_h3]:pb-0.5"
				>
					<ul>
						{activity.map((entry) => (
							<li key={entry.href}>
								<Link
									href={entry.href}
									className={drawerRowClass}
									onClick={onNavigate}
								>
									<MobileSheetRowIcon icon={entry.icon} compact />
									<MobileSheetRowBody label={entry.label} />
								</Link>
							</li>
						))}
						<li>
							<Link
								href={reelsHref}
								className={drawerRowClass}
								onClick={onNavigate}
							>
								<span className="flex size-8 shrink-0 items-center justify-center border border-border bg-muted/20 font-serif text-sm">
									?
								</span>
								<MobileSheetRowBody label="My fact replays" />
							</Link>
						</li>
					</ul>
				</MobileChromeSheetSection>
				<MobileChromeSheetSection
					title="Account"
					className="[&_h3]:pt-2 [&_h3]:pb-0.5"
				>
					<ul>
						{account.map((entry) => (
							<li key={entry.href}>
								<Link
									href={entry.href}
									className={drawerRowClass}
									onClick={onNavigate}
								>
									<MobileSheetRowIcon icon={entry.icon} compact />
									<MobileSheetRowBody label={entry.label} />
								</Link>
							</li>
						))}
					</ul>
				</MobileChromeSheetSection>
			</nav>
		);
	}

	return (
		<nav className="flex flex-col">
			{activity.map((entry) => (
				<Link
					key={entry.href}
					href={entry.href}
					className={itemClass}
					onClick={onNavigate}
				>
					<entry.icon className="size-4 shrink-0" aria-hidden="true" />
					{entry.label}
				</Link>
			))}
			<Link href={reelsHref} className={itemClass} onClick={onNavigate}>
				<span className="flex size-4 shrink-0 items-center justify-center font-serif text-sm leading-none">
					?
				</span>
				My fact replays
			</Link>
			{account.map((entry) => (
				<Link
					key={entry.href}
					href={entry.href}
					className={itemClass}
					onClick={onNavigate}
				>
					<entry.icon className="size-4 shrink-0" aria-hidden="true" />
					{entry.label}
				</Link>
			))}
			{hideSignOut ? null : (
				<UserAccountSignOutButton onSignedOut={onNavigate} />
			)}
		</nav>
	);
}
