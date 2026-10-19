"use client";

import { BrowseMenuItems } from "@/components/blocks/browse-menu-items";
import { MobileChromeSheet } from "@/components/blocks/mobile-chrome-sheet";

type BrowseMenuDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function BrowseMenuDrawer({
	open,
	onOpenChange,
}: BrowseMenuDrawerProps) {
	return (
		<MobileChromeSheet open={open} onOpenChange={onOpenChange} title="Browse">
			<BrowseMenuItems onNavigate={() => onOpenChange(false)} />
		</MobileChromeSheet>
	);
}
