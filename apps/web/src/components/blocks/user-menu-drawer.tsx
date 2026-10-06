"use client";

import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@bbrc/ui/components/sheet";
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
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="bottom"
				showCloseButton={false}
				className="gap-0 px-0 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:mx-auto sm:max-w-lg"
			>
				<div className="mx-auto mb-4 h-1 w-10 bg-border" aria-hidden="true" />
				<SheetHeader className="gap-0 border-border border-b px-4 pb-4 text-left">
					<SheetTitle className="sr-only">Account menu</SheetTitle>
					<div className="flex items-center justify-between gap-3">
						<UserPanel user={user} className="min-w-0 flex-1" />
						<UserAccountSignOutButton
							compact
							onSignedOut={() => onOpenChange(false)}
						/>
					</div>
				</SheetHeader>
				<UserMenuItems
					user={user}
					onNavigate={() => onOpenChange(false)}
					variant="drawer"
					hideSignOut
				/>
			</SheetContent>
		</Sheet>
	);
}
