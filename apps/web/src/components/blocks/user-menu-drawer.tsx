"use client";

import { MobileChromeSheet } from "@/components/blocks/mobile-chrome-sheet";
import { UserAccountSignOutButton } from "@/components/blocks/user-account-sign-out-button";
import { UserMenuItems } from "@/components/blocks/user-menu-items";
import { UserPanel } from "@/components/blocks/user-panel";

type UserMenuDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	user: React.ComponentProps<typeof UserPanel>["user"];
};

export function UserMenuDrawer({
	open,
	onOpenChange,
	user,
}: UserMenuDrawerProps) {
	return (
		<MobileChromeSheet open={open} onOpenChange={onOpenChange} title="You">
			<div className="border-border border-b px-4 pb-4">
				<p className="mb-3 font-semibold text-base tracking-tight">You</p>
				<div className="flex items-center justify-between gap-3 border border-border bg-muted/15 p-3">
					<UserPanel user={user} className="min-w-0 flex-1" />
					<UserAccountSignOutButton
						compact
						onSignedOut={() => onOpenChange(false)}
					/>
				</div>
			</div>
			<UserMenuItems
				user={user}
				onNavigate={() => onOpenChange(false)}
				variant="drawer"
				hideSignOut
			/>
		</MobileChromeSheet>
	);
}
