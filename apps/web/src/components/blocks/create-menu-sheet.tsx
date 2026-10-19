"use client";

import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@bbrc/ui/components/sheet";
import { Plus } from "lucide-react";
import { CreateMenuItems } from "@/components/blocks/create-menu-items";

type CreateMenuSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function CreateMenuSheet({ open, onOpenChange }: CreateMenuSheetProps) {
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
						<Plus className="size-5 shrink-0" aria-hidden />
						Create
					</SheetTitle>
					<p className="text-muted-foreground text-sm">
						Posts, shelves, goals, and library actions.
					</p>
				</SheetHeader>
				<CreateMenuItems
					variant="sheet"
					onNavigate={() => onOpenChange(false)}
				/>
			</SheetContent>
		</Sheet>
	);
}
