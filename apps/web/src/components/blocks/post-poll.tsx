"use client";

import type {
	PollOption,
	PostPollView,
} from "@bbrc/api/modules/post-poll/post-poll.schema";
import { authorNameToSlug, POST_POLL_TYPE_LABELS } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import { Input } from "@bbrc/ui/components/input";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import {
	BarChart3,
	Check,
	Clock,
	ExternalLink,
	MoreHorizontal,
	Plus,
	Undo2,
	X,
} from "lucide-react";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import { PollOptionContent } from "@/components/blocks/poll-option-content";
import {
	type PollTargetPick,
	PollTargetPicker,
} from "@/components/blocks/poll-target-picker";
import { PollVotersDialog } from "@/components/blocks/poll-voters-dialog";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { useFormatters } from "@/lib/i18n/use-formatters";
import {
	formatTimeLeft,
	isPendingOption,
	percent,
	pollOptionHref,
} from "@/lib/poll/format";
import { useLivePoll, usePollActions } from "@/lib/poll/use-poll";
import { cn } from "@/lib/utils";

type PostPollProps = {
	postSlug: string;
	/** The copy the feed already loaded, shown while the live one catches up. */
	initial?: PostPollView | null;
	className?: string;
};

type StackVoter = {
	username: string;
	name: string;
	image: string | null;
	rank: number | null;
};

/** A few overlapping avatars and a +N chip; tapping opens the full list. */
function VoterStack({
	voters,
	label,
	onOpen,
	showNames = false,
}: {
	voters: StackVoter[];
	label: string;
	onOpen: () => void;
	showNames?: boolean;
}) {
	const shown = voters.slice(0, 3);
	const extra = voters.length - shown.length;
	return (
		<button
			type="button"
			onClick={onOpen}
			aria-label={label}
			title={voters.map((voter) => voter.name).join(", ")}
			className="group flex shrink-0 items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
		>
			<span className="flex -space-x-1.5" aria-hidden>
				{shown.map((voter) => (
					<UserAvatar
						key={voter.username}
						user={voter}
						className="size-5 ring-2 ring-background group-hover:ring-muted"
					/>
				))}
				{extra > 0 ? (
					<span className="z-0 grid h-5 min-w-5 place-items-center bg-muted px-1 text-3xs tabular-nums ring-2 ring-background">
						+{extra}
					</span>
				) : null}
			</span>
			{showNames ? (
				<span className="text-xs">
					{shown.map((voter) => voter.name).join(", ")}
					{extra > 0 ? ` and ${extra} more` : ""}
				</span>
			) : null}
		</button>
	);
}

function useNow(intervalMs = 60_000) {
	const [now, setNow] = useState(() => new Date());
	useEffect(() => {
		const id = window.setInterval(() => setNow(new Date()), intervalMs);
		return () => window.clearInterval(id);
	}, [intervalMs]);
	return now;
}

function choiceLabel(poll: PostPollView): string {
	const range =
		poll.minChoices === poll.maxChoices
			? `${poll.maxChoices}`
			: `${poll.minChoices} to ${poll.maxChoices}`;
	if (poll.type === "single") return "Choose one";
	if (poll.type === "ranking") return `Rank ${range}`;
	return `Choose ${range}`;
}

function hiddenResultsNote(poll: PostPollView): string | null {
	if (poll.resultsVisible) return null;
	switch (poll.resultsVisibility) {
		case "voters":
			return poll.viewer.hasVoted ? null : "Results appear after you vote.";
		case "after_deadline":
			return "Results appear when the poll ends.";
		case "owner":
			return "Only the poll owner sees the results.";
		default:
			return null;
	}
}

function targetFromPick(pick: PollTargetPick): PollOption["target"] {
	return {
		slug: pick.kind === "book" || pick.kind === "series" ? pick.key : null,
		title:
			pick.kind === "book" || pick.kind === "series" || pick.kind === "author"
				? pick.label
				: null,
		authors:
			pick.kind === "book" && pick.sublabel ? pick.sublabel.split(", ") : [],
		coverId: pick.coverId,
		username: pick.kind === "user" ? pick.key : null,
		name: pick.kind === "user" ? pick.label : null,
		image: pick.kind === "user" ? pick.image : null,
		code: pick.kind === "country" ? pick.key : null,
	};
}

