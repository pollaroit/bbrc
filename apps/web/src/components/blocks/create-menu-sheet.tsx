"use client";

import { CreateMenuItems } from "@/components/blocks/create-menu-items";
import { MobileChromeSheet } from "@/components/blocks/mobile-chrome-sheet";

type CreateMenuSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function CreateMenuSheet({ open, onOpenChange }: CreateMenuSheetProps) {
	return (
		<MobileChromeSheet open={open} onOpenChange={onOpenChange} title="Create">
			<CreateMenuItems variant="sheet" onNavigate={() => onOpenChange(false)} />
		</MobileChromeSheet>
	);
}
