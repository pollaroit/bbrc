"use client";

import type { ReadingItem } from "@bbrc/api/modules/reading/reading.schema";
import { Button } from "@bbrc/ui/components/button";
import { Input } from "@bbrc/ui/components/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@bbrc/ui/components/popover";
import {
	BookCheck,
	BookCopy,
	BookOpen,
	Flag,
	Hash,
	Plus,
	Square,
} from "lucide-react";
import type { Route } from "next";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { type CSSProperties, useId, useState } from "react";
import { RelativeTime } from "@/components/blocks/relative-time";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { editionDisplayLabel } from "@/lib/reading/edition-text";
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
	onCommit,
}: {
	percent: number;
	label: string;
	valueText: string;
	disabled?: boolean;
	onCommit: (percent: number) => void;
}) {
	const [draft, setDraft] = useState<number | null>(null);
	const shown = draft ?? percent;

	function commit() {
		if (draft != null && draft !== percent) onCommit(draft);
		setDraft(null);
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
			onChange={(event) => setDraft(Number(event.target.value))}
			onPointerUp={commit}
			onKeyUp={commit}
			onBlur={commit}
		/>
	);
}

function SetPositionPopover({
	reading,
	disabled,
	onSet,
}: {
	reading: ReadingCardData;
	disabled?: boolean;
	onSet: (input: { page: number } | { percent: number }) => void;
}) {
	const id = useId();
	const byPage = reading.totalPages != null && reading.currentPage != null;
	const [open, setOpen] = useState(false);
	const [value, setValue] = useState("");
	const max = byPage ? (reading.totalPages ?? 0) : 100;

	function submit() {
		const parsed = Number.parseInt(value, 10);
		if (!Number.isFinite(parsed)) return;
		const clamped = Math.min(max, Math.max(0, parsed));
		onSet(byPage ? { page: clamped } : { percent: clamped });
		setOpen(false);
		setValue("");
	}

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (next) {
					setValue(
						String(byPage ? (reading.currentPage ?? 0) : reading.percent),
					);
				}
			}}
		>
			<PopoverTrigger
				render={
					<Button
						type="button"
						size="xs"
						variant="outline"
						disabled={disabled}
					/>
				}
			>
				<Hash data-icon="inline-start" aria-hidden />
				{byPage ? "Set page" : "Set %"}
			</PopoverTrigger>
			<PopoverContent align="start" className="w-64 gap-3">
				<form
					className="flex flex-col gap-2"
					onSubmit={(event) => {
						event.preventDefault();
						submit();
					}}
				>
					<label htmlFor={id} className="font-medium text-sm">
						{byPage ? "I'm on page" : "I'm this far along (%)"}
					</label>
					<div className="flex items-center gap-2">
						<Input
							id={id}
							type="number"
							inputMode="numeric"
							min={0}
							max={max}
							value={value}
							autoFocus
							onChange={(event) => setValue(event.target.value)}
							className="tabular-nums"
						/>
						{byPage ? (
							<span className="shrink-0 text-muted-foreground text-sm tabular-nums">
								of {reading.totalPages}
							</span>
						) : null}
					</div>
					<Button type="submit" size="sm">
						Save
					</Button>
				</form>
			</PopoverContent>
		</Popover>
	);
}

/**
 * One book being read: cover, how far along, a draggable bar, quick +pages,
 * and "Finished" / "Stop reading". Every change shows at once (optimistic).
 * `readOnly` is for other members' cards.
 */
