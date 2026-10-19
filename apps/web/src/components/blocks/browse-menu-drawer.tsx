"use client";

import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@bbrc/ui/components/sheet";
import { Compass } from "lucide-react";
import { BrowseMenuItems } from "@/components/blocks/browse-menu-items";

type BrowseMenuDrawerProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function BrowseMenuDrawer({
	open,
	onOpenChange,
}: BrowseMenuDrawerProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="bottom"
				showCloseButton={false}
				className="gap-0 px-0 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:mx-auto sm:max-w-lg"
			>
				<div className="mx-auto mb-4 h-1 w-10 bg-border" aria-hidden="true" />
				<SheetHeader className="gap-0 border-border border-b px-4 pb-4 text-left">
					<SheetTitle className="flex items-center gap-2 font-semibold text-base">
						<Compass className="size-5 shrink-0" aria-hidden />
						Browse
					</SheetTitle>
					<p className="text-muted-foreground text-sm">
						Authors, series, shelves, and club places.
					</p>
				</SheetHeader>
				<BrowseMenuItems onNavigate={() => onOpenChange(false)} />
			</SheetContent>
		</Sheet>
	);
}
