"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { UserMenuItems } from "@/components/blocks/user-menu-items";
import { authClient } from "@/lib/auth-client";
import { headerToolbarControlClass } from "@/lib/header-toolbar";
import { releasePushOnSignOut } from "@/lib/push/sign-out";
import { cn } from "@/lib/utils";
import { UserPanel } from "./user-panel";

interface Props extends React.ComponentProps<typeof UserPanel> {}

export function UserMenu({ ...props }: Props) {
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	const handleSignOut = async () => {
		setLoading(true);

		try {
			await releasePushOnSignOut();
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
						className={cn(
							headerToolbarControlClass,
							"max-w-[12rem] justify-start gap-2 px-2 font-normal",
						)}
					/>
				}
			>
				<UserPanel {...props} className="min-w-0" />
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end" className="min-w-52">
				<UserMenuItems user={props.user} variant="dropdown" />
				<DropdownMenuSeparator />
				<DropdownMenuItem
					closeOnClick={false}
					variant="destructive"
					disabled={loading}
					className="cursor-pointer"
					onClick={handleSignOut}
				>
					<LogOut aria-hidden />
					Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
