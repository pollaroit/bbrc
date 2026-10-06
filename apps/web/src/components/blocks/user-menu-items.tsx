"use client";

import {
	BookOpen,
	LayoutList,
	MessageSquare,
	Settings,
	Shield,
	User,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
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

export function UserMenuItems({
	user,
	onNavigate,
	itemClassName,
	variant = "default",
	hideSignOut = false,
}: UserMenuItemsProps) {
	const itemClass = cn(
		"flex w-full items-center gap-3 text-left text-sm transition-colors",
		variant === "drawer"
			? "border-border border-b px-4 py-3.5 last:border-b-0 hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
			: "px-3 py-2.5 hover:bg-muted",
		itemClassName,
	);

	return (
		<nav className={cn("flex flex-col", variant === "drawer" && "pb-2")}>
			<Link
				href={`/users/${user.username}` as Route}
				className={itemClass}
				onClick={onNavigate}
			>
				<User className="size-4 shrink-0" aria-hidden="true" />
				Profile
			</Link>
			<Link
				href={`/users/${user.username}/posts` as Route}
				className={itemClass}
				onClick={onNavigate}
			>
				<MessageSquare className="size-4 shrink-0" aria-hidden="true" />
				My posts
			</Link>
			<Link
				href={`/users/${user.username}/feedbacks` as Route}
				className={itemClass}
				onClick={onNavigate}
			>
				<BookOpen className="size-4 shrink-0" aria-hidden="true" />
				My feedbacks
			</Link>
			<Link
				href={`/users/${user.username}/shelves` as Route}
				className={itemClass}
				onClick={onNavigate}
			>
				<LayoutList className="size-4 shrink-0" aria-hidden="true" />
				My shelves
			</Link>
			<Link
				href={"/settings" as Route}
				className={itemClass}
				onClick={onNavigate}
			>
				<Settings className="size-4 shrink-0" aria-hidden="true" />
				Settings
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
				<UserAccountSignOutButton
					onSignedOut={onNavigate}
					className={
						variant === "drawer"
							? "border-border border-b last:border-b-0"
							: undefined
					}
				/>
			)}
		</nav>
	);
}
