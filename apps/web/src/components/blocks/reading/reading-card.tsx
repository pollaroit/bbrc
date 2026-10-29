"use client";

import type { ReadingItem } from "@bbrc/api/modules/reading/reading.schema";
import { Button } from "@bbrc/ui/components/button";
import { Input } from "@bbrc/ui/components/input";
import {
	BookCheck,
	BookCopy,
	BookOpen,
	Flag,
	Plus,
	Square,
	Timer,
} from "lucide-react";
import type { Route } from "next";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { type CSSProperties, useEffect, useId, useState } from "react";
import { BookAuthorLinks } from "@/components/blocks/book-author-links";
import { EditionLabelLink } from "@/components/blocks/reading/edition-label-link";
import { RelativeTime } from "@/components/blocks/relative-time";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { bookCoverUrl } from "@/lib/book-cover";
import { paceText, paceToneClass } from "@/lib/reading/pace-text";
import {
	useAbandonReading,
	useUpdateReadingProgress,
} from "@/lib/reading/use-reading";
import { cn } from "@/lib/utils";

// Changing the edition loads the picker only when asked.
const StartReadingDialog = dynamic(
	() =>
		import("@/components/blocks/reading/start-reading-dialog").then(
			(mod) => mod.StartReadingDialog,
		),
	{ ssr: false },
);

// The finish dialog carries the editor and the review form, so it loads when asked.
const BookMarkReadDialog = dynamic(
	() =>
		import("@/components/blocks/book-mark-read-dialog").then(
			(mod) => mod.BookMarkReadDialog,
		),
	{ ssr: false },
);

/** What the card needs; the profile passes a smaller shape than your own readings. */
export type ReadingCardData = Pick<
	ReadingItem,
	| "id"
	| "startedAt"
	| "percent"
	| "currentPage"
	| "totalPages"
	| "book"
	| "edition"
> & {
	sitting?: ReadingItem["sitting"];
	pace?: ReadingItem["pace"];
};

export type ReadingCardProps = {
	reading: ReadingCardData;
	/** Someone else's card: no controls. */
	readOnly?: boolean;
	/** False hides the bar and the numbers (the member keeps progress private). */
	progressVisible?: boolean;
	/** False on the book's own page, where the cover and title would repeat. */
	showBook?: boolean;
	/** True on the sitting's own page, where the "Club read" badge would repeat. */
	hideSitting?: boolean;
	className?: string;
};

/** The cover of the edition being read, falling back to the book's own. */
function coverSrc(reading: ReadingCardData): string | null {
	const edition = reading.edition;
	if (edition?.coverUrl) return edition.coverUrl;
	if (edition?.coverId) return bookCoverUrl(edition.coverId, "M");
	return bookCoverUrl(reading.book.coverId, "M");
}

/** A native range input: touch, mouse and keyboard all work, and it announces as a slider. */
function ProgressSlider({
	percent,
	label,
	valueText,
	disabled,
	draft,
	onDraft,
	onCommit,
}: {
	percent: number;
	label: string;
	valueText: string;
	disabled?: boolean;
	/** The position while it is being dragged (null when idle); the card shows it live. */
	draft: number | null;
	onDraft: (percent: number | null) => void;
	onCommit: (percent: number) => void;
}) {
	const shown = draft ?? percent;

	function commit() {
		if (draft != null && draft !== percent) onCommit(draft);
		onDraft(null);
	}

	return (
		<input
			type="range"
			min={0}
			max={100}
			step={1}
			value={shown}
			disabled={disabled}
			aria-label={label}
			aria-valuetext={valueText}
			className="reading-range"
			style={{ "--progress": `${shown}%` } as CSSProperties}
			onChange={(event) => onDraft(Number(event.target.value))}
			onPointerUp={commit}
			onKeyUp={commit}
			onBlur={commit}
		/>
	);
}

/** "I'm on page 120 of 340": type it straight in. Saves on Enter or when you leave the box. */
function PositionInput({
	reading,
	onSet,
}: {
	reading: ReadingCardData;
	onSet: (input: { page: number } | { percent: number }) => void;
}) {
	const id = useId();
	const byPage = reading.totalPages != null && reading.currentPage != null;
	const max = byPage ? (reading.totalPages ?? 0) : 100;
	const saved = byPage ? (reading.currentPage ?? 0) : reading.percent;
	const [value, setValue] = useState(String(saved));

	// Follow the server (and other screens) when we are not typing.
	useEffect(() => {
		setValue(String(saved));
	}, [saved]);

	function commit() {
		const parsed = Number.parseInt(value, 10);
		if (!Number.isFinite(parsed)) {
			setValue(String(saved));
			return;
		}
		const clamped = Math.min(max, Math.max(0, parsed));
		setValue(String(clamped));
		if (clamped !== saved)
			onSet(byPage ? { page: clamped } : { percent: clamped });
	}

	return (
		<form
			className="flex items-center gap-1.5"
			onSubmit={(event) => {
				event.preventDefault();
				commit();
			}}
		>
			<label htmlFor={id} className="text-muted-foreground text-sm">
				{byPage ? "I'm on page" : "I'm at"}
			</label>
			<Input
				id={id}
				type="text"
				inputMode="numeric"
				value={value}
				onChange={(event) => setValue(event.target.value.replace(/\D/g, ""))}
				onBlur={commit}
				className="h-8 w-16 text-center tabular-nums"
			/>
			<span className="text-muted-foreground text-sm tabular-nums">
				{byPage ? `of ${max}` : "%"}
			</span>
		</form>
	);
}

