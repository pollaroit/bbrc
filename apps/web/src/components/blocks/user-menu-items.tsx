"use client";

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
import Link from "next/link";
import {
	MobileChromeSheetSection,
	MobileSheetRowBody,
	MobileSheetRowIcon,
	mobileSheetRowClass,
} from "@/components/blocks/mobile-chrome-sheet";
import { UserAccountSignOutButton } from "@/components/blocks/user-account-sign-out-button";
import type { UserPanel } from "@/components/blocks/user-panel";
import { cn } from "@/lib/utils";

type UserMenuUser = React.ComponentProps<typeof UserPanel>["user"];

type UserMenuItemsProps = {
	user: UserMenuUser;
	onNavigate?: () => void;
	itemClassName?: string;
	variant?: "default" | "drawer";
	hideSignOut?: boolean;
};

type MenuEntry = {
	label: string;
	href: Route;
	icon: LucideIcon;
};

function drawerLinks(user: UserMenuUser): MenuEntry[] {
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
		{ label: "Settings", href: "/settings" as Route, icon: Settings },
	];
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

	if (variant === "drawer") {
		const links = drawerLinks(user);
		return (
			<nav className="flex flex-col pb-3">
				<MobileChromeSheetSection title="Your activity">
					<ul>
						{links.slice(0, 7).map((entry) => (
							<li key={entry.href}>
								<Link
									href={entry.href}
									className={itemClass}
									onClick={onNavigate}
								>
									<MobileSheetRowIcon icon={entry.icon} />
									<MobileSheetRowBody label={entry.label} />
								</Link>
							</li>
						))}
						<li>
							<Link
								href={`/users/${user.username}/reels` as Route}
								className={itemClass}
								onClick={onNavigate}
							>
								<span className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted/20 font-serif text-base">
									?
								</span>
								<MobileSheetRowBody label="My fact replays" />
							</Link>
						</li>
					</ul>
				</MobileChromeSheetSection>
				<MobileChromeSheetSection title="Account">
					<ul>
						<li>
							<Link
								href={"/settings" as Route}
								className={itemClass}
								onClick={onNavigate}
							>
								<MobileSheetRowIcon icon={Settings} />
								<MobileSheetRowBody label="Settings" />
							</Link>
						</li>
						{user.isAdmin ? (
							<>
								<li>
									<Link
										href={"/books/blocked" as Route}
										className={itemClass}
										onClick={onNavigate}
									>
										<MobileSheetRowIcon icon={BookOpen} />
										<MobileSheetRowBody label="Blocked works" />
									</Link>
								</li>
								<li>
									<Link
										href={"/admin" as Route}
										className={itemClass}
										onClick={onNavigate}
									>
										<MobileSheetRowIcon icon={Shield} />
										<MobileSheetRowBody label="Dashboard" />
									</Link>
								</li>
							</>
						) : null}
					</ul>
				</MobileChromeSheetSection>
			</nav>
		);
	}

	return (
		<nav className="flex flex-col">
			{drawerLinks(user).map((entry) => (
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
			<Link
				href={`/users/${user.username}/reels` as Route}
				className={itemClass}
				onClick={onNavigate}
			>
				<span className="flex size-4 shrink-0 items-center justify-center font-serif text-sm leading-none">
					?
				</span>
				My fact replays
			</Link>
			{user.isAdmin ? (
				<>
					<Link
						href={"/books/blocked" as Route}
						className={itemClass}
						onClick={onNavigate}
					>
						<BookOpen className="size-4 shrink-0" aria-hidden="true" />
						Blocked works
					</Link>
					<Link
						href={"/admin" as Route}
						className={itemClass}
						onClick={onNavigate}
					>
						<Shield className="size-4 shrink-0" aria-hidden="true" />
						Dashboard
					</Link>
				</>
			) : null}
			{hideSignOut ? null : (
				<UserAccountSignOutButton onSignedOut={onNavigate} />
			)}
		</nav>
	);
}
