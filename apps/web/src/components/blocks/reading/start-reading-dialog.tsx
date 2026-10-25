"use client";

import type { ReadingItem } from "@bbrc/api/modules/reading/reading.schema";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { useState } from "react";
import { toast } from "sonner";
import {
	type ReadingEditionChoice,
	ReadingEditionPicker,
} from "@/components/blocks/reading/reading-edition-picker";
import { MAX_ACTIVE_READINGS } from "@/lib/reading/limits";
import {
	useReadingState,
	useSetReadingEdition,
	useStartReading,
} from "@/lib/reading/use-reading";

/*
 * "I'm currently reading" — pick the edition (optional), then start.
 *
 * <StartReadingDialog bookSlug bookTitle bookPages open onOpenChange />
 *   start mode: creates the reading (optimistic).
 * <StartReadingDialog … reading={item} />
 *   change mode: the same picker, saved onto the reading you already have.
 * Load it with next/dynamic: it pulls in the edition picker.
 */

type Props = {
	bookSlug: string;
	bookTitle: string;
	bookPages: number;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Set to change the edition of a reading that already exists. */
	reading?: ReadingItem | null;
};

const EMPTY: ReadingEditionChoice = {
	editionOlid: null,
	editionCoverId: null,
	editionLabel: null,
	bookEditionId: null,
	totalPages: null,
};

function initialChoice(
	reading: ReadingItem | null | undefined,
): ReadingEditionChoice {
	if (!reading) return EMPTY;
	return {
		editionOlid: reading.edition?.olid ?? null,
		editionCoverId: reading.edition?.coverId ?? null,
		editionLabel: reading.edition?.label ?? null,
		bookEditionId: reading.edition?.memberEditionId ?? null,
		totalPages: reading.totalPages,
	};
}

export function StartReadingDialog(props: Props) {
	// A fresh form every time it opens.
	return props.open ? (
		<DialogBody key={props.reading?.id ?? "new"} {...props} />
	) : null;
}

function DialogBody({
	bookSlug,
	bookTitle,
	bookPages,
	open,
	onOpenChange,
	reading,
}: Props) {
	const changing = reading != null;
	const [choice, setChoice] = useState<ReadingEditionChoice>(() =>
		initialChoice(reading),
	);
	const start = useStartReading(bookSlug);
	const change = useSetReadingEdition();
	const state = useReadingState(bookSlug);
	const atLimit =
		!changing && (state.data?.activeCount ?? 0) >= MAX_ACTIVE_READINGS;

	const pagesUsed = choice.totalPages ?? (bookPages > 0 ? bookPages : null);

	const submit = (chosen: ReadingEditionChoice) => {
		onOpenChange(false);
		if (changing && reading) {
			change.mutate(
				{ id: reading.id, ...chosen },
				{ onSuccess: () => toast.success("Edition updated") },
			);
			return;
		}
		start.mutate(
			{ bookSlug, ...chosen },
			{ onSuccess: () => toast.success(`You're reading ${bookTitle}`) },
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] gap-4 overflow-y-auto sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>
						{changing ? "Change your edition" : "I'm currently reading"}
					</DialogTitle>
					<DialogDescription>
						{changing
							? "Your place in the book stays the same."
							: "Pick the edition you have so the pages match your copy. It is optional."}
					</DialogDescription>
				</DialogHeader>

				<ReadingEditionPicker
					bookSlug={bookSlug}
					bookPages={bookPages}
					value={choice}
					onChange={setChoice}
				/>

				<p className="border-border border-t pt-3 text-muted-foreground text-sm">
					{pagesUsed != null
						? `Progress is tracked by page, out of ${pagesUsed} pages.`
						: "No page count yet, so progress is tracked as a percentage. You can add pages above."}
				</p>

				{atLimit ? (
					<p className="border border-warning/40 bg-warning/10 p-3 text-sm text-warning-ink">
						You are already reading {MAX_ACTIVE_READINGS} books. Finish or drop
						one first.
					</p>
				) : null}

				<DialogFooter className="gap-2 sm:justify-between">
					{changing ? (
						<span />
					) : (
						<Button
							type="button"
							variant="ghost"
							disabled={atLimit}
							onClick={() => submit(EMPTY)}
						>
							Skip the edition
						</Button>
					)}
					<div className="flex gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							disabled={atLimit}
							onClick={() => submit(choice)}
						>
							{changing ? "Save edition" : "Start reading"}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