export function ReadingCard({
	reading,
	readOnly = false,
	progressVisible = true,
	className,
}: ReadingCardProps) {
	const update = useUpdateReadingProgress();
	const abandon = useAbandonReading();
	const [finishOpen, setFinishOpen] = useState(false);
	const [stopOpen, setStopOpen] = useState(false);
	const [editionOpen, setEditionOpen] = useState(false);

	const byPage = reading.totalPages != null && reading.currentPage != null;
	const unit = byPage ? "pages" : "percent";
	const quickSteps = byPage ? [10, 25] : [5, 10];
	const src = coverSrc(reading);
	const pace = readOnly ? null : paceText(reading.pace ?? null);
	const bookHref = `/books/${reading.book.slug}` as Route;
	const finished = reading.percent >= 100;
	const progressLabel =
		byPage && progressVisible
			? `Page ${reading.currentPage} of ${reading.totalPages}`
			: `${reading.percent}%`;

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

	return (
		<article
			className={cn(
				"relative flex gap-4 border border-border bg-card p-3 sm:p-4",
				reading.sitting && "border-l-2 border-l-primary",
				className,
			)}
			aria-label={`Reading ${reading.book.title}`}
		>
			<Link
				href={bookHref}
				className="relative block aspect-2/3 w-16 shrink-0 self-start overflow-hidden bg-muted ring-1 ring-foreground/10 sm:w-24"
				tabIndex={-1}
				aria-hidden
			>
				{src ? (
					<Image src={src} alt="" fill className="object-cover" sizes="96px" />
				) : (
					<BookOpen
						className="absolute inset-0 m-auto size-6 text-muted-foreground"
						aria-hidden
					/>
				)}
			</Link>

			<div className="flex min-w-0 flex-1 flex-col gap-3">
				<div className="flex min-w-0 flex-col gap-0.5">
					<h3 className="font-semibold text-base leading-snug tracking-tight">
						<Link href={bookHref} className="hover:underline">
							{reading.book.title}
						</Link>
					</h3>
					<p className="text-muted-foreground text-sm">
						{formatBookAuthors(reading.book.authors)}
					</p>
					<p className="flex min-w-0 flex-wrap items-center gap-x-2 text-muted-foreground text-xs">
						<span>
							Started <RelativeTime date={reading.startedAt} />
						</span>
						<span
							className="min-w-0 truncate"
							title={editionDisplayLabel(reading.edition, reading.totalPages)}
						>
							{editionDisplayLabel(reading.edition, reading.totalPages)}
						</span>
						{readOnly ? null : (
							<button
								type="button"
								onClick={() => setEditionOpen(true)}
								className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
							>
								<BookCopy className="size-3" aria-hidden />
								Change edition
							</button>
						)}
						{reading.sitting ? (
							<Link
								href={`/sittings/${reading.sitting.slug}` as Route}
								className="inline-flex items-center gap-1 text-foreground hover:underline"
							>
								<Flag className="size-3" aria-hidden />
								Club read
							</Link>
						) : null}
					</p>
				</div>

				{progressVisible ? (
					<div className="flex flex-col gap-1">
						<div className="flex items-baseline justify-between gap-3 text-sm tabular-nums">
							<span className="font-medium">{progressLabel}</span>
							<span className="text-muted-foreground">{reading.percent}%</span>
						</div>
						{readOnly ? (
							// The numbers above say the same thing, so the bar is only a picture.
							<div className="h-2 w-full bg-muted" aria-hidden>
								<div
									className="h-full bg-primary"
									style={{ width: `${reading.percent}%` }}
								/>
							</div>
						) : (
							<ProgressSlider
								percent={reading.percent}
								label={`Progress on ${reading.book.title}`}
								valueText={progressLabel}
								onCommit={(percent) =>
									update.mutate({ id: reading.id, percent })
								}
							/>
						)}
					</div>
				) : (
					<p className="text-muted-foreground text-sm">Reading</p>
				)}

				{pace ? (
					<p
						className={cn(
							"flex items-start gap-2 text-xs leading-snug",
							paceToneClass[pace.tone],
						)}
					>
						<span className="mt-1 size-1.5 shrink-0 bg-current" aria-hidden />
						{pace.text}
					</p>
				) : null}

				{readOnly ? null : finished ? (
					<div className="flex flex-wrap items-center gap-2 border border-success/30 bg-success/5 p-2 text-sm">
						<span className="me-auto text-success-ink">
							You reached the end. Finished?
						</span>
						<Button size="sm" onClick={() => setFinishOpen(true)}>
							<BookCheck data-icon="inline-start" aria-hidden />
							Mark as read
						</Button>
					</div>
				) : (
					<div className="flex flex-wrap items-center gap-1.5">
						{quickSteps.map((step) => (
							<Button
								key={step}
								type="button"
								size="xs"
								variant="outline"
								onClick={() => bump(step)}
								aria-label={`Add ${step} ${unit === "pages" ? "pages" : "percent"}`}
							>
								<Plus data-icon="inline-start" aria-hidden />
								{step}
								{unit === "pages" ? "" : "%"}
							</Button>
						))}
						<SetPositionPopover
							reading={reading}
							onSet={(input) => update.mutate({ id: reading.id, ...input })}
						/>
						<span className="flex-1" />
						<Button
							type="button"
							size="xs"
							variant="ghost"
							className="text-muted-foreground"
							onClick={() => setStopOpen(true)}
						>
							<Square data-icon="inline-start" aria-hidden />
							Stop
						</Button>
						<Button type="button" size="xs" onClick={() => setFinishOpen(true)}>
							<BookCheck data-icon="inline-start" aria-hidden />
							Finished
						</Button>
					</div>
				)}
			</div>

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
