"use client";

import { useTranslations } from "next-intl";
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
	const t = useTranslations("shell.browse");
	return (
		<MobileChromeSheet
			open={open}
			onOpenChange={onOpenChange}
			title={t("title")}
		>
			<BrowseMenuItems onNavigate={() => onOpenChange(false)} />
		</MobileChromeSheet>
	);
}
