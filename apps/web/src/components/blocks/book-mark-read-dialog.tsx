"use client";

import {
	contentPlainText,
	type FeedbackRatingStep,
	isFeedbackRatingStep,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { Field, FieldGroup, FieldLabel } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FeedbackHalfStarRating } from "@/components/blocks/feedback-half-star-rating";
import { RichTextEditor } from "@/components/blocks/rich-text-editor";
import { invalidateFeedbackQueries } from "@/lib/feedback/invalidate-feedback-queries";
import { invalidateReadQueries } from "@/lib/invalidate-read-queries";
import {
	READ_DATE_MONTH_UNSET,
	READ_DATE_MONTHS,
	readDateMonthLabel,
} from "@/lib/read-date-months";
import { orpc, queryClient } from "@/utils/orpc";

type BookMarkReadDialogProps = {
	bookSlug: string;
	bookTitle: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
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

export function BookMarkReadDialog({
	bookSlug,
	bookTitle,
	open,
	onOpenChange,
}: BookMarkReadDialogProps) {
	const [step, setStep] = useState<1 | 2>(1);
	const [endYear, setEndYear] = useState("");
	const [endMonth, setEndMonth] = useState("");
	const [feedbackRating, setFeedbackRating] =
		useState<FeedbackRatingStep | null>(null);
	const [feedbackReview, setFeedbackReview] = useState("");

	const stateQuery = useQuery({
		...orpc.read.getBookReadState.queryOptions({
			input: { bookSlug },
		}),
		enabled: open,
	});

	useEffect(() => {
		if (!open) {
			setStep(1);
			setFeedbackRating(null);
			setFeedbackReview("");
			return;
		}
		if (!stateQuery.data) {
			return;
		}
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
	}, [open, stateQuery.data]);

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

	const saveMutation = useMutation(
		orpc.read.setRead.mutationOptions({
			// One save at a time per book, in click order.
			scope: { id: `read-${bookSlug}` },
			onMutate: async (variables) => {
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
				return snapshot;
			},
			onError: (error, _variables, snapshot) => {
				restoreRead(snapshot);
				toast.error(error.message || "Could not save your read");
			},
			onSettled: (_data, _error, variables) => {
				refreshReadQueries(
					"feedbackRating" in variables && variables.feedbackRating != null,
				);
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
				toast.error(error.message || "Could not remove your read");
			},
			onSettled: () => {
				refreshReadQueries(false);
			},
		}),
	);

	const hasRead = stateQuery.data?.hasRead ?? false;
	const hasFeedback = stateQuery.data?.hasFeedback ?? false;
	/** Step 2 when marking read, or editing a read that still has no club feedback. */
	const offerFeedbackStep = !hasFeedback;

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
			toast.error("Choose both finish month and year, or leave both empty");
			return undefined;
		}
		if (m < 1 || m > 12) {
			toast.error("Month must be between 1 and 12");
			return undefined;
		}
		return { readEndYear: y, readEndMonth: m };
	}

	function handleContinueToFeedback() {
		const payload = buildFinishMonthPayload();
		if (payload === undefined) {
			return;
		}
		setStep(2);
	}

	function submitRead(includeFeedback: boolean) {
		const finish = buildFinishMonthPayload();
		if (finish === undefined) {
			return;
		}

		const reviewPlain = contentPlainText(feedbackReview).trim();
		const hasRating =
			feedbackRating != null && isFeedbackRatingStep(feedbackRating);
		const hasReview = reviewPlain.length > 0;

		if (includeFeedback && !hasRating && !hasReview) {
			toast.error("Add a rating or review, or skip this step");
			return;
		}

		saveMutation.mutate({
			bookSlug,
			...finish,
			...(includeFeedback && hasRating
				? {
						feedbackRating,
						feedbackReview: hasReview ? feedbackReview : undefined,
					}
				: {}),
		});
	}

	const monthValue = endMonth.length > 0 ? endMonth : READ_DATE_MONTH_UNSET;
	const monthDisplayLabel = readDateMonthLabel(endMonth);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{step === 1
							? hasRead
								? "Edit read"
								: "Mark as read"
							: "Optional review"}
					</DialogTitle>
					<DialogDescription>
						{step === 1
							? `When did you finish ${bookTitle}? Month and year are optional.`
							: "Rate or review the book now, or skip and add feedback later."}
					</DialogDescription>
				</DialogHeader>

				{step === 1 ? (
					<FieldGroup>
						<Field>
							<FieldLabel>Finished (month & year)</FieldLabel>
							<div className="flex w-full gap-2">
								<Input
									type="number"
									inputMode="numeric"
									min={1000}
									max={2100}
									placeholder="Year"
									value={endYear}
									onChange={(event) =>
										setEndYear(clampDigits(event.target.value, 4))
									}
									aria-label="Finish year"
									className="w-[5.5rem] shrink-0"
								/>
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
										aria-label="Finish month"
									>
										<SelectValue placeholder="Month">
											{monthDisplayLabel ?? "Month"}
										</SelectValue>
									</SelectTrigger>
									<SelectContent alignItemWithTrigger={false}>
										<SelectGroup>
											<SelectItem value={READ_DATE_MONTH_UNSET}>
												Month
											</SelectItem>
											{READ_DATE_MONTHS.map((entry) => (
												<SelectItem key={entry.value} value={entry.value}>
													{entry.label}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
							</div>
						</Field>
					</FieldGroup>
				) : (
					<FieldGroup>
						<Field>
							<FieldLabel>Rating</FieldLabel>
							<FeedbackHalfStarRating
								value={feedbackRating ?? 0}
								onChange={(value) => setFeedbackRating(value)}
								disabled={saveMutation.isPending}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="mark-read-feedback-review">
								Review
							</FieldLabel>
							<RichTextEditor
								instanceKey={`mark-read-${bookSlug}-step-${step}`}
								id="mark-read-feedback-review"
								value={feedbackReview}
								onChange={setFeedbackReview}
								maxPlainLength={500}
								minHeightClassName="min-h-[6rem]"
								placeholder="Optional thoughts for the club"
								disabled={saveMutation.isPending}
							/>
						</Field>
					</FieldGroup>
				)}

				<DialogFooter className="gap-2 sm:justify-between">
					{step === 1 && hasRead ? (
						<Button
							type="button"
							variant="ghost"
							disabled={removeMutation.isPending}
							onClick={() => removeMutation.mutate({ bookSlug })}
						>
							Remove read
						</Button>
					) : step === 2 ? (
						<Button
							type="button"
							variant="ghost"
							onClick={() => setStep(1)}
							disabled={saveMutation.isPending}
						>
							Back
						</Button>
					) : (
						<span />
					)}
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						{step === 1 ? (
							offerFeedbackStep ? (
								<Button type="button" onClick={handleContinueToFeedback}>
									Next
								</Button>
							) : (
								<LoadingButton
									type="button"
									loading={saveMutation.isPending}
									onClick={() => submitRead(false)}
								>
									Save
								</LoadingButton>
							)
						) : (
							<>
								<LoadingButton
									type="button"
									variant="outline"
									loading={saveMutation.isPending}
									onClick={() => submitRead(false)}
								>
									Skip review
								</LoadingButton>
								<LoadingButton
									type="button"
									loading={saveMutation.isPending}
									onClick={() => submitRead(true)}
								>
									Save
								</LoadingButton>
							</>
						)}
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
