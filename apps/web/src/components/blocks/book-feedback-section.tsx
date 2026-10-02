"use client";

import type { GetBookFeedbackListOutput } from "@bbrc/api/modules/feedback/feedback.schema";
import { FeedbackSchema } from "@bbrc/schemas";
import { Badge } from "@bbrc/ui/components/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import { Input } from "@bbrc/ui/components/input";
import { Label } from "@bbrc/ui/components/label";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { Textarea } from "@bbrc/ui/components/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { UserPanel } from "@/components/blocks/user-panel";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { authClient } from "@/lib/auth-client";
import { formatDateTime } from "@/lib/format-datetime";
import { invalidateUserPointQueries } from "@/lib/invalidate-user-points";
import { orpc, queryClient } from "@/utils/orpc";

type BookFeedbackSectionProps = {
	bookSlug: string;
	initialReviews: GetBookFeedbackListOutput;
};

export function BookFeedbackSection({
	bookSlug,
	initialReviews,
}: BookFeedbackSectionProps) {
	const router = useRouter();
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const [rating, setRating] = useState("4");
	const [review, setReview] = useState("");
	const [deleteOpen, setDeleteOpen] = useState(false);

	const listQuery = useQuery({
		...orpc.feedback.getBookFeedbackList.queryOptions({
			input: bookSlug,
		}),
		initialData: initialReviews,
	});

	const stateQuery = useQuery({
		...orpc.feedback.getBookFeedbackState.queryOptions({
			input: bookSlug,
		}),
		enabled: Boolean(session?.user),
	});

	const deleteMutation = useMutation(
		orpc.feedback.delete.mutationOptions({
			onSuccess: async () => {
				setDeleteOpen(false);
				toast.success("Feedback deleted.");
				await queryClient.invalidateQueries({
					queryKey: orpc.feedback.getBookFeedbackState.key(),
				});
				await queryClient.invalidateQueries({
					queryKey: orpc.feedback.getBookFeedbackList.key(),
				});
				await queryClient.invalidateQueries({
					queryKey: orpc.book.getBookBySlug.key(),
				});
				await queryClient.invalidateQueries({
					queryKey: orpc.feedback.getUserFeedbackList.key(),
				});
				if (session?.user.username) {
					await invalidateUserPointQueries();
				}
				router.refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const createMutation = useMutation(
		orpc.feedback.create.mutationOptions({
			onSuccess: async (result) => {
				toast.success(
					result.xpAwarded > 0
						? `Feedback saved (+${result.xpAwarded} XP)`
						: "Feedback saved",
				);
				await queryClient.invalidateQueries({
					queryKey: orpc.feedback.getBookFeedbackState.key(),
				});
				await queryClient.invalidateQueries({
					queryKey: orpc.feedback.getBookFeedbackList.key(),
				});
				await queryClient.invalidateQueries({
					queryKey: orpc.book.getBookBySlug.key(),
				});
				if (session?.user.username) {
					await invalidateUserPointQueries();
				}
				setReview("");
				router.refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const reviews = listQuery.data ?? initialReviews;
	const state = stateQuery.data;
	const showForm =
		Boolean(session?.user) &&
		!sessionPending &&
		!stateQuery.isPending &&
		state?.canSubmit === true;
	const showHint =
		Boolean(session?.user) &&
		!sessionPending &&
		!stateQuery.isPending &&
		state &&
		!state.canSubmit &&
		!state.myFeedback &&
		state.hint;
	const myFeedback =
		state?.myFeedback && session?.user ? state.myFeedback : null;

	return (
		<section
			aria-labelledby="book-feedback-heading"
			className="flex flex-col gap-6"
		>
			<div className="flex flex-wrap items-end justify-between gap-2">
				<h2 id="book-feedback-heading" className="font-semibold text-lg">
					Club reviews
				</h2>
				<p className="text-muted-foreground text-sm tabular-nums">
					{reviews.length} review{reviews.length === 1 ? "" : "s"}
				</p>
			</div>

			{listQuery.isError ? (
				<Card size="sm">
					<CardContent className="text-destructive text-sm">
						Could not load reviews. Try refreshing the page.
					</CardContent>
				</Card>
			) : reviews.length === 0 ? (
				<Card size="sm">
					<CardContent className="text-muted-foreground text-sm">
						No club reviews yet. Members can leave feedback here after they mark
						the book completed on a sitting that chose it.
					</CardContent>
				</Card>
			) : (
				<ul className="flex flex-col gap-3">
					{reviews.map((entry) => {
						const feedbackHref =
							`/books/${bookSlug}/feedbacks/${entry.slug}` as Route;

						return (
							<li key={entry.slug}>
								<Card size="sm">
									<CardContent className="flex flex-col gap-3">
										<div className="flex flex-wrap items-start justify-between gap-3">
											<Link
												href={feedbackHref}
												className="min-w-0 outline-offset-2"
											>
												<UserPanel user={entry} />
											</Link>
											<div className="flex flex-col items-end gap-1 text-right">
												<Badge variant="outline" className="tabular-nums">
													{entry.rating.toFixed(1)} / 5
												</Badge>
												<p className="text-muted-foreground text-xs">
													{formatDateTime(entry.createdAt)}
												</p>
											</div>
										</div>
										<Link
											href={feedbackHref}
											className="text-sm leading-relaxed transition-colors hover:text-foreground/90"
										>
											{entry.review}
										</Link>
										<p className="text-muted-foreground text-xs tabular-nums">
											{entry.likeCount}{" "}
											{entry.likeCount === 1 ? "like" : "likes"} ·{" "}
											{entry.commentCount}{" "}
											{entry.commentCount === 1 ? "comment" : "comments"}
										</p>
									</CardContent>
								</Card>
							</li>
						);
					})}
				</ul>
			)}

			{showHint ? (
				<Card size="sm">
					<CardContent className="text-muted-foreground text-sm">
						{state.hint}
					</CardContent>
				</Card>
			) : null}

			{myFeedback ? (
				<div className="flex flex-col gap-3">
					<h3 className="font-medium text-base">Your review</h3>
					<Card size="sm">
						<CardContent className="flex flex-col gap-3 pt-4">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<Badge variant="outline" className="tabular-nums">
									{myFeedback.rating.toFixed(1)} / 5
								</Badge>
								<p className="text-muted-foreground text-xs">
									{formatDateTime(myFeedback.createdAt)}
								</p>
							</div>
							<p className="text-sm leading-relaxed">{myFeedback.review}</p>
							<LoadingButton
								type="button"
								variant="destructive"
								size="sm"
								className="w-fit"
								loading={deleteMutation.isPending}
								onClick={() => setDeleteOpen(true)}
							>
								Delete feedback
							</LoadingButton>
						</CardContent>
					</Card>
					<DestructiveConfirmDialog
						open={deleteOpen}
						onOpenChange={setDeleteOpen}
						title="Delete feedback?"
						description="Your review will be removed from this book’s club reviews. This cannot be undone."
						confirmLabel="Delete feedback"
						loading={deleteMutation.isPending}
						onConfirm={() => deleteMutation.mutate(bookSlug)}
					/>
				</div>
			) : null}

			{sessionPending || (session?.user && stateQuery.isPending) ? (
				<p className="text-muted-foreground text-sm">
					Loading feedback options…
				</p>
			) : null}

			{stateQuery.isError ? (
				<Card size="sm">
					<CardContent className="text-destructive text-sm">
						Could not load your feedback status. Try refreshing the page.
					</CardContent>
				</Card>
			) : null}

			{showForm ? (
				<div className="flex flex-col gap-3">
					<h3 className="font-medium text-base">Leave your review</h3>
					<Card size="sm">
						<CardHeader>
							<CardTitle className="text-base">Share your feedback</CardTitle>
							<CardDescription>
								You marked this book completed for a club sitting that chose it.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							<div className="grid gap-2">
								<Label htmlFor="feedback-rating">Rating (0–5)</Label>
								<Input
									id="feedback-rating"
									type="number"
									min={0}
									max={5}
									step={0.5}
									value={rating}
									onChange={(event) => setRating(event.target.value)}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="feedback-review">Review</Label>
								<Textarea
									id="feedback-review"
									value={review}
									onChange={(event) => setReview(event.target.value)}
									maxLength={500}
									rows={4}
									placeholder="What did you think of the book?"
								/>
							</div>
							<LoadingButton
								type="button"
								disabled={createMutation.isPending || review.trim().length < 1}
								loading={createMutation.isPending}
								onClick={() => {
									const parsedRating = Number(rating);
									const parsedReview = FeedbackSchema.shape.review.safeParse(
										review.trim(),
									);

									if (!parsedReview.success) {
										toast.error(
											parsedReview.error.issues[0]?.message ??
												"Review must be between 1 and 500 characters",
										);
										return;
									}

									const parsedRatingResult =
										FeedbackSchema.shape.rating.safeParse(parsedRating);

									if (!parsedRatingResult.success) {
										toast.error("Rating must be between 0 and 5");
										return;
									}

									createMutation.mutate({
										bookSlug,
										rating: parsedRatingResult.data,
										review: parsedReview.data,
									});
								}}
							>
								Submit feedback
							</LoadingButton>
						</CardContent>
					</Card>
				</div>
			) : null}
		</section>
	);
}
