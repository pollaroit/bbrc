"use client";

import type { ReadingBookState } from "@bbrc/api/modules/reading/reading.schema";
import {
	contentPlainText,
	type FeedbackRatingStep,
	isFeedbackRatingStep,
	plainTextToRichDocument,
	readFinishedMonthFromClubNow,
	serializeRichDocument,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { Input } from "@bbrc/ui/components/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { Switch } from "@bbrc/ui/components/switch";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
	BookCheck,
	BookOpen,
	ChevronDown,
	PenLine,
	Trash2,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FeedbackHalfStarRating } from "@/components/blocks/feedback-half-star-rating";
import { EditionLabelLink } from "@/components/blocks/reading/edition-label-link";
import {
	ReviewImageField,
	uploadReviewImage,
} from "@/components/blocks/review-image-field";
import { RichTextEditor } from "@/components/blocks/rich-text-editor";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import type { BooksTranslator } from "@/lib/books/books-translator";
import { clubTimeZone } from "@/lib/club-timezone";
import { invalidateFeedbackQueries } from "@/lib/feedback/invalidate-feedback-queries";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { invalidateReadQueries } from "@/lib/invalidate-read-queries";
import { useSyncedBoolean } from "@/lib/optimistic/use-synced-boolean";
import {
	READ_DATE_MONTH_UNSET,
	READ_DATE_MONTHS,
} from "@/lib/read-date-months";
import {
	invalidateReadingQueries,
	useReadingState,
} from "@/lib/reading/use-reading";
import { cn } from "@/lib/utils";
import { client, orpc, queryClient } from "@/utils/orpc";

type BookMarkReadDialogProps = {
	bookSlug: string;
	bookTitle: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/**
	 * An edition to record with the read (the edition page passes the one being
	 * looked at). It wins over the edition of the member's current reading, and
	 * is saved even when the book was already marked read.
	 */
	edition?: {
		editionOlid: string | null;
		bookEditionId: string | null;
		label: string | null;
	};
};

function parseOptionalInt(value: string): number | undefined {
	const trimmed = value.trim();
	if (!trimmed) {
		return undefined;
	}
	const n = Number.parseInt(trimmed, 10);
	return Number.isFinite(n) ? n : undefined;
}

function clampDigits(value: string, maxLength: number) {
	return value.replace(/\D/g, "").slice(0, maxLength);
}

const REVIEW_MAX_PLAIN = 500;

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Started Oct 20 · finishing today makes it 5 days." */
function readingSummary(
	startedAt: Date | string,
	f: ReturnType<typeof useFormatters>,
	t: BooksTranslator,
) {
	const started = new Date(startedAt);
	const days = Math.max(
		1,
		Math.ceil((Date.now() - started.getTime()) / DAY_MS),
	);
	const date = f.dateWith(started, {
		month: "short",
		day: "numeric",
		timeZone: clubTimeZone,
	});
	return t("markRead.summary", { date, days });
}

