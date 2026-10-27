"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import {
	ArrowDownUp,
	ArrowDownWideNarrow,
	ArrowUpWideNarrow,
	ChevronDown,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { type FieldLabels, labelForField } from "@/lib/listing/labels";
import { cn } from "@/lib/utils";

type ListingSortProps<TSortBy extends string> = {
	sortBy: TSortBy | null;
	sortDirection: "asc" | "desc" | null;
	onSortByChange: (value: TSortBy | null) => void;
	onSortDirectionChange: (value: "asc" | "desc" | null) => void;
	sortByOptions: readonly TSortBy[];
	sortByLabels: FieldLabels<TSortBy>;
	className?: string;
	appearance?: "default" | "library";
};

export function ListingSort<TSortBy extends string>({
	sortBy,
	sortDirection,
	onSortByChange,
	onSortDirectionChange,
	sortByOptions,
	sortByLabels,
	className,
	appearance = "default",
}: ListingSortProps<TSortBy>) {
	const t = useTranslations("listing");
	const sortByLabel = sortBy
		? labelForField(sortByLabels, sortBy)
		: t("sort.by");
	const direction = sortDirection ?? "desc";
	const isLibrary = appearance === "library";

	const sortFieldControl = (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						type="button"
						variant="outline"
						size="sm"
						className={cn(
							"gap-1.5",
							isLibrary && "border-0 bg-transparent shadow-none",
						)}
					/>
				}
			>
				<ArrowDownUp data-icon="inline-start" />
				<span className="max-w-36 truncate">{sortByLabel}</span>
				<ChevronDown className="size-4 opacity-60" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-48">
				<DropdownMenuRadioGroup
					value={sortBy ?? ""}
					onValueChange={(value) => {
						onSortByChange(value === "" ? null : (value as TSortBy));
					}}
				>
					{sortByOptions.map((option) => (
						<DropdownMenuRadioItem key={option} value={option}>
							{labelForField(sortByLabels, option)}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);

	const directionControl = (
		<Button
			type="button"
			variant="outline"
			size="icon-sm"
			className={cn(isLibrary && "border-0 bg-transparent shadow-none")}
			aria-label={t(direction === "asc" ? "sort.asc" : "sort.desc")}
			onClick={() => {
				onSortDirectionChange(direction === "asc" ? "desc" : "asc");
			}}
		>
			{direction === "asc" ? <ArrowUpWideNarrow /> : <ArrowDownWideNarrow />}
		</Button>
	);

	if (isLibrary) {
		return (
			<fieldset
				className={cn(
					"m-0 inline-flex min-w-0 items-stretch border border-border bg-background p-0",
					className,
				)}
				aria-label={t("sort.list")}
			>
				{sortFieldControl}
				<div className="w-px shrink-0 self-stretch bg-border" aria-hidden />
				{directionControl}
			</fieldset>
		);
	}

	return (
		<div className={cn("flex items-center gap-1", className)}>
			{sortFieldControl}
			{directionControl}
		</div>
	);
}
