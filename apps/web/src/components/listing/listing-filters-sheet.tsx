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
import { SlidersHorizontal, X } from "lucide-react";
import type { ReactNode } from "react";
import {
	ListingSideSheetBody,
	ListingSideSheetFooter,
	ListingSideSheetHeader,
	listingSideSheetContentClassName,
} from "@/components/listing/listing-side-sheet";
import { cn } from "@/lib/utils";

type ListingFiltersSheetProps = {
	title?: string;
	description?: string;
	activeFilterCount?: number;
	onClear?: () => void;
	children: ReactNode;
	appearance?: "default" | "library";
};

export function ListingFiltersSheet({
	title = "Filters",
	description = "Narrow results with filters and ranges.",
	activeFilterCount = 0,
	onClear,
	children,
	appearance = "default",
}: ListingFiltersSheetProps) {
	const isLibrary = appearance === "library";

	const filterTrigger = (
		<SheetTrigger
			render={
				<Button
					type="button"
					variant="outline"
					size="sm"
					className={cn(
						"gap-1.5",
						isLibrary && "bg-background",
						activeFilterCount > 0 &&
							onClear &&
							"border-0 bg-transparent shadow-none",
					)}
				/>
			}
		>
			<SlidersHorizontal data-icon="inline-start" />
			<span>Filters</span>
			{activeFilterCount > 0 ? (
				<Badge variant="secondary" className="tabular-nums">
					{activeFilterCount}
				</Badge>
			) : null}
		</SheetTrigger>
	);

	return (
		<Sheet>
			{activeFilterCount > 0 && onClear ? (
				<fieldset
					className={cn(
						"m-0 inline-flex min-w-0 items-stretch border border-border p-0",
						isLibrary && "bg-background",
					)}
					aria-label="Filters"
				>
					{filterTrigger}
					<div className="w-px shrink-0 self-stretch bg-border" aria-hidden />
					<Button
						type="button"
						variant="outline"
						size="icon-sm"
						className={cn(
							"border-0 shadow-none",
							isLibrary ? "bg-transparent" : "bg-background",
						)}
						aria-label="Clear all filters"
						onClick={(event) => {
							event.preventDefault();
							event.stopPropagation();
							onClear();
						}}
					>
						<X />
					</Button>
				</fieldset>
			) : (
				filterTrigger
			)}
			<SheetContent
				side="right"
				className={
					isLibrary
						? listingSideSheetContentClassName
						: "min-h-0 w-full max-w-[100vw] sm:max-w-md"
				}
			>
				{isLibrary ? (
					<ListingSideSheetHeader title={title} description={description} />
				) : (
					<SheetHeader>
						<SheetTitle>{title}</SheetTitle>
						<SheetDescription>{description}</SheetDescription>
					</SheetHeader>
				)}
				{isLibrary ? (
					<ListingSideSheetBody>{children}</ListingSideSheetBody>
				) : (
					<div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden px-4 pb-4">
						{children}
					</div>
				)}
				{onClear ? (
					isLibrary ? (
						<ListingSideSheetFooter>
							<Button type="button" variant="outline" onClick={onClear}>
								Clear all filters
							</Button>
						</ListingSideSheetFooter>
					) : (
						<SheetFooter>
							<Button type="button" variant="outline" onClick={onClear}>
								Clear filters
							</Button>
						</SheetFooter>
					)
				) : null}
			</SheetContent>
		</Sheet>
	);
}
