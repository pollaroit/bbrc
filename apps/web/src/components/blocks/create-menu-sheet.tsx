"use client";

import { useTranslations } from "next-intl";
import { CreateMenuItems } from "@/components/blocks/create-menu-items";
import { MobileChromeSheet } from "@/components/blocks/mobile-chrome-sheet";

type CreateMenuSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function CreateMenuSheet({ open, onOpenChange }: CreateMenuSheetProps) {
	const t = useTranslations("shell.create");
	return (
		<MobileChromeSheet
			open={open}
			onOpenChange={onOpenChange}
			title={t("title")}
		>
			<CreateMenuItems variant="sheet" onNavigate={() => onOpenChange(false)} />
		</MobileChromeSheet>
	);
}
