"use client";

import { Compass } from "lucide-react";
import { BrowseMenuItems } from "@/components/blocks/browse-menu-items";
import {
	MobileChromeSheet,
	MobileChromeSheetIntro,
} from "@/components/blocks/mobile-chrome-sheet";

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
			<MobileChromeSheetIntro
				icon={Compass}
				title="Browse"
				description="Catalog indexes and club places beyond the library grid."
			/>
			<BrowseMenuItems onNavigate={() => onOpenChange(false)} />
		</MobileChromeSheet>
	);
}
