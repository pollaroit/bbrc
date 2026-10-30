"use client";

import type { PreviewSittingPollOptionsOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { Alert, AlertDescription, AlertTitle } from "@bbrc/ui/components/alert";
import { Button } from "@bbrc/ui/components/button";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation } from "@tanstack/react-query";
import {
	BookOpen,
	CalendarDays,
	Clock,
	Lock,
	RefreshCw,
	Search,
	Shuffle,
	Star,
} from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CreateSittingNomineeSheet } from "@/components/blocks/create-sitting-nominee-sheet";
import { CreateSittingWishlistCandidates } from "@/components/blocks/create-sitting-wishlist-candidates";
import { PollOptionReadersDialog } from "@/components/blocks/poll-option-readers-dialog";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import {
	type CreateSittingFormValues,
	toPreviewSittingPollOptionsInput,
} from "@/lib/create-sitting-form";
import { formatDateTime } from "@/lib/format-datetime";
import { readingEstimateLabel } from "@/lib/reading-estimate";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type PreviewOption = PreviewSittingPollOptionsOutput["options"][number];

type CreateSittingPollReviewProps = {
	formValues: CreateSittingFormValues;
	initialOptions: PreviewOption[];
	eligiblePoolSize: number;
	initialUsedUniformFallback: boolean;
	/** Books the admin chose directly earlier and that still fit: shown kept and marked. */
	initialNominatedBookIds?: string[];
	participantCount: number;
	/** Goes back to setup, handing over the books chosen directly so they can be carried over. */
	onBack: (nominated: PreviewOption[]) => void;
	onConfirm: (optionBookIds: string[], nominatedBookIds: string[]) => void;
	confirmLoading: boolean;
};

