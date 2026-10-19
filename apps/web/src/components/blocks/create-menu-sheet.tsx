"use client";

import { Plus } from "lucide-react";
import { CreateMenuItems } from "@/components/blocks/create-menu-items";
import {
	MobileChromeSheet,
	MobileChromeSheetIntro,
} from "@/components/blocks/mobile-chrome-sheet";

type CreateMenuSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function CreateMenuSheet({ open, onOpenChange }: CreateMenuSheetProps) {
	return (
		<MobileChromeSheet open={open} onOpenChange={onOpenChange} title="Create">
			<MobileChromeSheetIntro
				icon={Plus}
				title="Create"
				description="Post to the feed, track goals, or add to the library."
			/>
			<CreateMenuItems variant="sheet" onNavigate={() => onOpenChange(false)} />
		</MobileChromeSheet>
	);
}
