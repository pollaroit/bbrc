"use client";

import { Button } from "@bbrc/ui/components/button";
import { BookCopy, BookOpen } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";
import { EditionLabelLink } from "@/components/blocks/reading/edition-label-link";
import { ReadingProgressControl } from "@/components/blocks/reading/reading-progress-control";
import { bookCoverUrl } from "@/lib/book-cover";
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

	const src =
		reading.edition?.coverUrl ??
		(reading.edition?.coverId
			? bookCoverUrl(reading.edition.coverId, "M")
			: bookCoverUrl(reading.book.coverId, "M"));

	return (
		<section
			aria-label="Your reading"
			className="flex flex-col gap-3 border border-border bg-muted/20 p-3 sm:p-4"
		>
			<header className="flex items-start gap-3">
				<span className="relative block aspect-2/3 w-10 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
					{src ? (
						<Image
							src={src}
							alt=""
							fill
							className="object-cover"
							sizes="40px"
						/>
					) : (
						<BookOpen
							className="absolute inset-0 m-auto size-4 text-muted-foreground"
							aria-hidden
						/>
					)}
				</span>
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<p className="font-medium text-sm">Your copy</p>
					<p className="truncate text-muted-foreground text-xs">
						<EditionLabelLink
							bookSlug={reading.book.slug}
							edition={reading.edition}
							totalPages={reading.totalPages}
						/>
					</p>
				</div>
				<Button
					type="button"
					size="xs"
					variant="outline"
					onClick={() => setOpen(true)}
				>
					<BookCopy data-icon="inline-start" aria-hidden />
					Change edition
				</Button>
			</header>
			<ReadingProgressControl reading={reading} />
			{open ? (
				<StartReadingDialog
					bookSlug={bookSlug}
					bookTitle={bookTitle}
					bookPages={bookPages}
					open={open}
					onOpenChange={setOpen}
					reading={reading}
				/>
			) : null}
		</section>
	);
}
