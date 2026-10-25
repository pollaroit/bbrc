"use client";

import { Button } from "@bbrc/ui/components/button";
import { GitCompareArrows, X } from "lucide-react";
import { useState } from "react";
import { CompareEditionsDialog } from "@/components/blocks/edition-page/compare-editions-dialog";
import { cn } from "@/lib/utils";

/*
 * Ticking editions on the editions list to compare them (two or three).
 * `useEditionSelection()` holds the ticked keys for the whole list (Open Library
 * and member editions share it); each card shows an <EditionSelectBox/> and the
 * page shows one <CompareBar/> that appears once something is ticked.
 */

export const MAX_COMPARED_EDITIONS = 3;

export type EditionSelection = {
	selected: string[];
	toggle: (key: string) => void;
	clear: () => void;
};

export function useEditionSelection(): EditionSelection {
	const [selected, setSelected] = useState<string[]>([]);
	return {
		selected,
		toggle: (key) =>
			setSelected((current) =>
				current.includes(key)
					? current.filter((value) => value !== key)
					: current.length >= MAX_COMPARED_EDITIONS
						? current
						: [...current, key],
			),
		clear: () => setSelected([]),
	};
}

export function EditionSelectBox({
	editionKey,
	selection,
	className,
}: {
	editionKey: string;
	selection: EditionSelection;
	className?: string;
}) {
	const checked = selection.selected.includes(editionKey);
	const disabled =
		!checked && selection.selected.length >= MAX_COMPARED_EDITIONS;
	return (
		<label
			className={cn(
				"inline-flex cursor-pointer items-center gap-1.5 text-muted-foreground text-xs hover:text-foreground",
				disabled && "cursor-not-allowed opacity-50",
				className,
			)}
		>
			<input
				type="checkbox"
				checked={checked}
				disabled={disabled}
				onChange={() => selection.toggle(editionKey)}
				className="size-3.5 accent-primary"
			/>
			Compare
		</label>
	);
}

/** Appears at the bottom of the screen once two or more editions are ticked. */
export function CompareBar({
	bookSlug,
	selection,
}: {
	bookSlug: string;
	selection: EditionSelection;
}) {
	const [open, setOpen] = useState(false);
	const count = selection.selected.length;
	if (count === 0) return null;

	return (
		<>
			<div className="sticky bottom-3 z-30 mx-auto flex w-full max-w-md items-center justify-between gap-3 border border-foreground bg-background p-2 ps-4 shadow-[4px_4px_0_0_var(--border)]">
				<span className="text-sm tabular-nums">
					{count} {count === 1 ? "edition" : "editions"} ticked
					{count < 2 ? (
						<span className="text-muted-foreground"> · tick one more</span>
					) : null}
				</span>
				<span className="flex items-center gap-1">
					<Button
						type="button"
						size="sm"
						disabled={count < 2}
						onClick={() => setOpen(true)}
					>
						<GitCompareArrows data-icon="inline-start" aria-hidden />
						Compare {count}
					</Button>
					<Button
						type="button"
						size="icon-sm"
						variant="ghost"
						aria-label="Clear the ticked editions"
						onClick={selection.clear}
					>
						<X aria-hidden />
					</Button>
				</span>
			</div>
			<CompareEditionsDialog
				bookSlug={bookSlug}
				keys={selection.selected}
				open={open}
				onOpenChange={setOpen}
			/>
		</>
	);
}
