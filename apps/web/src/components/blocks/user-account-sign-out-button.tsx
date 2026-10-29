"use client";

import { Button } from "@bbrc/ui/components/button";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { releasePushOnSignOut } from "@/lib/push/sign-out";
import { cn } from "@/lib/utils";

type UserAccountSignOutButtonProps = {
	onSignedOut?: () => void;
	className?: string;
	compact?: boolean;
};

export function UserAccountSignOutButton({
	onSignedOut,
	className,
	compact = false,
}: UserAccountSignOutButtonProps) {
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	const handleSignOut = async () => {
		setLoading(true);
		try {
			await releasePushOnSignOut();
			await authClient.signOut();
			onSignedOut?.();
			router.refresh();
		} catch {
			toast.error("Failed to sign out");
		} finally {
			setLoading(false);
		}
	};

	if (compact) {
		return (
			<Button
				type="button"
				variant="ghost"
				size="sm"
				disabled={loading}
				className={cn(
					"shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive",
					className,
				)}
				onClick={handleSignOut}
			>
				<LogOut className="size-4" aria-hidden="true" />
				Sign out
			</Button>
		);
	}

	return (
		<button
			type="button"
			className={cn(
				"flex w-full items-center gap-3 px-4 py-3.5 text-left text-destructive text-sm transition-colors hover:bg-destructive/10 disabled:opacity-50",
				className,
			)}
			disabled={loading}
			onClick={handleSignOut}
		>
			<LogOut className="size-4 shrink-0" aria-hidden="true" />
			Sign out
		</button>
	);
}
