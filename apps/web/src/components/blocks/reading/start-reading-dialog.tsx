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
	type ReadingEditionMode,
	ReadingEditionPicker,
} from "@/components/blocks/reading/reading-edition-picker";
import { MAX_ACTIVE_READINGS } from "@/lib/reading/limits";
import {
	useReadingState,
	useSetReadingEdition,
	useStartReading,
} from "@/lib/reading/use-reading";

/*
 * "I'm currently reading" — pick the edition, or just the pages, then start.
 * The edition is optional: "Just the pages" is for a PDF, an ebook or any copy,
 * and the page count itself may be left empty (progress is then a percentage).
 *
 * <StartReadingDialog bookSlug bookTitle bookPages open onOpenChange />
 *   start mode: creates the reading (optimistic).
 * <StartReadingDialog … reading={item} />
 *   change mode: the same picker, saved onto the reading you already have.
 * `onStarting` runs just before a start is sent (return a function that undoes
 * what you changed, called if the server refuses); `onStarted` runs after it
 * worked. The sitting page uses them to keep its status in step.
 * Load it with next/dynamic: it pulls in the edition picker.
 */

type Props = {
	bookSlug: string;
	bookTitle: string;
	bookPages: number;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Set to change the edition of a reading that already exists. */
	reading?: Pick<ReadingItem, "id" | "edition" | "totalPages"> | null;
	onStarting?: () => (() => void) | undefined | void;
	onStarted?: () => void;
};

const EMPTY: ReadingEditionChoice = {
	editionOlid: null,
	editionCoverId: null,
	editionLabel: null,
	bookEditionId: null,
	totalPages: null,
};

function initialChoice(
	reading: Props["reading"] | undefined,
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
	onStarting,
	onStarted,
}: Props) {
	const changing = reading != null;
	const [choice, setChoice] = useState<ReadingEditionChoice>(() =>
		initialChoice(reading),
	);
	// A reading with no edition opens on "Just the pages".
	const [mode, setMode] = useState<ReadingEditionMode>(
		changing && reading?.edition == null ? "pages" : "edition",
	);
	const start = useStartReading(bookSlug);
	const change = useSetReadingEdition();
	const state = useReadingState(bookSlug);
	const atLimit =
		!changing && (state.data?.activeCount ?? 0) >= MAX_ACTIVE_READINGS;

	// With "Just the pages" an empty count is deliberate (percentage only);
	// with an edition an empty count falls back to the edition's or the book's.
	const pagesUsed =
		mode === "pages"
			? choice.totalPages
			: (choice.totalPages ?? (bookPages > 0 ? bookPages : null));

	const submit = () => {
		onOpenChange(false);
		const body =
			mode === "pages"
				? {
						editionOlid: null,
						editionCoverId: null,
						editionLabel: null,
						bookEditionId: null,
						totalPages: choice.totalPages,
					}
				: { ...choice, totalPages: choice.totalPages ?? undefined };
		if (changing && reading) {
			change.mutate(
				{ id: reading.id, ...body },
				{ onSuccess: () => toast.success("Edition updated") },
			);
			return;
		}
		const undo = onStarting?.();
		start.mutate(
			{ bookSlug, ...body },
			{
				onSuccess: () => {
					toast.success(`You're reading ${bookTitle}`);
					onStarted?.();
				},
				onError: () => undo?.(),
			},
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] gap-4 overflow-y-auto sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>
						{changing ? "Change your copy" : "I'm currently reading"}
					</DialogTitle>
					<DialogDescription>
						{changing
							? "Your place in the book stays the same."
							: "Choose an edition, or just say how many pages your copy has. You can change it later."}
					</DialogDescription>
				</DialogHeader>

				<ReadingEditionPicker
					bookSlug={bookSlug}
					bookPages={bookPages}
					value={choice}
					onChange={setChoice}
					mode={mode}
					onModeChange={setMode}
				/>

				<p className="border-border border-t pt-3 text-muted-foreground text-sm">
					{pagesUsed != null
						? `Progress is tracked by page, out of ${pagesUsed} pages.`
						: "No page count, so progress is tracked as a percentage. You can add pages above."}
				</p>

				{atLimit ? (
					<p className="border border-warning/40 bg-warning/10 p-3 text-sm text-warning-ink">
						You are already reading {MAX_ACTIVE_READINGS} books. Finish or drop
						one first.
					</p>
				) : null}

				<DialogFooter className="gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button type="button" disabled={atLimit} onClick={submit}>
						{changing ? "Save" : "Start reading"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
