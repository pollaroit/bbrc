"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
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
import { authClient } from "@/lib/auth-client";
import { UserPanel } from "./user-panel";

interface Props extends React.ComponentProps<typeof UserPanel> {}

export function UserMenu({ ...props }: Props) {
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	const handleSignOut = async () => {
		setLoading(true);

		try {
			await authClient.signOut();
			router.refresh();
		} catch {
			toast.error("Failed to sign out");
		} finally {
			setLoading(false);
		}
	};
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						className="h-auto justify-start px-2 py-1.5 text-left font-normal"
					/>
				}
			>
				<UserPanel {...props} />
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end">
				<DropdownMenuItem
					className="cursor-pointer"
					render={<Link href={`/users/${props.user.username}` as Route} />}
				>
					<User /> Profile
				</DropdownMenuItem>
				<DropdownMenuItem
					className="cursor-pointer"
					render={
						<Link href={`/users/${props.user.username}/posts` as Route} />
					}
				>
					<MessageSquare /> My posts
				</DropdownMenuItem>
				<DropdownMenuItem
					className="cursor-pointer"
					render={
						<Link href={`/users/${props.user.username}/feedbacks` as Route} />
					}
				>
					<BookOpen /> My feedbacks
				</DropdownMenuItem>
				<DropdownMenuItem
					className="cursor-pointer"
					render={
						<Link href={`/users/${props.user.username}/shelves` as Route} />
					}
				>
					<LayoutList /> My shelves
				</DropdownMenuItem>
				<DropdownMenuItem
					className="cursor-pointer"
					render={<Link href={"/settings" as Route} />}
				>
					<Settings /> Settings
				</DropdownMenuItem>
				{props.user.isAdmin ? (
					<>
						<DropdownMenuItem
							className="cursor-pointer"
							render={<Link href={"/books/blocked" as Route} />}
						>
							<BookOpen /> Blocked Works
						</DropdownMenuItem>
						<DropdownMenuItem
							className="cursor-pointer"
							render={<Link href={"/admin/users" as Route} />}
						>
							<Shield /> Users
						</DropdownMenuItem>
					</>
				) : null}
				<DropdownMenuItem
					closeOnClick={false}
					variant="destructive"
					disabled={loading}
					className="cursor-pointer"
					onClick={handleSignOut}
				>
					<LogOut /> Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
