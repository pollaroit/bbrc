"use client";

import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@bbrc/ui/components/sheet";
import { SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";

type ListingFiltersSheetProps = {
	title?: string;
	description?: string;
	activeFilterCount?: number;
	onClear?: () => void;
	children: ReactNode;
};

export function ListingFiltersSheet({
	title = "Filters",
	description = "Narrow results with filters and ranges.",
	activeFilterCount = 0,
	onClear,
	children,
}: ListingFiltersSheetProps) {
	return (
		<Sheet>
			<SheetTrigger
				render={<Button variant="outline" size="sm" className="gap-1.5" />}
			>
				<SlidersHorizontal />
				<span>Filters</span>
				{activeFilterCount > 0 ? (
					<Badge variant="secondary">{activeFilterCount}</Badge>
				) : null}
			</SheetTrigger>
			<SheetContent side="right" className="w-full sm:max-w-md">
				<SheetHeader>
					<SheetTitle>{title}</SheetTitle>
					<SheetDescription>{description}</SheetDescription>
				</SheetHeader>
				<div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4">
					{children}
				</div>
				{onClear ? (
					<SheetFooter>
						<Button type="button" variant="outline" onClick={onClear}>
							Clear filters
						</Button>
					</SheetFooter>
				) : null}
			</SheetContent>
		</Sheet>
	);
}
