"use client";

import { Button } from "@bbrc/ui/components/button";
import { BookCopy } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { ReadingCard } from "@/components/blocks/reading/reading-card";
import { useReadingState } from "@/lib/reading/use-reading";

const StartReadingDialog = dynamic(
	() =>
		import("@/components/blocks/reading/start-reading-dialog").then(
			(mod) => mod.StartReadingDialog,
		),
	{ ssr: false },
);

/*
 * Your reading of the sitting's book, shown on the sitting page once you are
 * reading it: the copy (cover and label), the progress bar with the pace line,
 * and "Change edition". If your sitting status says "Reading" but no reading
 * exists yet (it was set before readings existed), it offers to add the copy.
 *
 * <SittingReadingPanel bookSlug bookTitle bookPages startedOnSitting onChanged />
 */

type Props = {
	bookSlug: string;
	bookTitle: string;
	bookPages: number;
	/** Your sitting status is "Reading". */
	markedReading: boolean;
	/** Called after a reading was started or its edition changed (refresh the sitting). */
	onChanged?: () => void;
};

export function SittingReadingPanel({
	bookSlug,
	bookTitle,
	bookPages,
	markedReading,
	onChanged,
}: Props) {
	const state = useReadingState(bookSlug);
	const [open, setOpen] = useState(false);
	const reading = state.data?.reading ?? null;

	if (!reading) {
		if (!markedReading || state.isPending || state.data?.hasRead) return null;
		return (
			<section
				aria-label="Your copy"
				className="flex flex-wrap items-center gap-3 border border-border border-dashed p-3"
			>
				<p className="me-auto text-muted-foreground text-sm">
					Add the edition you have, or just the pages, to track your progress.
				</p>
				<Button type="button" size="sm" onClick={() => setOpen(true)}>
					<BookCopy data-icon="inline-start" aria-hidden />
					Add my copy
				</Button>
				{open ? (
					<StartReadingDialog
						bookSlug={bookSlug}
						bookTitle={bookTitle}
						bookPages={bookPages}
						open={open}
						onOpenChange={setOpen}
						onStarted={onChanged}
					/>
				) : null}
			</section>
		);
	}

	return <ReadingCard reading={reading} showBook={false} hideSitting />;
}