export function BookMarkReadDialog({
	bookSlug,
	bookTitle,
	open,
	onOpenChange,
	edition,
}: BookMarkReadDialogProps) {
	const t = useTranslations("books");
	const f = useFormatters();
	const [endYear, setEndYear] = useState("");
	const [endMonth, setEndMonth] = useState("");
	const [feedbackRating, setFeedbackRating] =
		useState<FeedbackRatingStep | null>(null);
	const [feedbackReview, setFeedbackReview] = useState("");
	const [reviewOpen, setReviewOpen] = useState(false);
	const [shareToFeed, setShareToFeed] = useState(false);
	/** What to do once the save lands (the dialog is already closed by then). */
	const shareRef = useRef<{ text: string } | null>(null);
	const [reviewImage, setReviewImage] = useState<File | null>(null);
	/** The photo to attach once the review exists (state is cleared when the dialog closes). */
	const reviewImageRef = useRef<File | null>(null);
	/** Fill the form from the server once per opening, so a refetch never wipes typing. */
	const initializedRef = useRef(false);
	const reviewBlockRef = useRef<HTMLDivElement>(null);

	const stateQuery = useQuery({
		...orpc.read.getBookReadState.queryOptions({
			input: { bookSlug },
		}),
		enabled: open,
	});

	const prefsKey = orpc.read.getReadPreferences.queryKey();
	const prefsQuery = useQuery({
		...orpc.read.getReadPreferences.queryOptions(),
		enabled: open,
	});

	const bookQuery = useQuery({
		...orpc.book.getBookBySlug.queryOptions({ input: bookSlug }),
		enabled: open,
	});

	// Reading and wishlist state: prefill the edition and explain what finishing does.
	const readingStateQuery = useReadingState(bookSlug, open);
	const reading = readingStateQuery.data?.reading ?? null;
	const inWishlist = readingStateQuery.data?.inWishlist ?? false;

	const currentMonth = readFinishedMonthFromClubNow(new Date(), clubTimeZone);

	const prefSync = useSyncedBoolean({
		serverValue: prefsQuery.data?.defaultToCurrentDate ?? true,
		send: (desired) =>
			client.read.setReadPreferences({ defaultToCurrentDate: desired }),
		confirmedFrom: (result) => result.defaultToCurrentDate,
		onConfirmed: (result) => {
			queryClient.setQueryData(prefsKey, result);
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : t("markRead.settingFailed"),
			);
		},
	});

	// Bring the editor into view when it opens inside the scrolling form.
	useEffect(() => {
		if (!reviewOpen) {
			return;
		}
		const frame = requestAnimationFrame(() => {
			reviewBlockRef.current?.scrollIntoView({
				block: "nearest",
				behavior: "smooth",
			});
		});
		return () => cancelAnimationFrame(frame);
	}, [reviewOpen]);

	useEffect(() => {
		if (!open) {
			initializedRef.current = false;
			setFeedbackRating(null);
			setFeedbackReview("");
			setReviewImage(null);
			setReviewOpen(false);
			setShareToFeed(false);
			return;
		}
		if (initializedRef.current || !stateQuery.data || !prefsQuery.data) {
			return;
		}
		initializedRef.current = true;

		if (stateQuery.data.hasRead) {
			setEndYear(
				stateQuery.data.readEndYear != null
					? String(stateQuery.data.readEndYear)
					: "",
			);
			setEndMonth(
				stateQuery.data.readEndMonth != null
					? String(stateQuery.data.readEndMonth)
					: "",
			);
			return;
		}

		// A new read starts on the current month when the member asked for that.
		if (prefsQuery.data.defaultToCurrentDate) {
			setEndYear(String(currentMonth.year));
			setEndMonth(String(currentMonth.month));
		} else {
			setEndYear("");
			setEndMonth("");
		}
	}, [
		open,
		stateQuery.data,
		prefsQuery.data,
		currentMonth.month,
		currentMonth.year,
	]);

	const readStateKey = orpc.read.getBookReadState.queryKey({
		input: { bookSlug },
	});
	const engagementKey = orpc.favorite.getViewerLibraryEngagement.queryKey();

	/** Applies the change to the caches right away; returns what to restore on failure. */
	async function applyReadOptimistically(next: {
		hasRead: boolean;
		readEndYear?: number | null;
		readEndMonth?: number | null;
		withFeedback?: { rating: number } | null;
	}) {
		await Promise.all([
			queryClient.cancelQueries({ queryKey: readStateKey }),
			queryClient.cancelQueries({ queryKey: engagementKey }),
		]);

		const previousState = queryClient.getQueryData(readStateKey);
		const previousEngagement = queryClient.getQueryData(engagementKey);

		queryClient.setQueryData(readStateKey, {
			hasRead: next.hasRead,
			hasFeedback: next.hasRead
				? Boolean(previousState?.hasFeedback || next.withFeedback)
				: Boolean(previousState?.hasFeedback),
			readEndYear: next.hasRead
				? next.readEndYear === undefined
					? (previousState?.readEndYear ?? null)
					: next.readEndYear
				: null,
			readEndMonth: next.hasRead
				? next.readEndMonth === undefined
					? (previousState?.readEndMonth ?? null)
					: next.readEndMonth
				: null,
			editionId: next.hasRead ? (previousState?.editionId ?? null) : null,
		});

		queryClient.setQueryData(engagementKey, (old) => {
			if (!old) {
				return old;
			}
			const readSlugs = old.readSlugs.filter((slug) => slug !== bookSlug);
			return {
				...old,
				readSlugs: next.hasRead ? [...readSlugs, bookSlug] : readSlugs,
				...(next.withFeedback
					? {
							feedbackBookSlugs: [
								...old.feedbackBookSlugs.filter((slug) => slug !== bookSlug),
								bookSlug,
							],
							feedbackRatings: [
								...old.feedbackRatings.filter((r) => r.bookSlug !== bookSlug),
								{ bookSlug, rating: next.withFeedback.rating },
							],
						}
					: {}),
			};
		});

		// The book page's "Reads (n)" tab moves with the change.
		if (Boolean(previousState?.hasRead) !== next.hasRead) {
			queryClient.setQueriesData(
				{ queryKey: orpc.read.listForBook.key({ input: { bookSlug } }) },
				(old: { total?: number } | undefined) =>
					old && typeof old.total === "number"
						? {
								...old,
								total: Math.max(0, old.total + (next.hasRead ? 1 : -1)),
							}
						: old,
			);
		}

		return { previousState, previousEngagement };
	}

	function restoreRead(
		snapshot: Awaited<ReturnType<typeof applyReadOptimistically>> | undefined,
	) {
		if (!snapshot) {
			return;
		}
		queryClient.setQueryData(readStateKey, snapshot.previousState);
		queryClient.setQueryData(engagementKey, snapshot.previousEngagement);
	}

	function refreshReadQueries(includeFeedback: boolean) {
		void invalidateReadQueries(bookSlug);
		if (includeFeedback) {
			void invalidateFeedbackQueries();
		}
	}

	/** Finishing ends the reading and clears the wishlist: show that at once. */
	async function applyReadingOptimistically() {
		const mineKey = orpc.reading.mine.queryKey();
		const stateKey = orpc.reading.state.queryKey({ input: { bookSlug } });
		await Promise.all([
			queryClient.cancelQueries({ queryKey: mineKey }),
			queryClient.cancelQueries({ queryKey: stateKey }),
		]);
		const previousMine = queryClient.getQueryData(mineKey);
		const previousState = queryClient.getQueryData(stateKey);
		if (previousMine) {
			queryClient.setQueryData(mineKey, {
				items: previousMine.items.filter((item) => item.book.slug !== bookSlug),
			});
		}
		if (previousState) {
			queryClient.setQueryData<ReadingBookState>(stateKey, {
				...previousState,
				hasRead: true,
				inWishlist: false,
				reading: null,
				activeCount: Math.max(
					0,
					previousState.activeCount - (previousState.reading ? 1 : 0),
				),
			});
		}
		return { mineKey, stateKey, previousMine, previousState };
	}

	/** Posts "finished this book" with the book attached. Failing here never undoes the read. */
	async function shareFinishedBook(text: string) {
		try {
			await client.post.create({
				content: serializeRichDocument(plainTextToRichDocument(text)),
				attachment: { kind: "book", slug: bookSlug },
			});
			toast.success(t("markRead.shared"));
			void queryClient.invalidateQueries({
				queryKey: orpc.post.getPostList.key(),
			});
		} catch (error) {
			toast.error(
				error instanceof Error
					? t("markRead.readButShareFailedWith", { message: error.message })
					: t("markRead.readButShareFailed"),
			);
		}
	}

	const saveMutation = useMutation(
		orpc.read.setRead.mutationOptions({
			// One save at a time per book, in click order.
			scope: { id: `read-${bookSlug}` },
			onMutate: async (variables) => {
				const readingSnapshot = await applyReadingOptimistically();
				const snapshot = await applyReadOptimistically({
					hasRead: true,
					readEndYear: variables.readEndYear,
					readEndMonth: variables.readEndMonth,
					withFeedback:
						"feedbackRating" in variables && variables.feedbackRating != null
							? { rating: variables.feedbackRating }
							: null,
				});
				onOpenChange(false);
				return { ...snapshot, readingSnapshot };
			},
			onError: (error, _variables, snapshot) => {
				restoreRead(snapshot);
				const readingSnap = snapshot?.readingSnapshot;
				if (readingSnap) {
					queryClient.setQueryData(
						readingSnap.mineKey,
						readingSnap.previousMine,
					);
					queryClient.setQueryData(
						readingSnap.stateKey,
						readingSnap.previousState,
					);
				}
				shareRef.current = null;
				reviewImageRef.current = null;
				toast.error(error.message || t("markRead.saveFailed"));
			},
			onSuccess: (data) => {
				const share = shareRef.current;
				shareRef.current = null;
				if (share) void shareFinishedBook(share.text);
				const photo = reviewImageRef.current;
				reviewImageRef.current = null;
				// The review was created with the read; the photo goes on after it.
				if (photo && data?.createdFeedbackSlug) {
					void uploadReviewImage(photo, data.createdFeedbackSlug);
				}
			},
			onSettled: (_data, _error, variables) => {
				refreshReadQueries(
					"feedbackRating" in variables && variables.feedbackRating != null,
				);
				invalidateReadingQueries();
			},
		}),
	);

	const removeMutation = useMutation(
		orpc.read.removeRead.mutationOptions({
			scope: { id: `read-${bookSlug}` },
			onMutate: async () => {
				const snapshot = await applyReadOptimistically({ hasRead: false });
				onOpenChange(false);
				return snapshot;
			},
			onError: (error, _variables, snapshot) => {
				restoreRead(snapshot);
				toast.error(error.message || t("markRead.removeFailed"));
			},
			onSettled: () => {
				refreshReadQueries(false);
			},
		}),
	);

	const hasRead = stateQuery.data?.hasRead ?? false;
	const hasFeedback = stateQuery.data?.hasFeedback ?? false;
	/** Offer a rating and review unless the member already left one for this book. */
	const offerFeedback = !hasFeedback;

	function buildFinishMonthPayload():
		| { readEndYear: number; readEndMonth: number }
		| { readEndYear: null; readEndMonth: null }
		| undefined {
		const y = parseOptionalInt(endYear);
		const m = parseOptionalInt(endMonth);
		if (y == null && m == null) {
			return { readEndYear: null, readEndMonth: null };
		}
		if (y == null || m == null) {
			toast.error(t("markRead.chooseBoth"));
			return undefined;
		}
		if (m < 1 || m > 12) {
			toast.error(t("markRead.monthRange"));
			return undefined;
		}
		return { readEndYear: y, readEndMonth: m };
	}

	function setMonthOffset(offset: number) {
		const date = new Date(
			currentMonth.year,
			currentMonth.month - 1 + offset,
			1,
		);
		setEndYear(String(date.getFullYear()));
		setEndMonth(String(date.getMonth() + 1));
	}

	function handlePreferenceChange(next: boolean) {
		prefSync.set(next);
		// Only touch an untouched new read: today's month on, empty off.
		if (hasRead) {
			return;
		}
		const isCurrent =
			endYear === String(currentMonth.year) &&
			endMonth === String(currentMonth.month);
		if (next && !endYear && !endMonth) {
			setMonthOffset(0);
		} else if (!next && isCurrent) {
			setEndYear("");
			setEndMonth("");
		}
	}

	function submitRead() {
		const finish = buildFinishMonthPayload();
		if (finish === undefined) {
			return;
		}

		const reviewPlain = contentPlainText(feedbackReview).trim();
		const hasRating =
			feedbackRating != null && isFeedbackRatingStep(feedbackRating);
		const hasReview = reviewPlain.length > 0;

		if (hasReview && !hasRating) {
			toast.error(t("markRead.addRatingToPublish"));
			return;
		}

		// A new read keeps the edition the member was reading.
		const editionFields = edition
			? edition.bookEditionId
				? { bookEditionId: edition.bookEditionId, editionId: null }
				: { editionId: edition.editionOlid, bookEditionId: null }
			: !hasRead && reading?.edition
				? reading.edition.kind === "member"
					? { bookEditionId: reading.edition.memberEditionId }
					: { editionId: reading.edition.olid }
				: {};

		if (shareToFeed && !hasRead) {
			const authors = book ? formatBookAuthors(book.authors) : null;
			const rating =
				offerFeedback && hasRating && feedbackRating != null
					? ` ${t("markRead.ratedSuffix", { rating: f.decimal(feedbackRating, 1) })}`
					: "";
			shareRef.current = {
				text: t("markRead.shareText", {
					title: bookTitle,
					authors: authors ?? "none",
					rating,
				}),
			};
		} else {
			shareRef.current = null;
		}

		reviewImageRef.current = offerFeedback && hasRating ? reviewImage : null;

		saveMutation.mutate({
			bookSlug,
			...finish,
			...editionFields,
			...(offerFeedback && hasRating
				? {
						feedbackRating,
						feedbackReview: hasReview ? feedbackReview : undefined,
					}
				: {}),
		});
	}

	const monthValue = endMonth.length > 0 ? endMonth : READ_DATE_MONTH_UNSET;
	const monthDisplayLabel = endMonth.trim()
		? t(`months.${endMonth}` as "months.1")
		: undefined;
	const dateIncomplete =
		(endYear.length > 0 && endMonth.length === 0) ||
		(endYear.length === 0 && endMonth.length > 0);
	const book = bookQuery.data;
	const coverSrc = bookCoverUrl(book?.coverId, "M");
	const reviewLength = contentPlainText(feedbackReview).trim().length;
	const ready = stateQuery.data != null && prefsQuery.data != null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
				<form
					className="flex max-h-[min(90vh,720px)] flex-col"
					onSubmit={(event) => {
						event.preventDefault();
						if (ready) {
							submitRead();
						}
					}}
				>
					<DialogHeader className="flex-row items-center gap-4 border-border border-b bg-muted/30 p-5 pr-12 text-left">
						<div className="relative aspect-2/3 w-12 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
							{coverSrc ? (
								<Image
									src={coverSrc}
									alt=""
									fill
									className="object-cover"
									sizes="48px"
								/>
							) : (
								<BookCheck
									className="absolute inset-0 m-auto size-5 text-muted-foreground"
									aria-hidden
								/>
							)}
						</div>
						<div className="flex min-w-0 flex-col gap-0.5">
							<DialogTitle>
								{hasRead ? t("markRead.titleEdit") : t("markRead.titleNew")}
							</DialogTitle>
							<DialogDescription className="line-clamp-2">
								{bookTitle}
								{book ? ` · ${formatBookAuthors(book.authors)}` : ""}
							</DialogDescription>
						</div>
					</DialogHeader>

					<div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-5">
						{edition?.label ? (
							<section
								className="flex flex-col gap-1.5 border border-border bg-muted/30 p-3 text-sm"
								aria-label={t("markRead.editionLabel")}
							>
								<p className="flex items-center gap-2 font-medium">
									<BookOpen className="size-4" aria-hidden />
									{edition.label}
								</p>
								<p className="text-muted-foreground text-xs leading-relaxed">
									{t("markRead.editionNote")}
								</p>
							</section>
						) : reading && !hasRead ? (
							<section
								className="flex flex-col gap-1.5 border border-border bg-muted/30 p-3 text-sm"
								aria-label={t("markRead.yourReading")}
							>
								<p className="flex items-center gap-2 font-medium">
									<BookOpen className="size-4 shrink-0" aria-hidden />
									<EditionLabelLink
										bookSlug={bookSlug}
										edition={reading.edition}
										totalPages={reading.totalPages}
									/>
								</p>
								<p className="text-muted-foreground text-xs leading-relaxed">
									{readingSummary(reading.startedAt, f, t)}
									{inWishlist ? t("markRead.leavesWishlist") : ""}
								</p>
							</section>
						) : inWishlist && !hasRead ? (
							<p className="border border-border bg-muted/30 p-3 text-muted-foreground text-xs">
								{t("markRead.removesFromWishlist")}
							</p>
						) : null}

						<section
							className="flex flex-col gap-3"
							aria-labelledby="read-when"
						>
							<div>
								<h3 id="read-when" className="font-medium text-sm">
									{t("markRead.whenTitle")}
								</h3>
								<p className="text-muted-foreground text-xs">
									{t("markRead.whenHint")}
								</p>
							</div>

							<div className="flex gap-2">
								<Select
									value={monthValue}
									onValueChange={(value) => {
										if (value == null) {
											return;
										}
										setEndMonth(value === READ_DATE_MONTH_UNSET ? "" : value);
									}}
								>
									<SelectTrigger
										className="min-w-0 flex-1"
										aria-label={t("markRead.finishMonth")}
									>
										<SelectValue placeholder={t("markRead.month")}>
											{monthDisplayLabel ?? t("markRead.month")}
										</SelectValue>
									</SelectTrigger>
									<SelectContent alignItemWithTrigger={false}>
										<SelectGroup>
											<SelectItem value={READ_DATE_MONTH_UNSET}>
												{t("markRead.month")}
											</SelectItem>
											{READ_DATE_MONTHS.map((entry) => (
												<SelectItem key={entry.value} value={entry.value}>
													{t(`months.${entry.value}`)}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
								<Input
									type="number"
									inputMode="numeric"
									min={1000}
									max={2100}
									placeholder={t("markRead.year")}
									value={endYear}
									onChange={(event) =>
										setEndYear(clampDigits(event.target.value, 4))
									}
									aria-label={t("markRead.finishYear")}
									className="w-24 shrink-0"
								/>
							</div>

							<div className="flex flex-wrap gap-1.5">
								<Button
									type="button"
									variant="outline"
									size="xs"
									onClick={() => setMonthOffset(0)}
								>
									{t("markRead.thisMonth")}
								</Button>
								<Button
									type="button"
									variant="outline"
									size="xs"
									onClick={() => setMonthOffset(-1)}
								>
									{t("markRead.lastMonth")}
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="xs"
									disabled={!endYear && !endMonth}
									onClick={() => {
										setEndYear("");
										setEndMonth("");
									}}
								>
									{t("markRead.dontKnow")}
								</Button>
							</div>

							{dateIncomplete ? (
								<p className="text-destructive text-xs" role="alert">
									{t("markRead.dateIncomplete")}
								</p>
							) : null}

							<label
								htmlFor="read-date-default"
								className="flex cursor-pointer items-start justify-between gap-4 border border-border p-3"
							>
								<span className="flex flex-col gap-0.5">
									<span className="font-medium text-sm">
										{t("markRead.defaultMonthTitle")}
									</span>
									<span className="text-muted-foreground text-xs">
										{t("markRead.defaultMonthHint")}
									</span>
								</span>
								<Switch
									id="read-date-default"
									checked={prefSync.value}
									onCheckedChange={handlePreferenceChange}
									className="mt-0.5 shrink-0"
								/>
							</label>
						</section>

						{offerFeedback ? (
							<section
								className="flex flex-col gap-3 border-border border-t pt-6"
								aria-labelledby="read-take"
							>
								<div>
									<h3 id="read-take" className="font-medium text-sm">
										{t("markRead.takeTitle")}
									</h3>
									<p className="text-muted-foreground text-xs">
										{t("markRead.takeHint")}
									</p>
								</div>
								<FeedbackHalfStarRating
									value={feedbackRating ?? 0}
									allowClear
									onChange={(value) =>
										setFeedbackRating(value === 0 ? null : value)
									}
								/>
								<div ref={reviewBlockRef} className="border border-border">
									<button
										type="button"
										className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/40"
										aria-expanded={reviewOpen}
										onClick={() => setReviewOpen((openNow) => !openNow)}
									>
										<span className="grid size-8 shrink-0 place-items-center border border-border bg-muted/40">
											<PenLine className="size-4" aria-hidden />
										</span>
										<span className="min-w-0 flex-1">
											<span className="block font-medium text-sm">
												{reviewLength > 0
													? t("markRead.yourReview")
													: t("markRead.addWrittenReview")}
											</span>
											<span className="block text-muted-foreground text-xs">
												{reviewLength > 0
													? t("markRead.characters", {
															count: reviewLength,
															max: REVIEW_MAX_PLAIN,
														})
													: t("markRead.reviewOptional")}
											</span>
										</span>
										<ChevronDown
											className={cn(
												"size-4 shrink-0 text-muted-foreground transition-transform",
												reviewOpen && "rotate-180",
											)}
											aria-hidden
										/>
									</button>
									{reviewOpen ? (
										<div className="border-border border-t">
											<RichTextEditor
												instanceKey={`mark-read-${bookSlug}`}
												id="mark-read-feedback-review"
												value={feedbackReview}
												onChange={setFeedbackReview}
												maxPlainLength={REVIEW_MAX_PLAIN}
												minHeightClassName="min-h-[6rem]"
												placeholder={t("markRead.reviewPlaceholder")}
												className="border-0"
												autoFocus
												onSubmitShortcut={submitRead}
											/>
											<div className="border-border border-t px-3 py-2">
												<ReviewImageField
													mode="create"
													file={reviewImage}
													onFileChange={setReviewImage}
												/>
											</div>
											<div className="flex items-center justify-between gap-3 border-border border-t bg-muted/20 px-3 py-1.5 text-muted-foreground text-xs">
												<span>
													{reviewLength > 0 && !feedbackRating
														? t("markRead.needRating")
														: t("markRead.shortcut")}
												</span>
												<span className="tabular-nums">
													{reviewLength}/{REVIEW_MAX_PLAIN}
												</span>
											</div>
										</div>
									) : null}
								</div>
							</section>
						) : hasRead ? (
							<p className="border-border border-t pt-4 text-muted-foreground text-xs">
								{t("markRead.alreadyReviewed")}
							</p>
						) : null}
					</div>

					{!hasRead ? (
						<label
							htmlFor="read-share-feed"
							className="flex cursor-pointer items-start gap-3 border-border border-t px-5 py-3"
						>
							<Checkbox
								id="read-share-feed"
								checked={shareToFeed}
								onCheckedChange={(checked) => setShareToFeed(checked === true)}
								className="mt-0.5"
							/>
							<span className="flex flex-col gap-0.5">
								<span className="font-medium text-sm">
									{t("markRead.shareTitle")}
								</span>
								<span className="text-muted-foreground text-xs">
									{t("markRead.shareHint")}
								</span>
							</span>
						</label>
					) : null}

					<div className="flex items-center justify-between gap-2 border-border border-t bg-muted/20 p-4">
						{hasRead ? (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="text-destructive hover:text-destructive"
								onClick={() => removeMutation.mutate({ bookSlug })}
							>
								<Trash2 data-icon="inline-start" />
								{t("markRead.remove")}
							</Button>
						) : (
							<span />
						)}
						<div className="flex gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
							>
								{t("markRead.cancel")}
							</Button>
							<Button type="submit" disabled={!ready || dateIncomplete}>
								{hasRead ? t("markRead.saveChanges") : t("markRead.titleNew")}
							</Button>
						</div>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
