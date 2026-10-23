/** biome-ignore-all lint/a11y/noStaticElementInteractions: click handlers are handled by the parent element */
"use client";

import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@bbrc/ui/components/tooltip";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
	BookCheck,
	BookOpen,
	CalendarDays,
	Clock,
	Star,
	Trophy,
} from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BookRequestedByLine } from "@/components/blocks/book-requested-by";
import { PollOptionReadersDialog } from "@/components/blocks/poll-option-readers-dialog";
import { PollOptionVotersDialog } from "@/components/blocks/poll-option-voters-dialog";
import { PollVotesByVoterSection } from "@/components/blocks/poll-votes-by-voter-section";
import { authClient } from "@/lib/auth-client";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { formatClubDateTime } from "@/lib/club-timezone";
import { invalidateUserPointQueries } from "@/lib/invalidate-user-points";
import { formatPollPageRange } from "@/lib/poll-page-range";
import { readingEstimateLabel } from "@/lib/reading-estimate";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

type SittingPoll = NonNullable<GetSittingBySlugOutput["poll"]>;
type VoteDraft = SittingPoll["myVotes"][number];

function voteDraftsFromPoll(poll: SittingPoll): VoteDraft[] {
	if (poll.myVotes.length > 0) {
		return poll.myVotes;
	}

	return poll.myVoteOptionIds.map((optionId) => ({
		optionId,
		points: 1 as const,
	}));
}

function optionScore(option: SittingPoll["options"][number], isAdmin: boolean) {
	return isAdmin ? option.pointTotal : option.voteCount;
}

function PollTotals({ option }: { option: SittingPoll["options"][number] }) {
	return (
		<>
			<span className="font-semibold text-base text-foreground">
				{option.pointTotal} pts
			</span>
			<span className="text-muted-foreground">
				{option.voteCount} {option.voteCount === 1 ? "voter" : "voters"}
			</span>
		</>
	);
}

function votePointsRowTintClass(points: 1 | 2 | 3, active: boolean): string {
	if (!active) {
		return "";
	}

	if (points === 3) {
		return "bg-amber-50/80 dark:bg-amber-950/25";
	}

	if (points === 2) {
		return "bg-slate-100/90 dark:bg-slate-900/40";
	}

	return "bg-muted/25";
}

function votePointsBadgeClass(points: 1 | 2 | 3): string {
	if (points === 3) {
		return "border-amber-600/60 bg-amber-100 text-amber-950 dark:border-amber-500/50 dark:bg-amber-950/60 dark:text-amber-50";
	}

	if (points === 2) {
		return "border-slate-500/60 bg-slate-200 text-slate-900 dark:border-slate-400/50 dark:bg-slate-800 dark:text-slate-100";
	}

	return "";
}

function voteChipButtonClass(selected: boolean, points: 1 | 2 | 3): string {
	if (!selected) {
		return "border-border bg-background text-muted-foreground hover:bg-muted/40";
	}

	if (points === 3) {
		return "border-amber-600 bg-amber-100 font-semibold text-amber-950 ring-2 ring-amber-600/70 dark:border-amber-500 dark:bg-amber-950/50 dark:text-amber-50 dark:ring-amber-500/60";
	}

	if (points === 2) {
		return "border-slate-500 bg-slate-200 font-semibold text-slate-900 ring-2 ring-slate-500/70 dark:border-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-400/60";
	}

	return "border-primary bg-primary/15 font-semibold text-foreground ring-2 ring-primary/70";
}

type SittingPollSectionProps = {
	sittingSlug: string;
	sittingStatus: GetSittingBySlugOutput["status"];
	initialPoll: SittingPoll;
	participantUserIds: string[];
	mode?: "vote" | "readonly";
	selectedBookSlug?: string | null;
	showCard?: boolean;
	layout?: "embedded" | "page";
	showVoteShare?: boolean;
};

