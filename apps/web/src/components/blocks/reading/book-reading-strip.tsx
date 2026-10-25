"use client";

import { Button } from "@bbrc/ui/components/button";
import { BookCheck, BookCopy } from "lucide-react";
import type { Route } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { BookMarkReadDialog } from "@/components/blocks/book-mark-read-dialog";
import { ReadingProgressControl } from "@/components/blocks/reading/reading-progress-control";
import { RelativeTime } from "@/components/blocks/relative-time";
import { authClient } from "@/lib/auth-client";
import { useReadingState } from "@/lib/reading/use-reading";

const StartReadingDialog = dynamic(
	() =>
		import("@/components/blocks/reading/start-reading-dialog").then(
			(mod) => mod.StartReadingDialog,
		),
	{ ssr: false },
);

/*
 * The strip on the book page that shows up once you are reading the book:
 * your progress bar (editable in place), the pace against the sitting's
 * deadline, your edition, and "Finished it" (opens the mark-as-read dialog).
 *
 * <BookReadingStrip bookSlug bookTitle bookPages />
 * Renders nothing when signed out or when you are not reading this book.
 */

type Props = {
	bookSlug: string;
	bookTitle: string;
	bookPages: number;
};

export function BookReadingStrip({ bookSlug, bookTitle, bookPages }: Props) {
	const { data: session } = authClient.useSession();
	const state = useReadingState(bookSlug, Boolean(session?.user));
	const [finishOpen, setFinishOpen] = useState(false);
	const [editionOpen, setEditionOpen] = useState(false);

	const reading = state.data?.reading;
	if (!session?.user || !reading) return null;

	return (
		<section
			aria-label="Your reading"
			className="flex flex-col gap-4 border border-border bg-muted/20 p-4"
		>
			<header className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex min-w-0 flex-col gap-0.5">
					<p className="font-medium text-sm">You're reading this</p>
					<p className="truncate text-muted-foreground text-xs">
						{reading.edition?.label ?? "No edition chosen"}
						<span aria-hidden> · </span>
						started <RelativeTime date={reading.startedAt} />
					</p>
					{reading.sitting ? (
						<Link
							href={`/sittings/${reading.sitting.slug}` as Route}
							className="text-xs underline-offset-4 hover:underline"
						>
							Counts towards your sitting
						</Link>
					) : null}
				</div>
				<div className="flex gap-1.5">
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => setEditionOpen(true)}
					>
						<BookCopy data-icon="inline-start" aria-hidden />
						Edition
					</Button>
					<Button type="button" size="sm" onClick={() => setFinishOpen(true)}>
						<BookCheck data-icon="inline-start" aria-hidden />
						Finished it
					</Button>
				</div>
			</header>

			<ReadingProgressControl reading={reading} />

			<BookMarkReadDialog
				bookSlug={bookSlug}
				bookTitle={bookTitle}
				open={finishOpen}
				onOpenChange={setFinishOpen}
			/>
			<StartReadingDialog
				bookSlug={bookSlug}
				bookTitle={bookTitle}
				bookPages={bookPages}
				open={editionOpen}
				onOpenChange={setEditionOpen}
				reading={reading}
			/>
		</section>
	);
}