/** The keys already on the poll, so the picker can grey them out. */
function takenKeys(poll: PostPollView): Set<string> {
	const keys = new Set<string>();
	for (const option of poll.options) {
		if (option.target.slug) keys.add(option.target.slug);
		if (option.target.username) keys.add(option.target.username);
		if (option.target.code) keys.add(option.target.code);
		if (option.kind === "author") keys.add(authorNameToSlug(option.label));
	}
	return keys;
}

export function PostPoll({ postSlug, initial, className }: PostPollProps) {
	const query = useLivePoll(postSlug, initial);
	const poll = query.data;

	if (!poll) {
		return query.isError ? null : (
			<Skeleton className={cn("h-40 w-full", className)} aria-hidden />
		);
	}

	return <PollBody postSlug={postSlug} poll={poll} className={className} />;
}

function PollBody({
	postSlug,
	poll,
	className,
}: {
	postSlug: string;
	poll: PostPollView;
	className?: string;
}) {
	const f = useFormatters();
	const { data: session } = authClient.useSession();
	const signedIn = Boolean(session?.user);
	const actions = usePollActions(postSlug);
	const now = useNow();

	const [draft, setDraft] = useState<string[]>([]);
	const [editing, setEditing] = useState(false);
	const [addOpen, setAddOpen] = useState(false);
	const [newText, setNewText] = useState("");
	const [removeTarget, setRemoveTarget] = useState<PollOption | null>(null);
	const [closeOpen, setCloseOpen] = useState(false);
	const [deadlineOpen, setDeadlineOpen] = useState(false);
	const [votersFor, setVotersFor] = useState<PollOption | null>(null);
	const [turnoutOpen, setTurnoutOpen] = useState(false);

	const { viewer } = poll;
	const ended = poll.ended || (poll.deadline != null && poll.deadline <= now);
	const picking =
		signedIn && !ended && viewer.canVote && (!viewer.hasVoted || editing);
	const oneTap = poll.type === "single" && poll.allowVoteChange;

	const selected = picking ? draft : viewer.myBallot;
	const taken = useMemo(() => takenKeys(poll), [poll]);

	const topPoints = Math.max(
		0,
		...poll.options.map((option) => option.result?.points ?? 0),
	);
	const hiddenNote = hiddenResultsNote(poll);
	const canBeValid =
		draft.length >= (poll.type === "single" ? 1 : poll.minChoices) &&
		draft.length <= poll.maxChoices;

	function startEditing() {
		setDraft(viewer.myBallot);
		setEditing(true);
	}

	function toggle(option: PollOption) {
		if (isPendingOption(option.id)) return;
		if (poll.type === "single") {
			setDraft([option.id]);
			if (oneTap) {
				actions.vote.mutate({ postSlug, optionIds: [option.id] });
				setEditing(false);
				setDraft([]);
			}
			return;
		}
		setDraft((current) =>
			current.includes(option.id)
				? current.filter((id) => id !== option.id)
				: current.length < poll.maxChoices
					? [...current, option.id]
					: current,
		);
	}

	function submit() {
		if (!canBeValid) return;
		actions.vote.mutate({ postSlug, optionIds: draft });
		setEditing(false);
		setDraft([]);
	}

	function addText() {
		const text = newText.trim();
		if (!text) return;
		actions.addOption.add(
			{ text },
			{
				kind: "text",
				label: text,
				target: {
					slug: null,
					title: null,
					authors: [],
					coverId: null,
					username: null,
					name: null,
					image: null,
					code: null,
				},
			},
		);
		setNewText("");
		setAddOpen(false);
	}

	function addPick(pick: PollTargetPick) {
		actions.addOption.add(
			{ key: pick.key, label: pick.label },
			{ kind: pick.kind, label: pick.label, target: targetFromPick(pick) },
		);
		setAddOpen(false);
	}

	const addLimitNote =
		viewer.ownOptionsLeft != null && !viewer.isOwner
			? `You can add ${viewer.ownOptionsLeft} more.`
			: null;

	return (
		<section
			className={cn(
				"flex flex-col border border-border bg-background",
				className,
			)}
			aria-label="Poll"
		>
			<header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-border border-b px-3 py-2 text-muted-foreground text-xs">
				<span className="font-medium text-foreground">
					{POST_POLL_TYPE_LABELS[poll.type]}
				</span>
				<span>{choiceLabel(poll)}</span>
				<span className="ms-auto flex items-center gap-3">
					{poll.totalVoters != null ? (
						<span className="tabular-nums">
							{poll.totalVoters} {poll.totalVoters === 1 ? "vote" : "votes"}
						</span>
					) : null}
					<span className="inline-flex items-center gap-1">
						<Clock className="size-3" aria-hidden />
						{ended
							? "Ended"
							: poll.deadline
								? formatTimeLeft(poll.deadline, now)
								: "No deadline"}
					</span>
					{viewer.isOwner || session?.user.isAdmin ? (
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button
										type="button"
										variant="ghost"
										size="icon-xs"
										aria-label="Poll options"
									/>
								}
							>
								<MoreHorizontal className="size-3.5" aria-hidden />
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="min-w-44">
								<DropdownMenuItem
									render={
										<Link href={`/posts/${postSlug}/poll/stats` as Route} />
									}
								>
									<BarChart3 aria-hidden />
									View stats
								</DropdownMenuItem>
								{!ended ? (
									<>
										<DropdownMenuItem onClick={() => setDeadlineOpen(true)}>
											<Clock aria-hidden />
											{poll.deadline ? "Change deadline" : "Set a deadline"}
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											variant="destructive"
											onClick={() => setCloseOpen(true)}
										>
											<X aria-hidden />
											End poll now
										</DropdownMenuItem>
									</>
								) : null}
							</DropdownMenuContent>
						</DropdownMenu>
					) : null}
				</span>
			</header>

			<ul className="flex flex-col divide-y divide-border">
				{poll.options.map((option) => {
					const chosenIndex = selected.indexOf(option.id);
					const chosen = chosenIndex >= 0;
					const result = option.result;
					const href = pollOptionHref(option);
					const pending = isPendingOption(option.id);
					const leading =
						ended &&
						result != null &&
						topPoints > 0 &&
						result.points === topPoints;
					const interactive = picking && !pending;

					return (
						<li key={option.id} className={cn(pending && "opacity-60")}>
							<div className="relative flex items-center gap-2 px-3 py-2.5">
								{result ? (
									<span
										aria-hidden
										className={cn(
											"absolute inset-y-0 start-0 transition-[width] duration-300",
											leading ? "bg-primary/20" : "bg-primary/10",
										)}
										style={{ width: `${Math.round(result.share * 100)}%` }}
									/>
								) : null}

								<button
									type="button"
									disabled={!interactive}
									aria-pressed={chosen}
									onClick={() => toggle(option)}
									className={cn(
										"relative z-[1] flex min-w-0 flex-1 items-center gap-3 text-start outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring",
										interactive ? "cursor-pointer" : "cursor-default",
									)}
								>
									<span
										aria-hidden
										className={cn(
											"grid size-5 shrink-0 place-items-center border text-2xs tabular-nums",
											poll.type === "single" ? "rounded-full" : "",
											chosen
												? "border-foreground bg-foreground text-background"
												: "border-border text-muted-foreground",
											!interactive && !chosen && "opacity-40",
										)}
									>
										{chosen ? (
											poll.type === "ranking" ? (
												chosenIndex + 1
											) : (
												<Check className="size-3" />
											)
										) : null}
									</span>
									<PollOptionContent option={option} />
								</button>

								<span className="relative z-[1] flex shrink-0 items-center gap-2.5">
									{option.voters && option.voters.length > 0 ? (
										<VoterStack
											voters={option.voters}
											label={`See who chose ${option.label}`}
											onOpen={() => setVotersFor(option)}
										/>
									) : null}
									{result ? (
										<span className="text-end text-xs tabular-nums">
											<span className="font-medium">
												{percent(f, result.share)}
											</span>
											<span className="ps-1.5 text-muted-foreground">
												{poll.type === "ranking"
													? `${result.points} pts`
													: result.voters}
											</span>
										</span>
									) : null}
									{href ? (
										<Link
											href={href as Route}
											aria-label={`Open ${option.label}`}
											className="text-muted-foreground transition-colors hover:text-foreground"
										>
											<ExternalLink className="size-3.5" aria-hidden />
										</Link>
									) : null}
									{option.canRemove && !pending ? (
										<Button
											type="button"
											variant="ghost"
											size="icon-xs"
											className="text-muted-foreground hover:text-destructive"
											aria-label={`Remove ${option.label}`}
											onClick={() => setRemoveTarget(option)}
										>
											<X className="size-3.5" aria-hidden />
										</Button>
									) : null}
								</span>
							</div>

							{option.userAdded && option.addedBy ? (
								<p className="px-3 ps-[2.75rem] pb-2 text-2xs text-muted-foreground">
									Added by {option.addedBy.name}
								</p>
							) : null}
						</li>
					);
				})}
			</ul>

			<footer className="flex flex-col gap-2 border-border border-t px-3 py-2.5">
				{hiddenNote ? (
					<p className="text-muted-foreground text-xs">{hiddenNote}</p>
				) : null}

				<div className="flex flex-wrap items-center gap-2">
					{!signedIn ? (
						<p className="text-muted-foreground text-sm">
							<Link
								href={"/sign-in" as Route}
								className="font-medium text-foreground underline underline-offset-4"
							>
								Sign in
							</Link>{" "}
							to vote.
						</p>
					) : picking && !oneTap ? (
						<>
							<Button
								type="button"
								size="sm"
								disabled={!canBeValid}
								onClick={submit}
							>
								{poll.type === "ranking" ? "Submit ranking" : "Vote"}
							</Button>
							<span className="text-muted-foreground text-xs tabular-nums">
								{draft.length} of {poll.maxChoices}
								{poll.type === "ranking" ? " ranked" : " selected"}
								{poll.minChoices > 1 && draft.length < poll.minChoices
									? ` · at least ${poll.minChoices}`
									: ""}
							</span>
							{draft.length > 0 ? (
								<Button
									type="button"
									size="sm"
									variant="ghost"
									onClick={() => setDraft([])}
								>
									Clear
								</Button>
							) : null}
							{editing ? (
								<Button
									type="button"
									size="sm"
									variant="ghost"
									onClick={() => {
										setEditing(false);
										setDraft([]);
									}}
								>
									Cancel
								</Button>
							) : null}
						</>
					) : picking && oneTap ? (
						<span className="text-muted-foreground text-xs">
							{editing
								? "Tap another option to change your vote."
								: "Tap an option to vote."}
						</span>
					) : viewer.hasVoted ? (
						<>
							<span className="inline-flex items-center gap-1.5 text-sm">
								<Check className="size-4" aria-hidden />
								You voted
							</span>
							{!ended && poll.allowVoteChange ? (
								<>
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={startEditing}
									>
										Change vote
									</Button>
									<Button
										type="button"
										size="sm"
										variant="ghost"
										disabled={actions.retract.isPending}
										onClick={() => actions.retract.mutate({ postSlug })}
									>
										<Undo2 data-icon="inline-start" aria-hidden />
										Remove vote
									</Button>
								</>
							) : null}
						</>
					) : viewer.blockedReason ? (
						<span className="text-muted-foreground text-sm">
							{ended ? "This poll has ended." : viewer.blockedReason}
						</span>
					) : null}

					{viewer.canAddOption && !ended ? (
						<Button
							type="button"
							size="sm"
							variant="ghost"
							className="ms-auto"
							onClick={() => setAddOpen((open) => !open)}
						>
							<Plus data-icon="inline-start" aria-hidden />
							Add an option
						</Button>
					) : null}
				</div>

				{addOpen ? (
					<div className="flex flex-col gap-2 border-border border-t pt-3">
						{poll.optionKind === "text" ? (
							<form
								className="flex gap-2"
								onSubmit={(event) => {
									event.preventDefault();
									addText();
								}}
							>
								<Input
									value={newText}
									onChange={(event) => setNewText(event.target.value)}
									maxLength={80}
									placeholder="Your option"
									aria-label="New option"
									autoFocus
								/>
								<Button type="submit" disabled={newText.trim().length === 0}>
									Add
								</Button>
							</form>
						) : (
							<PollTargetPicker
								kind={poll.optionKind}
								taken={taken}
								onPick={addPick}
								autoFocus
							/>
						)}
						{addLimitNote ? (
							<p className="text-muted-foreground text-xs">{addLimitNote}</p>
						) : null}
					</div>
				) : null}

				{poll.turnout && poll.ballotAccess === "turnout" ? (
					<div className="flex items-center gap-2 text-muted-foreground text-xs">
						<span>Voted</span>
						{poll.turnout.length === 0 ? (
							<span>nobody yet</span>
						) : (
							<VoterStack
								voters={poll.turnout.map((voter) => ({ ...voter, rank: null }))}
								label="See who has voted"
								onOpen={() => setTurnoutOpen(true)}
								showNames
							/>
						)}
					</div>
				) : null}
			</footer>

			<PollVotersDialog
				open={votersFor != null}
				onOpenChange={(next) => !next && setVotersFor(null)}
				title={votersFor?.label ?? ""}
				voters={(votersFor?.voters ?? []).map((voter) => ({
					...voter,
					rank: poll.type === "ranking" ? voter.rank : null,
				}))}
			/>

			<PollVotersDialog
				open={turnoutOpen}
				onOpenChange={setTurnoutOpen}
				title="Who has voted"
				description="Members who voted so far."
				voters={poll.turnout ?? []}
			/>

			<DestructiveConfirmDialog
				open={removeTarget != null}
				onOpenChange={(next) => !next && setRemoveTarget(null)}
				title="Remove this option?"
				description={
					<>
						<strong className="font-medium text-foreground">
							{removeTarget?.label}
						</strong>{" "}
						will come off the poll
						{(removeTarget?.result?.voters ?? 0) > 0
							? `, and the ${removeTarget?.result?.voters} ${removeTarget?.result?.voters === 1 ? "vote" : "votes"} for it go with it`
							: ""}
						.
					</>
				}
				confirmLabel="Remove option"
				onConfirm={() => {
					if (removeTarget) {
						actions.removeOption.mutate({
							postSlug,
							optionId: removeTarget.id,
						});
					}
					setRemoveTarget(null);
				}}
			/>

			<DestructiveConfirmDialog
				open={closeOpen}
				onOpenChange={setCloseOpen}
				title="End this poll now?"
				description="Nobody can vote after this, and everyone who voted is told it ended."
				confirmLabel="End poll"
				onConfirm={() => {
					actions.close.mutate({ postSlug });
					setCloseOpen(false);
				}}
			/>

			<DeadlineDialog
				open={deadlineOpen}
				onOpenChange={setDeadlineOpen}
				poll={poll}
				onPick={(deadline) => {
					actions.updateSettings.mutate({ postSlug, deadline });
					setDeadlineOpen(false);
				}}
			/>
		</section>
	);
}