export function SittingPollSection({
	sittingSlug,
	sittingStatus,
	initialPoll,
	participantUserIds,
	mode = "vote",
	selectedBookSlug = null,
	showCard = true,
	layout = "embedded",
	showVoteShare = false,
}: SittingPollSectionProps) {
	const readonly = mode === "readonly";
	const router = useRouter();
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();

	const syncPollFromServer = layout === "page" || !readonly;

	const { data: sittingData } = useQuery({
		...orpc.sitting.getSittingBySlug.queryOptions({ input: sittingSlug }),
		enabled: syncPollFromServer,
	});

	const poll = sittingData?.poll ?? initialPoll;
	const maxChoices = poll.maxChoices ?? poll.take;
	const isAdmin = session?.user.isAdmin === true;

	const sortedOptions = useMemo(() => {
		const hideLiveRanking =
			sittingStatus === "voting" && !isAdmin && !readonly && !showVoteShare;

		if (hideLiveRanking) {
			return poll.options;
		}

		if (!readonly && !showVoteShare && sittingStatus === "voting" && !isAdmin) {
			return poll.options;
		}

		return [...poll.options].sort(
			(a, b) => optionScore(b, isAdmin) - optionScore(a, isAdmin),
		);
	}, [poll.options, readonly, showVoteShare, sittingStatus, isAdmin]);

	const maxVoteCount = useMemo(
		() =>
			Math.max(
				1,
				...poll.options.map((option) => optionScore(option, isAdmin)),
			),
		[poll.options, isAdmin],
	);

	const [voteDrafts, setVoteDrafts] = useState<VoteDraft[]>(() =>
		voteDraftsFromPoll(poll),
	);
	const [isEditingVotes, setIsEditingVotes] = useState(
		() => poll.myVoteOptionIds.length === 0,
	);
	const [adminVotersOptionId, setAdminVotersOptionId] = useState<string | null>(
		null,
	);
	const [adminVotersOptionCount, setAdminVotersOptionCount] = useState(0);
	const [readersOptionId, setReadersOptionId] = useState<string | null>(null);
	const [readersOptionCount, setReadersOptionCount] = useState(0);

	useEffect(() => {
		setVoteDrafts(voteDraftsFromPoll(poll));
		if (poll.myVoteOptionIds.length > 0) {
			setIsEditingVotes(false);
		}
	}, [poll]);

	const effectiveParticipantUserIds = useMemo(() => {
		if (sittingData?.participants) {
			return sittingData.participants.map((participant) => participant.userId);
		}

		return participantUserIds;
	}, [participantUserIds, sittingData?.participants]);

	const isParticipant = useMemo(() => {
		const userId = session?.user.id;
		if (!userId) {
			return false;
		}

		return effectiveParticipantUserIds.includes(userId);
	}, [effectiveParticipantUserIds, session?.user.id]);

	const participantCount = effectiveParticipantUserIds.length;
	const canOpenReadersList =
		sittingStatus === "voting" && (isParticipant || isAdmin);

	const canVoteBase =
		!readonly &&
		sittingStatus === "voting" &&
		isParticipant &&
		!isSessionPending;
	const hasSavedVotes = poll.myVoteOptionIds.length > 0;
	const canEditSelection = canVoteBase && isEditingVotes;

	const sittingKey = orpc.sitting.getSittingBySlug.queryKey({
		input: sittingSlug,
	});

	const submitVotesMutation = useMutation(
		orpc.sitting.submitPollVotes.mutationOptions({
			// Saves for the same ballot run in click order, so the last one wins.
			scope: { id: `poll-votes-${sittingSlug}` },
			onMutate: async (variables) => {
				await queryClient.cancelQueries({ queryKey: sittingKey });
				const previous = queryClient.getQueryData(sittingKey);

				const ballot = variables.votes.map((vote) => ({
					optionId: vote.optionId,
					points: vote.points ?? (1 as const),
				}));

				// Show the saved ballot at once, counting a first ballot as a new voter.
				queryClient.setQueryData(sittingKey, (old) => {
					if (!old?.poll) {
						return old;
					}
					const firstBallot = old.poll.myVoteOptionIds.length === 0;
					return {
						...old,
						poll: {
							...old.poll,
							myVotes: ballot,
							myVoteOptionIds: ballot.map((vote) => vote.optionId),
							voterCount: old.poll.voterCount + (firstBallot ? 1 : 0),
						},
					};
				});

				setVoteDrafts(ballot);
				setIsEditingVotes(false);
				return { previous };
			},
			onError: (error, variables, context) => {
				if (context) {
					queryClient.setQueryData(sittingKey, context.previous);
				}
				// Back to editing with the picks the member just made.
				setVoteDrafts(
					variables.votes.map((vote) => ({
						optionId: vote.optionId,
						points: vote.points ?? (1 as const),
					})),
				);
				setIsEditingVotes(true);
				toast.error(error.message ?? "Could not save votes.");
			},
			onSuccess: (result) => {
				setVoteDrafts(result.myVotes);
				void invalidateUserPointQueries();
				router.refresh();
				if (result.xpAwarded != null && result.xpAwarded > 0) {
					toast.success(`Votes saved — +${result.xpAwarded} XP`);
				}
			},
			onSettled: () => {
				void queryClient.invalidateQueries({
					queryKey: orpc.sitting.getSittingBySlug.key(),
				});
			},
		}),
	);

	function toggleOption(optionId: string, checked: boolean) {
		if (!canEditSelection) {
			return;
		}

		setVoteDrafts((current) => {
			if (checked) {
				if (current.some((vote) => vote.optionId === optionId)) {
					return current;
				}

				if (current.length >= maxChoices) {
					toast.error(`You can select at most ${maxChoices} books.`);
					return current;
				}

				return [...current, { optionId, points: 1 as const }];
			}

			return current.filter((vote) => vote.optionId !== optionId);
		});
	}

	function setOptionPoints(optionId: string, points: 1 | 2 | 3) {
		if (!canEditSelection) {
			return;
		}

		setVoteDrafts((current) => {
			const selected = current.some((vote) => vote.optionId === optionId);
			if (!selected) {
				return current;
			}

			return current.map((vote) => {
				if (vote.optionId === optionId) {
					return { optionId, points };
				}

				if (points === 3 && vote.points === 3) {
					return { ...vote, points: 1 as const };
				}

				if (points === 2 && vote.points === 2) {
					return { ...vote, points: 1 as const };
				}

				return vote;
			});
		});
	}

	const showVoteBars =
		showVoteShare ||
		readonly ||
		(isAdmin && sittingStatus === "voting") ||
		(sittingStatus !== "voting" && !canEditSelection);

	const chipGrants = poll.myChipGrants;
	const showChipControls =
		canEditSelection && (chipGrants.canUseGolden || chipGrants.canUseSilver);

	const header =
		layout === "page" ? null : (
			<div className="flex flex-row flex-wrap items-center justify-between gap-2">
				<CardTitle className="text-base">Book poll</CardTitle>
				{readonly ? (
					<Badge variant="outline">Archived</Badge>
				) : hasSavedVotes && canVoteBase && !isEditingVotes ? (
					<Badge variant="outline">You voted</Badge>
				) : null}
			</div>
		);

	const body = (
		<>
			{layout === "embedded" ? (
				<dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					<div>
						<dt className="text-muted-foreground text-xs">Poll deadline</dt>
						<dd className="font-medium text-sm">
							{formatClubDateTime(poll.deadline)}
						</dd>
					</div>
					<div>
						<dt className="text-muted-foreground text-xs">
							{readonly ? "Choices allowed" : "Your choices"}
						</dt>
						<dd className="font-medium text-sm tabular-nums">
							{poll.minChoices}–{maxChoices}
						</dd>
					</div>
					<div>
						<dt className="text-muted-foreground text-xs">Page range</dt>
						<dd className="font-medium text-sm tabular-nums">
							{formatPollPageRange(poll.minPages, poll.maxPages)}
						</dd>
					</div>
				</dl>
			) : null}

			{readonly ? (
				<p className="text-muted-foreground text-sm">
					Vote totals from when this poll was open. Your picks are highlighted
					if you participated.
				</p>
			) : canEditSelection ? (
				<p className="text-muted-foreground text-sm">
					Select between {poll.minChoices} and {maxChoices} books, then save
					your ballot. Golden and Silver chips are optional extra weight on one
					book each. Tap a row to toggle a choice; open a cover or title to view
					the book.
				</p>
			) : hasSavedVotes && canVoteBase ? (
				<p className="text-muted-foreground text-sm">
					Your votes are saved. Use Edit votes to change them before voting
					ends.
				</p>
			) : sittingStatus === "voting" && !session?.user ? (
				<p className="text-muted-foreground text-sm">
					Sign in as a participant to vote in this poll.
				</p>
			) : sittingStatus === "voting" && session?.user && !isParticipant ? (
				<p className="text-muted-foreground text-sm">
					Only sitting participants can vote in this poll.
				</p>
			) : null}

			<ul
				className={cn(
					"flex flex-col gap-2",
					layout === "page" && "gap-4 sm:grid sm:grid-cols-1",
				)}
			>
				{sortedOptions.map((option, index) => {
					const coverSrc = bookCoverUrl(option.book.coverId);
					const draftVote = voteDrafts.find(
						(vote) => vote.optionId === option.id,
					);
					const savedVote = poll.myVotes.find(
						(vote) => vote.optionId === option.id,
					);
					const checked = draftVote != null;
					const draftPoints = draftVote?.points ?? 1;
					const href = `/books/${option.book.slug}` as Route;
					const showAsVoted =
						poll.myVoteOptionIds.includes(option.id) &&
						(readonly || hasSavedVotes);
					const savedPoints = savedVote?.points ?? 1;
					const isClubPick =
						readonly &&
						selectedBookSlug != null &&
						option.book.slug === selectedBookSlug;
					const optionPoints = optionScore(option, isAdmin);
					const voteShare =
						showVoteBars && optionPoints > 0 ? optionPoints / maxVoteCount : 0;
					const readCount = option.participantReadCount;
					const readTip =
						participantCount > 0
							? `${readCount} of ${participantCount} participants read this`
							: `${readCount} read this`;
					const shownVote = canEditSelection
						? draftVote != null
							? draftPoints
							: null
						: showAsVoted
							? savedPoints
							: null;
					const showTotals =
						showVoteBars && (isAdmin || sittingStatus !== "voting");
					const showChips = showChipControls && checked;
					const hasBottom = showChips || shownVote != null || showTotals;

					return (
						<li key={option.id}>
							<div
								role={canEditSelection ? "button" : undefined}
								tabIndex={canEditSelection ? 0 : undefined}
								onClick={() => {
									if (!canEditSelection) {
										return;
									}

									toggleOption(option.id, !checked);
								}}
								onKeyDown={(event) => {
									if (!canEditSelection) {
										return;
									}

									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										toggleOption(option.id, !checked);
									}
								}}
								className={cn(
									"relative flex flex-col overflow-hidden border border-border transition-colors",
									canEditSelection && "cursor-pointer hover:bg-muted/30",
									canEditSelection && checked
										? votePointsRowTintClass(draftPoints, true)
										: (checked || showAsVoted || isClubPick) && "bg-muted/25",
									canEditSelection &&
										checked &&
										draftPoints === 3 &&
										"border-amber-600/50 dark:border-amber-500/40",
									canEditSelection &&
										checked &&
										draftPoints === 2 &&
										"border-slate-500/50 dark:border-slate-400/40",
									canEditSelection &&
										checked &&
										draftPoints === 1 &&
										"border-primary/60",
								)}
							>
								{voteShare > 0 ? (
									<div
										className="pointer-events-none absolute inset-y-0 left-0 bg-primary/10"
										style={{ width: `${voteShare * 100}%` }}
										aria-hidden
									/>
								) : null}

								<div className="relative flex items-center justify-between gap-3 border-border border-b bg-muted/30 px-3 py-1.5 text-muted-foreground text-xs tabular-nums">
									<span className="inline-flex items-center gap-1">
										<BookOpen className="size-3.5" aria-hidden />
										{option.book.pages} p
									</span>
									<span className="inline-flex items-center gap-1">
										<CalendarDays className="size-3.5" aria-hidden />
										{option.book.publishedIn}
									</span>
									<span
										className="inline-flex items-center gap-1"
										title="Open Library rating"
									>
										{option.book.openLibraryRating != null
											? option.book.openLibraryRating.toFixed(1)
											: "—"}
										<Star className="size-3.5" aria-hidden />
									</span>
								</div>

								<div
									className={cn(
										"relative flex items-stretch gap-3 p-3",
										layout === "page" && "gap-4 p-4",
									)}
								>
									{showVoteBars && layout === "page" ? (
										<span className="w-6 shrink-0 self-center text-center font-semibold text-lg text-muted-foreground tabular-nums">
											{index + 1}
										</span>
									) : null}

									<Link
										href={href}
										className={cn(
											"relative aspect-2/3 shrink-0 self-start overflow-hidden bg-muted ring-1 ring-foreground/10",
											layout === "page" ? "w-20 sm:w-24" : "w-14",
										)}
										onClick={(event) => {
											event.stopPropagation();
										}}
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
											<div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
												No cover
											</div>
										)}
									</Link>

									<div className="flex min-w-0 flex-1 flex-col gap-0.5">
										<div className="flex flex-wrap items-center gap-2">
											<Link
												href={href}
												className="line-clamp-2 font-medium text-sm leading-snug hover:underline"
												onClick={(event) => {
													event.stopPropagation();
												}}
											>
												{option.book.title}
											</Link>
											{option.viewerHasRead ? (
												<span
													className="inline-flex shrink-0 text-emerald-700 dark:text-emerald-400"
													title="You read this book"
												>
													<BookCheck className="size-4" aria-hidden />
													<span className="sr-only">You read this book</span>
												</span>
											) : null}
											{isClubPick ? (
												<Badge variant="secondary" className="gap-1">
													<Trophy className="size-3" aria-hidden />
													Club pick
												</Badge>
											) : null}
										</div>
										<p className="truncate text-muted-foreground text-xs">
											{formatBookAuthors(option.book.authors)}
										</p>
										{option.book.series ? (
											<p className="truncate text-muted-foreground text-xs">
												#{option.book.series.position} in{" "}
												<Link
													href={`/series/${option.book.series.slug}` as Route}
													className="text-foreground underline-offset-2 hover:underline"
													onClick={(event) => {
														event.stopPropagation();
													}}
												>
													{option.book.series.title}
												</Link>
											</p>
										) : null}
										{readingEstimateLabel(option.book.pages, poll.deadline) ? (
											<p
												className="mt-1 inline-flex items-center gap-1 text-muted-foreground text-xs"
												title="Based on the book's page count and the club's reading pace, if reading starts when voting ends. Weekends and the final start date can change it."
											>
												<Clock className="size-3.5 shrink-0" aria-hidden />
												{readingEstimateLabel(option.book.pages, poll.deadline)}
											</p>
										) : null}
										{option.book.requestedBy ? (
											<BookRequestedByLine
												requestedBy={option.book.requestedBy}
											/>
										) : null}
									</div>

									{readCount > 0 || canOpenReadersList ? (
										<Tooltip>
											<TooltipTrigger
												render={
													canOpenReadersList ? (
														<button
															type="button"
															onClick={(event) => {
																event.stopPropagation();
																setReadersOptionCount(readCount);
																setReadersOptionId(option.id);
															}}
														/>
													) : (
														<span />
													)
												}
												className="inline-flex h-fit shrink-0 items-center gap-1 text-muted-foreground text-xs tabular-nums hover:text-foreground"
												aria-label={readTip}
											>
												<BookCheck className="size-3.5" aria-hidden />
												{readCount}
											</TooltipTrigger>
											<TooltipContent side="left">{readTip}</TooltipContent>
										</Tooltip>
									) : null}
								</div>

								{hasBottom ? (
									<div className="relative flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-border border-t bg-muted/30 px-3 py-2 text-xs">
										{showChips ? (
											<fieldset
												className="flex w-full min-w-0 flex-col gap-1.5 border-0 p-0"
												onClick={(event) => {
													event.stopPropagation();
												}}
												onKeyDown={(event) => {
													event.stopPropagation();
												}}
											>
												<legend className="mb-1.5 font-medium text-foreground text-xs">
													Weight for this book
												</legend>
												<div className="flex flex-wrap gap-1">
													<button
														type="button"
														aria-pressed={draftPoints === 1}
														className={cn(
															"min-w-[4.5rem] border px-2.5 py-1.5 text-xs transition-colors",
															voteChipButtonClass(draftPoints === 1, 1),
														)}
														onClick={() => {
															setOptionPoints(option.id, 1);
														}}
													>
														1 pt
													</button>
													{chipGrants.canUseSilver ? (
														<button
															type="button"
															aria-pressed={draftPoints === 2}
															className={cn(
																"min-w-[4.5rem] border px-2.5 py-1.5 text-xs transition-colors",
																voteChipButtonClass(draftPoints === 2, 2),
															)}
															onClick={() => {
																setOptionPoints(option.id, 2);
															}}
														>
															Silver · 2
														</button>
													) : null}
													{chipGrants.canUseGolden ? (
														<button
															type="button"
															aria-pressed={draftPoints === 3}
															className={cn(
																"min-w-[4.5rem] border px-2.5 py-1.5 text-xs transition-colors",
																voteChipButtonClass(draftPoints === 3, 3),
															)}
															onClick={() => {
																setOptionPoints(option.id, 3);
															}}
														>
															Golden · 3
														</button>
													) : null}
												</div>
											</fieldset>
										) : (
											<>
												<span className="min-w-0">
													{shownVote != null ? (
														<Badge
															variant="outline"
															className={votePointsBadgeClass(shownVote)}
														>
															Your vote · {shownVote}{" "}
															{shownVote === 1 ? "pt" : "pts"}
														</Badge>
													) : null}
												</span>
												{showTotals ? (
													<span className="ml-auto inline-flex items-baseline gap-1.5 tabular-nums">
														{isAdmin && option.pointTotal > 0 ? (
															<button
																type="button"
																className="inline-flex items-baseline gap-1.5 underline-offset-2 hover:underline"
																onClick={(event) => {
																	event.stopPropagation();
																	setAdminVotersOptionCount(option.voteCount);
																	setAdminVotersOptionId(option.id);
																}}
															>
																<PollTotals option={option} />
															</button>
														) : (
															<PollTotals option={option} />
														)}
													</span>
												) : null}
											</>
										)}
									</div>
								) : null}
							</div>
						</li>
					);
				})}
			</ul>

			{canEditSelection ? (
				<div
					className={cn(
						"flex flex-wrap gap-2",
						layout === "page" &&
							"sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 border border-border bg-background/95 p-3 shadow-sm backdrop-blur-sm supports-backdrop-filter:bg-background/80 md:bottom-4",
					)}
				>
					<p className="w-full text-muted-foreground text-xs sm:w-auto sm:flex-1">
						{voteDrafts.length} of {maxChoices} selected
						{voteDrafts.length < poll.minChoices
							? ` · pick at least ${poll.minChoices}`
							: null}
					</p>
					<LoadingButton
						type="button"
						loading={submitVotesMutation.isPending}
						disabled={voteDrafts.length < poll.minChoices}
						onClick={() => {
							submitVotesMutation.mutate({
								sittingSlug,
								votes: voteDrafts,
							});
						}}
					>
						Save votes
					</LoadingButton>
					{voteDrafts.length > 0 ? (
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								setVoteDrafts([]);
							}}
						>
							Clear selection
						</Button>
					) : null}
				</div>
			) : hasSavedVotes && canVoteBase ? (
				<Button
					type="button"
					variant="outline"
					onClick={() => {
						setIsEditingVotes(true);
						setVoteDrafts(voteDraftsFromPoll(poll));
					}}
				>
					Edit votes
				</Button>
			) : null}

			{isAdmin ? (
				<PollOptionVotersDialog
					pollOptionId={adminVotersOptionId}
					voteCount={adminVotersOptionCount}
					onDismiss={() => {
						setAdminVotersOptionId(null);
					}}
				/>
			) : null}

			{canOpenReadersList ? (
				<PollOptionReadersDialog
					source="poll"
					pollOptionId={readersOptionId}
					readCount={readersOptionCount}
					onDismiss={() => {
						setReadersOptionId(null);
					}}
				/>
			) : null}

			{isAdmin && layout === "page" ? (
				<PollVotesByVoterSection sittingSlug={sittingSlug} />
			) : null}
		</>
	);

	if ((readonly || layout === "page") && !showCard) {
		return <div className="flex flex-col gap-4">{body}</div>;
	}

	return (
		<Card>
			{header ? <CardHeader>{header}</CardHeader> : null}
			<CardContent className="flex flex-col gap-4">{body}</CardContent>
		</Card>
	);
}
