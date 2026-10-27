"use client";

import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingSearch } from "@/components/listing/listing-search";

export type AuthorFilterChip = {
	id: string;
	label: string;
	onRemove: () => void;
};

type AuthorFilterBarProps = {
	search?: string | null;
	onSearchChange?: (value: string | null) => void;
	searchPlaceholder?: string;
	/** Replaces the plain search box (the Books tab uses the subject-tag search). */
	searchSlot?: ReactNode;
	/** The sort control (a `ListingSort`). */
	sort?: ReactNode;
	sheetTitle: string;
	sheetDescription: string;
	/** What goes in the filters sheet. */
	sheetContent: ReactNode;
	/** How many filters are on (search and sort do not count). */
	activeCount: number;
	onClearAll: () => void;
	chips: AuthorFilterChip[];
	/** The count line ("12 reads"), shown under the controls. */
	resultLabel?: ReactNode;
};

/**
 * The control strip of an author tab: search, sort, a filters sheet, then one removable chip
 * per active filter and a "Clear all". One layout for Reads, Reviews and Books.
 */
export function AuthorFilterBar({
	search,
	onSearchChange,
	searchPlaceholder,
	searchSlot,
	sort,
	sheetTitle,
	sheetDescription,
	sheetContent,
	activeCount,
	onClearAll,
	chips,
	resultLabel,
}: AuthorFilterBarProps) {
	const t = useTranslations("authors");
	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
				{searchSlot ?? (
					<ListingSearch
						value={search ?? ""}
						onChange={(value) => onSearchChange?.(value)}
						placeholder={searchPlaceholder}
					/>
				)}
				<div className="flex flex-wrap items-center gap-2 sm:shrink-0">
					{sort}
					<ListingFiltersSheet
						title={sheetTitle}
						description={sheetDescription}
						activeFilterCount={activeCount}
						onClear={onClearAll}
					>
						{sheetContent}
					</ListingFiltersSheet>
				</div>
			</div>

			{chips.length > 0 ? (
				<ul
					className="flex flex-wrap items-center gap-1.5"
					aria-label={t("filters.active")}
				>
					{chips.map((chip) => (
						<li key={chip.id} className="max-w-full">
							<Badge variant="secondary" className="max-w-full gap-1 pr-1">
								<span className="truncate">{chip.label}</span>
								<button
									type="button"
									className="grid size-4 shrink-0 place-items-center hover:text-foreground"
									aria-label={t("filters.remove", { label: chip.label })}
									onClick={chip.onRemove}
								>
									<X className="size-3" aria-hidden />
								</button>
							</Badge>
						</li>
					))}
					<li>
						<Button
							type="button"
							variant="ghost"
							size="xs"
							onClick={onClearAll}
						>
							{t("filters.clearAll")}
						</Button>
					</li>
				</ul>
			) : null}

			{resultLabel ? (
				<p className="border-border border-b pb-2 font-medium text-muted-foreground text-sm tabular-nums">
					{resultLabel}
				</p>
			) : null}
		</div>
	);
}

/** Empty list that says why: nothing yet, or nothing under these filters. */
export function AuthorFilteredEmpty({
	filtered,
	emptyText,
	filteredText,
	onClear,
	children,
}: {
	filtered: boolean;
	emptyText: string;
	filteredText: string;
	onClear: () => void;
	children?: ReactNode;
}) {
	const t = useTranslations("authors");
	return (
		<div className="flex flex-col items-center gap-3 border border-border border-dashed px-4 py-10 text-center">
			<p className="max-w-md text-sm">{filtered ? filteredText : emptyText}</p>
			{filtered ? (
				<Button type="button" variant="outline" size="sm" onClick={onClear}>
					{t("filters.clear")}
				</Button>
			) : (
				children
			)}
		</div>
	);
}