const HOUR = 3_600_000;

function DeadlineDialog({
	open,
	onOpenChange,
	poll,
	onPick,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	poll: PostPollView;
	onPick: (deadline: Date | null) => void;
}) {
	const base = Math.max(Date.now(), poll.deadline?.getTime() ?? 0);
	const locked = poll.viewer.hasVotes;
	const presets = [
		{ label: "1 more day", ms: 24 * HOUR },
		{ label: "3 more days", ms: 72 * HOUR },
		{ label: "1 more week", ms: 168 * HOUR },
	];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>
						{poll.deadline ? "Change deadline" : "Set a deadline"}
					</DialogTitle>
					<DialogDescription>
						{locked
							? "People have voted, so the deadline can only move later."
							: "Voting closes at the deadline."}
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-2">
					{presets.map((preset) => (
						<Button
							key={preset.label}
							type="button"
							variant="outline"
							onClick={() => onPick(new Date(base + preset.ms))}
						>
							{poll.deadline ? preset.label : preset.label.replace("more ", "")}
						</Button>
					))}
					{poll.deadline &&
					poll.resultsVisibility !== "after_deadline" &&
					!locked ? (
						<Button type="button" variant="ghost" onClick={() => onPick(null)}>
							Remove the deadline
						</Button>
					) : null}
				</div>
			</DialogContent>
		</Dialog>
	);
}
