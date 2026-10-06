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
import { Checkbox } from "@bbrc/ui/components/checkbox";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BookRequestedByLine } from "@/components/blocks/book-requested-by";
import { BookStatusBadge } from "@/components/blocks/book-status-badge";
import { PollOptionVotersDialog } from "@/components/blocks/poll-option-voters-dialog";
import { PollVotesByVoterSection } from "@/components/blocks/poll-votes-by-voter-section";
import { authClient } from "@/lib/auth-client";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { formatDateTime } from "@/lib/format-datetime";
import { invalidateUserPointQueries } from "@/lib/invalidate-user-points";
import { formatPollPageRange } from "@/lib/poll-page-range";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

type SittingPoll = NonNullable<GetSittingBySlugOutput["poll"]>;

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
	const sortedOptions = useMemo(() => {
		if (!readonly && !showVoteShare) {
			return poll.options;
		}

		return [...poll.options].sort((a, b) => b.voteCount - a.voteCount);
	}, [poll.options, readonly, showVoteShare]);

	const maxVoteCount = useMemo(
		() => Math.max(1, ...poll.options.map((option) => option.voteCount)),
		[poll.options],
	);

	const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>(
		() => poll.myVoteOptionIds,
	);
	const [isEditingVotes, setIsEditingVotes] = useState(
		() => poll.myVoteOptionIds.length === 0,
	);
	const [adminVotersOptionId, setAdminVotersOptionId] = useState<string | null>(
		null,
	);
	const [adminVotersOptionCount, setAdminVotersOptionCount] = useState(0);

	const isAdmin = session?.user.isAdmin === true;

	useEffect(() => {
		setSelectedOptionIds(poll.myVoteOptionIds);
		if (poll.myVoteOptionIds.length > 0) {
			setIsEditingVotes(false);
		}
	}, [poll.myVoteOptionIds]);

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

	const canVoteBase =
		!readonly &&
		sittingStatus === "voting" &&
		isParticipant &&
		!isSessionPending;
	const hasSavedVotes = poll.myVoteOptionIds.length > 0;
	const canEditSelection = canVoteBase && isEditingVotes;

	const submitVotesMutation = useMutation(
		orpc.sitting.submitPollVotes.mutationOptions({
			onSuccess: async (result) => {
				setSelectedOptionIds(result.myVoteOptionIds);
				setIsEditingVotes(false);
				await queryClient.invalidateQueries({
					queryKey: orpc.sitting.getSittingBySlug.key(),
				});
				await invalidateUserPointQueries();
				router.refresh();
				if (result.xpAwarded != null && result.xpAwarded > 0) {
					toast.success(`Votes saved — +${result.xpAwarded} XP`);
				} else {
					toast.success("Votes saved.");
				}
			},
			onError: (error) => {
				toast.error(error.message ?? "Could not save votes.");
			},
		}),
	);

	function toggleOption(optionId: string, checked: boolean) {
		if (!canEditSelection) {
			return;
		}

		setSelectedOptionIds((current) => {
			if (checked) {
				if (current.includes(optionId)) {
					return current;
				}

				if (current.length >= maxChoices) {
					toast.error(`You can select at most ${maxChoices} books.`);
					return current;
				}

				return [...current, optionId];
			}

			return current.filter((id) => id !== optionId);
		});
	}

	const showVoteBars =
		showVoteShare ||
		readonly ||
		(sittingStatus !== "voting" && !canEditSelection);

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
							{formatDateTime(poll.deadline)}
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
					Select between {poll.minChoices} and {maxChoices} wishlist books, then
					save your votes.
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
					layout === "page" && "gap-3 sm:grid sm:grid-cols-1",
				)}
			>
				{sortedOptions.map((option) => {
					const coverSrc = bookCoverUrl(option.book.coverId);
					const checked = selectedOptionIds.includes(option.id);
					const href = `/books/${option.book.slug}` as Route;
					const showAsVoted =
						poll.myVoteOptionIds.includes(option.id) &&
						(readonly || hasSavedVotes);
					const isClubPick =
						readonly &&
						selectedBookSlug != null &&
						option.book.slug === selectedBookSlug;
					const voteShare =
						showVoteBars && option.voteCount > 0
							? option.voteCount / maxVoteCount
							: 0;

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
									"relative flex items-stretch gap-3 overflow-hidden border border-border p-3 transition-colors",
									layout === "page" && "p-4 sm:gap-4",
									canEditSelection && "cursor-pointer hover:bg-muted/40",
									(checked || showAsVoted || isClubPick) &&
										"border-primary/40 bg-muted/30",
								)}
							>
								{voteShare > 0 ? (
									<div
										className="pointer-events-none absolute inset-y-0 left-0 bg-primary/10"
										style={{ width: `${voteShare * 100}%` }}
										aria-hidden
									/>
								) : null}
								{canEditSelection ? (
									<div className="flex shrink-0 items-start pt-0.5">
										<Checkbox
											checked={checked}
											className="pointer-events-none"
											tabIndex={-1}
											aria-hidden
										/>
									</div>
								) : null}

								<Link
									href={href}
									className={cn(
										"relative aspect-2/3 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10",
										layout === "page" ? "w-16 sm:w-20" : "w-14",
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
											sizes="56px"
										/>
									) : (
										<div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
											No cover
										</div>
									)}
								</Link>

								<div className="relative flex min-w-0 flex-1 flex-col gap-2">
									<div className="min-w-0">
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
											{isClubPick ? (
												<Badge variant="secondary">Club pick</Badge>
											) : null}
											{showAsVoted ? (
												<Badge variant="outline">Your vote</Badge>
											) : null}
										</div>
										<p className="truncate text-muted-foreground text-xs">
											{formatBookAuthors(option.book.authors)}
										</p>
										{option.book.requestedBy ? (
											<BookRequestedByLine
												requestedBy={option.book.requestedBy}
											/>
										) : null}
									</div>
									<div className="mt-auto flex flex-wrap items-end justify-between gap-2">
										<BookStatusBadge status={option.book.status} />
										<dl className="flex shrink-0 flex-col items-end gap-0.5 text-muted-foreground text-xs tabular-nums">
											<div>
												<dt className="sr-only">Open Library rating</dt>
												<dd>
													{option.book.openLibraryRating != null
														? `${option.book.openLibraryRating.toFixed(1)} OL`
														: "— OL"}
												</dd>
											</div>
											<div>
												<dt className="sr-only">Votes and pages</dt>
												<dd>
													{isAdmin && option.voteCount > 0 ? (
														<button
															type="button"
															className="text-foreground underline-offset-2 hover:underline"
															onClick={(event) => {
																event.stopPropagation();
																setAdminVotersOptionCount(option.voteCount);
																setAdminVotersOptionId(option.id);
															}}
														>
															{option.voteCount}{" "}
															{option.voteCount === 1 ? "vote" : "votes"}
														</button>
													) : (
														<>
															{option.voteCount}{" "}
															{option.voteCount === 1 ? "vote" : "votes"}
														</>
													)}{" "}
													· {option.book.pages} pp
												</dd>
											</div>
										</dl>
									</div>
								</div>
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
							"sticky bottom-4 border border-border bg-background/95 p-3 shadow-sm backdrop-blur-sm supports-backdrop-filter:bg-background/80",
					)}
				>
					<p className="w-full text-muted-foreground text-xs sm:w-auto sm:flex-1">
						{selectedOptionIds.length} of {maxChoices} selected
						{selectedOptionIds.length < poll.minChoices
							? ` · pick at least ${poll.minChoices}`
							: null}
					</p>
					<LoadingButton
						type="button"
						loading={submitVotesMutation.isPending}
						disabled={selectedOptionIds.length < poll.minChoices}
						onClick={() => {
							submitVotesMutation.mutate({
								sittingSlug,
								optionIds: selectedOptionIds,
							});
						}}
					>
						Save votes
					</LoadingButton>
					{selectedOptionIds.length > 0 ? (
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								setSelectedOptionIds([]);
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
						setSelectedOptionIds(poll.myVoteOptionIds);
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