export function CreateSittingPollReview({
	formValues,
	initialOptions,
	eligiblePoolSize,
	initialUsedUniformFallback,
	initialNominatedBookIds = [],
	participantCount,
	onBack,
	onConfirm,
	confirmLoading,
}: CreateSittingPollReviewProps) {
	const [options, setOptions] = useState(initialOptions);
	const [usedUniformFallback, setUsedUniformFallback] = useState(
		initialUsedUniformFallback,
	);
	const [lockedBookIds, setLockedBookIds] = useState<string[]>(
		initialNominatedBookIds,
	);
	const [nominatedBookIds, setNominatedBookIds] = useState<string[]>(
		initialNominatedBookIds,
	);
	const [choosingBookId, setChoosingBookId] = useState<string | null>(null);
	const [replacingBookId, setReplacingBookId] = useState<string | null>(null);
	const [shuffling, setShuffling] = useState(false);
	const [readersBookId, setReadersBookId] = useState<string | null>(null);
	const [readersBookCount, setReadersBookCount] = useState(0);

	const previewBase = toPreviewSittingPollOptionsInput(formValues);
	const lockedSet = useMemo(() => new Set(lockedBookIds), [lockedBookIds]);
	const unlockedCount = options.filter(
		(option) => !lockedSet.has(option.book.id),
	).length;

	const replaceMutation = useMutation(
		orpc.sitting.replaceSittingPollPreviewOption.mutationOptions(),
	);
	const shuffleMutation = useMutation(
		orpc.sitting.shuffleSittingPollPreviewOptions.mutationOptions(),
	);

	const previewBusy = replacingBookId != null || shuffling;

	async function replaceOption(replaceBookId: string) {
		setReplacingBookId(replaceBookId);
		try {
			const result = await replaceMutation.mutateAsync({
				...previewBase,
				currentOptionBookIds: options.map((option) => option.book.id),
				replaceBookId,
			});
			setOptions((current) =>
				current.map((option) =>
					option.book.id === replaceBookId ? result.option : option,
				),
			);
			if (result.usedUniformFallback) {
				setUsedUniformFallback(true);
			}
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Could not replace option",
			);
		} finally {
			setReplacingBookId(null);
		}
	}

	async function shuffleOptions() {
		setShuffling(true);
		try {
			const result = await shuffleMutation.mutateAsync({
				...previewBase,
				currentOptionBookIds: options.map((option) => option.book.id),
				lockedBookIds,
			});
			setOptions(result.options);
			if (result.usedUniformFallback) {
				setUsedUniformFallback(true);
			}
			if (result.partialShuffle) {
				toast.warning(
					"Some unlocked slots could not be redrawn — not enough eligible books left.",
				);
			}
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Could not shuffle options",
			);
		} finally {
			setShuffling(false);
		}
	}

	/** The admin picked a book for a slot: it replaces that slot, is kept, and is marked as chosen. */
	function nominateBook(slotBookId: string, candidate: PreviewOption) {
		if (options.some((option) => option.book.id === candidate.book.id)) return;
		setOptions((current) =>
			current.map((option) =>
				option.book.id === slotBookId ? candidate : option,
			),
		);
		setLockedBookIds((current) => [
			...current.filter((id) => id !== slotBookId),
			candidate.book.id,
		]);
		setNominatedBookIds((current) => [
			...current.filter((id) => id !== slotBookId),
			candidate.book.id,
		]);
		toast.success(`“${candidate.book.title}” is on the poll and kept.`);
	}

	/** Only books still on the poll count as chosen by the admin. */
	const nominatedOnPoll = options.filter((option) =>
		nominatedBookIds.includes(option.book.id),
	);

	function toggleLock(bookId: string) {
		setLockedBookIds((current) =>
			current.includes(bookId)
				? current.filter((id) => id !== bookId)
				: [...current, bookId],
		);
	}

	const lockedTotal = lockedBookIds.length;
	const onPollBookIds = useMemo(
		() => new Set(options.map((option) => option.book.id)),
		[options],
	);

	/** Swaps a wished-for book in for the last book that has not been kept, and keeps it. */
	function useWishlistCandidate(candidate: PreviewOption) {
		if (onPollBookIds.has(candidate.book.id)) return;
		const slot = [...options]
			.reverse()
			.find((option) => !lockedSet.has(option.book.id));
		if (!slot) {
			toast.error("Every book is kept. Unlock one to make room.");
			return;
		}
		setOptions((current) =>
			current.map((option) =>
				option.book.id === slot.book.id ? candidate : option,
			),
		);
		setLockedBookIds((current) => [
			...current.filter((id) => id !== slot.book.id),
			candidate.book.id,
		]);
		toast.success(`“${candidate.book.title}” is on the poll and kept.`);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<h2 className="font-semibold text-xl tracking-tight">
					Review the draw
				</h2>
				<p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
					These wishlist books were drawn for the poll. Keep the ones you like,
					swap any slot for another random book, choose a book yourself, or
					shuffle everything you haven't kept.
				</p>
				<dl className="mt-1 grid grid-cols-2 divide-x divide-y divide-border border border-border sm:grid-cols-4 sm:divide-y-0">
					<ReviewFact label="On the poll">{options.length} books</ReviewFact>
					<ReviewFact label="Matched filters">
						{eligiblePoolSize} books
					</ReviewFact>
					<ReviewFact label="Readers">{participantCount}</ReviewFact>
					<ReviewFact label="Voting closes">
						{formatDateTime(formValues.pollDeadline)}
					</ReviewFact>
				</dl>
			</div>

			{usedUniformFallback ? (
				<Alert>
					<AlertTitle>Uniform random draw</AlertTitle>
					<AlertDescription>
						Every participant has read the remaining eligible books (or weights
						were otherwise zero), so the last pick used a uniform random choice
						from the pool.
					</AlertDescription>
				</Alert>
			) : null}

			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-muted-foreground text-sm tabular-nums">
					{lockedTotal > 0
						? `${lockedTotal} kept · ${unlockedCount} will change on shuffle`
						: "Nothing kept yet"}
				</p>
				<Button
					type="button"
					variant="outline"
					disabled={previewBusy || unlockedCount === 0 || confirmLoading}
					onClick={() => {
						void shuffleOptions();
					}}
				>
					<Shuffle
						data-icon="inline-start"
						className={cn(shuffling && "animate-pulse")}
						aria-hidden
					/>
					{lockedTotal > 0 ? "Shuffle the rest" : "Shuffle all"}
				</Button>
			</div>

			<ul className="grid gap-4 md:grid-cols-2">
				{options.map((option) => {
					const coverSrc = bookCoverUrl(option.book.coverId);
					const href = `/books/${option.book.slug}` as Route;
					const readCount = option.participantReadCount;
					const isReplacing = replacingBookId === option.book.id;
					const isLocked = lockedSet.has(option.book.id);
					const mostlyRead =
						participantCount > 0 && readCount / participantCount >= 0.5;

					return (
						<li
							key={option.book.id}
							className={cn(
								"flex flex-col border transition-colors",
								isLocked ? "border-foreground" : "border-border",
							)}
						>
							<div className="flex gap-4 p-4">
								<Link
									href={href}
									target="_blank"
									className="relative aspect-2/3 w-20 shrink-0 self-start overflow-hidden bg-muted ring-1 ring-foreground/10 sm:w-24"
								>
									{coverSrc ? (
										<Image
											src={coverSrc}
											alt=""
											fill
											className="object-cover"
											sizes="96px"
										/>
									) : (
										<div className="flex size-full items-center justify-center text-3xs text-muted-foreground">
											No cover
										</div>
									)}
								</Link>

								<div className="flex min-w-0 flex-1 flex-col gap-2">
									<div>
										<Link
											href={href}
											target="_blank"
											className="line-clamp-2 font-medium text-sm leading-snug hover:underline"
										>
											{option.book.title}
										</Link>
										<p className="text-muted-foreground text-sm">
											{formatBookAuthors(option.book.authors)}
										</p>
									</div>

									<p className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-muted-foreground text-xs tabular-nums">
										<span className="inline-flex items-center gap-1">
											<BookOpen className="size-3.5" aria-hidden />
											{option.book.pages} pages
										</span>
										<span className="inline-flex items-center gap-1">
											<CalendarDays className="size-3.5" aria-hidden />
											{option.book.publishedIn}
										</span>
										{option.book.openLibraryRating != null ? (
											<span
												className="inline-flex items-center gap-1"
												title="Open Library rating"
											>
												<Star className="size-3.5" aria-hidden />
												{option.book.openLibraryRating.toFixed(1)}
											</span>
										) : null}
									</p>

									{readingEstimateLabel(
										option.book.pages,
										formValues.pollDeadline,
									) ? (
										<p
											className="inline-flex items-center gap-1 text-muted-foreground text-xs"
											title="If reading starts when voting ends. Weekends, the page count and the start date can change it."
										>
											<Clock className="size-3.5 shrink-0" aria-hidden />
											{readingEstimateLabel(
												option.book.pages,
												formValues.pollDeadline,
											)}
										</p>
									) : null}

									<div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
										{participantCount > 0 ? (
											<button
												type="button"
												className="text-foreground underline-offset-2 hover:underline"
												onClick={() => {
													setReadersBookCount(readCount);
													setReadersBookId(option.book.id);
												}}
											>
												{readCount} of {participantCount} have read it
											</button>
										) : (
											<span className="text-muted-foreground">
												{readCount} read
											</span>
										)}
										{nominatedBookIds.includes(option.book.id) ? (
											<span className="border border-foreground px-1.5 py-0.5 text-foreground">
												Chosen by you
											</span>
										) : null}
										{mostlyRead ? (
											<span className="border border-warning/50 px-1.5 py-0.5 text-warning-ink">
												Mostly read
											</span>
										) : null}
									</div>
								</div>
							</div>

							<div className="flex items-center justify-end gap-2 border-border border-t bg-muted/20 px-4 py-2.5">
								<Button
									type="button"
									variant={isLocked ? "secondary" : "outline"}
									size="xs"
									disabled={previewBusy}
									aria-pressed={isLocked}
									onClick={() => {
										toggleLock(option.book.id);
									}}
								>
									<Lock data-icon="inline-start" aria-hidden />
									{isLocked ? "Kept" : "Keep"}
								</Button>
								<Button
									type="button"
									variant="outline"
									size="xs"
									disabled={previewBusy || confirmLoading}
									onClick={() => {
										setChoosingBookId(option.book.id);
									}}
								>
									<Search data-icon="inline-start" aria-hidden />
									Choose
								</Button>
								<Button
									type="button"
									variant="outline"
									size="xs"
									disabled={(previewBusy && !isReplacing) || isLocked}
									title={isLocked ? "Unlock this book to swap it" : undefined}
									onClick={() => {
										void replaceOption(option.book.id);
									}}
								>
									<RefreshCw
										data-icon="inline-start"
										className={cn(isReplacing && "animate-spin")}
										aria-hidden
									/>
									Swap
								</Button>
							</div>
						</li>
					);
				})}
			</ul>

			<CreateSittingWishlistCandidates
				previewInput={previewBase}
				onPollBookIds={onPollBookIds}
				disabled={previewBusy || confirmLoading}
				onUse={useWishlistCandidate}
			/>

			<CreateSittingNomineeSheet
				open={choosingBookId != null}
				onOpenChange={(open) => {
					if (!open) setChoosingBookId(null);
				}}
				previewInput={previewBase}
				currentOptionBookIds={options.map((option) => option.book.id)}
				onPick={(candidate) => {
					if (choosingBookId) nominateBook(choosingBookId, candidate);
				}}
			/>

			<PollOptionReadersDialog
				source="preview"
				bookId={readersBookId}
				participantUserIds={formValues.participantUserIds}
				readCount={readersBookCount}
				onDismiss={() => {
					setReadersBookId(null);
				}}
			/>

			<div className="flex flex-col gap-3 border-border border-t pt-4 md:sticky md:bottom-0 md:z-10 md:bg-background/95 md:py-3 md:backdrop-blur">
				<p className="text-muted-foreground text-xs leading-relaxed">
					Starting the sitting opens voting, gives every reader participation
					XP, and tells the club a new sitting is open.
				</p>
				<div className="grid grid-cols-2 gap-2 sm:flex">
					<Button
						type="button"
						variant="outline"
						disabled={confirmLoading || previewBusy}
						onClick={() => {
							onBack(nominatedOnPoll);
						}}
					>
						Back to setup
					</Button>
					<LoadingButton
						type="button"
						loading={confirmLoading}
						disabled={previewBusy}
						onClick={() => {
							onConfirm(
								options.map((option) => option.book.id),
								nominatedOnPoll.map((option) => option.book.id),
							);
						}}
					>
						Start sitting
					</LoadingButton>
				</div>
			</div>
		</div>
	);
}

function ReviewFact({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-w-0 flex-col gap-0.5 px-3 py-3">
			<dt className="text-muted-foreground text-xs">{label}</dt>
			<dd className="font-medium text-sm tabular-nums">{children}</dd>
		</div>
	);
}
