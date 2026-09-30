"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import { LogOut, Settings, User } from "lucide-react";
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
					render={<Link href={`/users/${props.user.username}` as Route} />}
				>
					<User /> Profile
				</DropdownMenuItem>
				<DropdownMenuItem render={<Link href={"/settings" as Route} />}>
					<Settings /> Settings
				</DropdownMenuItem>
				<DropdownMenuItem
					closeOnClick={false}
					variant="destructive"
					disabled={loading}
					onClick={handleSignOut}
				>
					<LogOut /> Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