/**
 * One book being read: cover, how far along, a draggable bar, the page you are
 * on, a quick +pages, Reading Mode, and "Finished" / "Stop reading". Every
 * change shows at once (optimistic). This is the one reading card: the home
 * feed, the profile, the book page and the sitting page all use it.
 *
 * - `readOnly`: someone else's card, no controls.
 * - `showBook={false}`: on the book's own page (or its sitting) the cover and
 *   title would only repeat what is already there.
 * - `hideSitting`: on the sitting's own page the "Club read" badge is redundant.
 */
export function ReadingCard({
	reading,
	readOnly = false,
	progressVisible = true,
	showBook = true,
	hideSitting = false,
	className,
}: ReadingCardProps) {
	const update = useUpdateReadingProgress();
	const abandon = useAbandonReading();
	const [finishOpen, setFinishOpen] = useState(false);
	const [stopOpen, setStopOpen] = useState(false);
	const [editionOpen, setEditionOpen] = useState(false);
	// While the handle is dragged, the numbers above follow it.
	const [draft, setDraft] = useState<number | null>(null);

	const byPage = reading.totalPages != null && reading.currentPage != null;
	const quickStep = byPage ? 10 : 5;
	const src = coverSrc(reading);
	const pace = readOnly ? null : paceText(reading.pace ?? null);
	const bookHref = `/books/${reading.book.slug}` as Route;
	const finished = reading.percent >= 100;
	const shownPercent = draft ?? reading.percent;
	const shownPage =
		draft != null
			? Math.round((draft / 100) * (reading.totalPages ?? 0))
			: reading.currentPage;
	const progressLabel =
		byPage && progressVisible
			? `Page ${shownPage} of ${reading.totalPages}`
			: `${shownPercent}%`;
	const sitting = hideSitting ? undefined : reading.sitting;

	function bump(amount: number) {
		if (byPage) {
			update.mutate({
				id: reading.id,
				page: Math.min(
					reading.totalPages ?? 0,
					(reading.currentPage ?? 0) + amount,
				),
			});
		} else {
			update.mutate({
				id: reading.id,
				percent: Math.min(100, reading.percent + amount),
			});
		}
	}

	const editionButton = readOnly ? null : (
		<Button
			type="button"
			size="xs"
			variant="outline"
			onClick={() => setEditionOpen(true)}
		>
			<BookCopy data-icon="inline-start" aria-hidden />
			Change edition
		</Button>
	);

	const meta = (
		<p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs">
			<span>
				Started <RelativeTime date={reading.startedAt} />
			</span>
			<EditionLabelLink
				bookSlug={reading.book.slug}
				edition={reading.edition}
				totalPages={reading.totalPages}
			/>
			{editionButton}
		</p>
	);

	const progress = progressVisible ? (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-end justify-between gap-3 tabular-nums">
				<p
					className="font-heading font-semibold text-4xl leading-none tracking-tight"
					aria-live="polite"
				>
					{shownPercent}
					<span className="ms-0.5 font-normal text-lg text-muted-foreground">
						%
					</span>
				</p>
				<p className="pb-0.5 text-right text-muted-foreground text-xs sm:text-sm">
					{byPage ? (
						progressLabel
					) : (
						<span className="max-sm:hidden">of the book</span>
					)}
				</p>
			</div>
			{readOnly ? (
				// The numbers above say the same thing, so the bar is only a picture.
				<div className="h-2.5 w-full bg-muted" aria-hidden>
					<div
						className="h-full bg-primary"
						style={{ width: `${reading.percent}%` }}
					/>
				</div>
			) : (
				<div className="relative pb-4">
					<ProgressSlider
						percent={reading.percent}
						label={`Progress on ${reading.book.title}`}
						valueText={progressLabel}
						draft={draft}
						onDraft={setDraft}
						onCommit={(percent) => update.mutate({ id: reading.id, percent })}
					/>
					{/* Quarter marks under the bar, like a ruler. */}
					<span
						aria-hidden
						className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between text-3xs text-muted-foreground"
					>
						{["0", "25", "50", "75", "100"].map((tick) => (
							<span key={tick} className="tabular-nums">
								{tick}
							</span>
						))}
					</span>
				</div>
			)}
		</div>
	) : (
		<p className="text-muted-foreground text-sm">Reading</p>
	);

	return (
		<article
			className={cn(
				"group/reading relative flex flex-col gap-4 overflow-hidden border border-border bg-card p-4 sm:p-5",
				className,
			)}
			aria-label={`Reading ${reading.book.title}`}
		>
			{/* A hairline along the top edge that fills with the progress, even before you look at the numbers. */}
			{progressVisible ? (
				<span
					aria-hidden
					className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-muted"
				>
					<span
						className="block h-full bg-primary transition-[width] duration-200 ease-out motion-reduce:transition-none"
						style={{ width: `${shownPercent}%` }}
					/>
				</span>
			) : null}

			{showBook ? (
				<div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-4 gap-y-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-x-5">
					<Link
						href={bookHref}
						className="relative block aspect-2/3 w-full shrink-0 self-start overflow-hidden bg-muted shadow-md ring-1 ring-foreground/10 transition-transform duration-200 group-hover/reading:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover/reading:translate-y-0 sm:row-span-2"
						tabIndex={-1}
						aria-hidden
					>
						{src ? (
							<Image
								src={src}
								alt=""
								fill
								className="object-cover"
								sizes="112px"
							/>
						) : (
							<BookOpen
								className="absolute inset-0 m-auto size-6 text-muted-foreground"
								aria-hidden
							/>
						)}
					</Link>

					<div className="flex min-w-0 flex-col gap-1">
						{sitting ? (
							<Link
								href={`/sittings/${sitting.slug}` as Route}
								className="inline-flex w-fit items-center gap-1 border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-medium text-2xs text-foreground uppercase tracking-wide hover:bg-primary/15"
							>
								<Flag className="size-3" aria-hidden />
								Club read
							</Link>
						) : null}
						<h3 className="text-pretty font-semibold text-lg leading-tight tracking-tight sm:text-xl">
							<Link href={bookHref} className="hover:underline">
								{reading.book.title}
							</Link>
						</h3>
						<p className="text-muted-foreground text-sm">
							<BookAuthorLinks authors={reading.book.authors} />
						</p>
						{meta}
					</div>

					<div className="col-span-2 sm:col-span-1 sm:col-start-2">
						{progress}
					</div>
				</div>
			) : (
				<>
					<div className="flex min-w-0 flex-col gap-1">
						<p className="font-medium text-sm">You're reading this</p>
						{meta}
					</div>
					{progress}
				</>
			)}

			{readOnly ? null : (
				<div className="flex flex-col gap-3">
					{finished ? (
						<div className="flex flex-wrap items-center gap-2 border border-success/30 bg-success/5 p-2.5 text-sm">
							<span className="me-auto text-success-ink">
								You reached the end. Finished?
							</span>
							<Button size="sm" onClick={() => setFinishOpen(true)}>
								<BookCheck data-icon="inline-start" aria-hidden />
								Mark as read
							</Button>
						</div>
					) : (
						<>
							<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
								<PositionInput
									reading={reading}
									onSet={(input) => update.mutate({ id: reading.id, ...input })}
								/>
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={() => bump(quickStep)}
									aria-label={`Add ${quickStep} ${byPage ? "pages" : "percent"}`}
								>
									<Plus data-icon="inline-start" aria-hidden />
									{quickStep}
									{byPage ? "" : "%"}
								</Button>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<Button
									render={
										<Link href={`/reading/${reading.book.slug}` as Route} />
									}
									nativeButton={false}
									size="sm"
									variant="outline"
									className="flex-1 sm:flex-none"
								>
									<Timer data-icon="inline-start" aria-hidden />
									Reading Mode
								</Button>
								<span className="hidden flex-1 sm:block" />
								<Button
									type="button"
									size="icon-sm"
									variant="ghost"
									className="text-muted-foreground"
									onClick={() => setStopOpen(true)}
									aria-label="Stop reading this book"
									title="Stop reading"
								>
									<Square aria-hidden />
								</Button>
								<Button
									type="button"
									size="sm"
									className="flex-1 sm:flex-none"
									onClick={() => setFinishOpen(true)}
								>
									<BookCheck data-icon="inline-start" aria-hidden />
									Finished
								</Button>
							</div>
						</>
					)}
				</div>
			)}

			{pace ? (
				<p
					className={cn(
						"-mx-4 -mb-4 flex items-start gap-2 border-border border-t bg-muted/40 px-4 py-2 text-xs leading-snug sm:-mx-5 sm:-mb-5 sm:px-5",
						paceToneClass[pace.tone],
					)}
				>
					<span className="mt-1 size-1.5 shrink-0 bg-current" aria-hidden />
					{pace.text}
				</p>
			) : null}

			{readOnly ? null : (
				<>
					{editionOpen ? (
						<StartReadingDialog
							bookSlug={reading.book.slug}
							bookTitle={reading.book.title}
							bookPages={reading.book.pages}
							open={editionOpen}
							onOpenChange={setEditionOpen}
							reading={reading}
						/>
					) : null}
					{finishOpen ? (
						<BookMarkReadDialog
							bookSlug={reading.book.slug}
							bookTitle={reading.book.title}
							open={finishOpen}
							onOpenChange={setFinishOpen}
						/>
					) : null}
					<DestructiveConfirmDialog
						open={stopOpen}
						onOpenChange={setStopOpen}
						title="Stop reading this book?"
						description="Your progress on this book is deleted. You can start it again any time."
						confirmLabel="Stop reading"
						onConfirm={() => {
							setStopOpen(false);
							abandon.mutate({ id: reading.id });
						}}
					/>
				</>
			)}
		</article>
	);
}
