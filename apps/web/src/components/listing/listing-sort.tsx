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
import {
	type FieldLabels,
	labelForField,
	sortDirectionLabels,
} from "@/lib/listing/labels";
import { cn } from "@/lib/utils";

type ListingSortProps<TSortBy extends string> = {
	sortBy: TSortBy | null;
	sortDirection: "asc" | "desc" | null;
	onSortByChange: (value: TSortBy | null) => void;
	onSortDirectionChange: (value: "asc" | "desc" | null) => void;
	sortByOptions: readonly TSortBy[];
	sortByLabels: FieldLabels<TSortBy>;
	className?: string;
};

export function ListingSort<TSortBy extends string>({
	sortBy,
	sortDirection,
	onSortByChange,
	onSortDirectionChange,
	sortByOptions,
	sortByLabels,
	className,
}: ListingSortProps<TSortBy>) {
	const sortByLabel = sortBy ? labelForField(sortByLabels, sortBy) : "Sort by";
	const direction = sortDirection ?? "desc";

	return (
		<div className={cn("flex items-center gap-1", className)}>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={<Button variant="outline" size="sm" className="gap-1.5" />}
				>
					<ArrowDownUp />
					<span className="max-w-32 truncate">{sortByLabel}</span>
					<ChevronDown />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="min-w-44">
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

			<Button
				type="button"
				variant="outline"
				size="icon-sm"
				aria-label={sortDirectionLabels[direction]}
				onClick={() => {
					onSortDirectionChange(direction === "asc" ? "desc" : "asc");
				}}
			>
				{direction === "asc" ? <ArrowUpWideNarrow /> : <ArrowDownWideNarrow />}
			</Button>
		</div>
	);
}
