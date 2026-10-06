"use client";

import {
	BookOpen,
	LayoutList,
	LogOut,
	MessageSquare,
	Settings,
	Shield,
	User,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { UserPanel } from "@/components/blocks/user-panel";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type UserMenuUser = React.ComponentProps<typeof UserPanel>["user"];

type UserMenuItemsProps = {
	user: UserMenuUser;
	onNavigate?: () => void;
	itemClassName?: string;
	variant?: "default" | "drawer";
};

export function UserMenuItems({
	user,
	onNavigate,
	itemClassName,
	variant = "default",
}: UserMenuItemsProps) {
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	const handleSignOut = async () => {
		setLoading(true);
		try {
			await authClient.signOut();
			onNavigate?.();
			router.refresh();
		} catch {
			toast.error("Failed to sign out");
		} finally {
			setLoading(false);
		}
	};

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
			<button
				type="button"
				className={cn(
					itemClass,
					"text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-50",
				)}
				disabled={loading}
				onClick={handleSignOut}
			>
				<LogOut className="size-4 shrink-0" aria-hidden="true" />
				Sign out
			</button>
		</nav>
	);
}
