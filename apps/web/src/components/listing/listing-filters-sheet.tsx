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
import { useTranslations } from "next-intl";
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
	title,
	description,
	activeFilterCount = 0,
	onClear,
	children,
	appearance = "default",
}: ListingFiltersSheetProps) {
	const t = useTranslations("listing");
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
			<span>{t("filters.title")}</span>
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
					aria-label={t("filters.title")}
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
						aria-label={t("filters.clearAll")}
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
					<ListingSideSheetHeader
						title={title ?? t("filters.title")}
						description={description ?? t("filters.description")}
					/>
				) : (
					<SheetHeader>
						<SheetTitle>{title ?? t("filters.title")}</SheetTitle>
						<SheetDescription>
							{description ?? t("filters.description")}
						</SheetDescription>
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
								{t("filters.clearAll")}
							</Button>
						</ListingSideSheetFooter>
					) : (
						<SheetFooter>
							<Button type="button" variant="outline" onClick={onClear}>
								{t("filters.clear")}
							</Button>
						</SheetFooter>
					)
				) : null}
			</SheetContent>
		</Sheet>
	);
}
