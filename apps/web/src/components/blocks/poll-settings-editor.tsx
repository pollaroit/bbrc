"use client";

import type { PostPollView } from "@bbrc/api/modules/post-poll/post-poll.schema";
import {
	POST_POLL_BALLOT_LABELS,
	POST_POLL_BALLOT_VISIBILITY,
	POST_POLL_LIMITS,
	POST_POLL_RESULTS_LABELS,
	POST_POLL_RESULTS_VISIBILITY,
	POST_POLL_TYPE_LABELS,
	POST_POLL_TYPES,
	type PostPollBallotVisibility,
	type PostPollResultsVisibility,
	type PostPollType,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Input } from "@bbrc/ui/components/input";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import type { Route } from "next";
import { useId, useState } from "react";
import { toast } from "sonner";
import {
	Block,
	DEADLINE_PRESETS,
	SwitchLine,
	toInt,
	toLocalInputValue,
} from "@/components/blocks/poll-builder";
import { PollOptionContent } from "@/components/blocks/poll-option-content";
import { SegmentedControl } from "@/components/blocks/segmented-control";
import { Link } from "@/i18n/navigation";
import { formatDateTime } from "@/lib/format-datetime";
import { syncPoll } from "@/lib/poll/use-poll";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

function Choice({
	active,
	disabled,
	title,
	hint,
	onClick,
}: {
	active: boolean;
	disabled?: boolean;
	title: string;
	hint: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			aria-pressed={active}
			disabled={disabled}
			onClick={onClick}
			className={cn(
				"flex flex-col gap-0.5 border px-3 py-2 text-start transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40",
				active
					? "border-foreground bg-muted/40"
					: "border-border hover:bg-muted/30",
			)}
		>
			<span className="font-medium text-sm">{title}</span>
			<span className="text-muted-foreground text-xs">{hint}</span>
		</button>
	);
}

/** What the owner can still change about a poll, with the limits that apply once people have voted. */
export function PollSettingsEditor({
	poll,
	postSlug,
}: {
	poll: PostPollView;
	postSlug: string;
}) {
	const uid = useId();
	const locked = poll.viewer.hasVotes;
	const ended = poll.ended;

	const [type, setType] = useState<PostPollType>(poll.type);
	const [minChoices, setMinChoices] = useState(poll.minChoices);
	const [maxChoices, setMaxChoices] = useState(poll.maxChoices);
	const [deadline, setDeadline] = useState<Date | null>(poll.deadline);
	const [results, setResults] = useState<PostPollResultsVisibility>(
		poll.resultsVisibility,
	);
	const [ballot, setBallot] = useState<PostPollBallotVisibility>(
		poll.ballotVisibility,
	);
	const [allowVoteChange, setAllowVoteChange] = useState(poll.allowVoteChange);
	const [allowUserOptions, setAllowUserOptions] = useState(
		poll.allowUserOptions,
	);
	const [perUser, setPerUser] = useState(poll.maxOptionsPerUser ?? 2);
	const [total, setTotal] = useState(poll.maxOptionsTotal ?? 6);

	const currentBallotIndex = POST_POLL_BALLOT_VISIBILITY.indexOf(
		poll.ballotVisibility,
	);

	const mutation = useMutation(
		orpc.postPoll.updateSettings.mutationOptions({
			onSuccess: (view) => {
				syncPoll(postSlug, view);
				toast.success("Poll settings saved.");
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const changed =
		type !== poll.type ||
		minChoices !== poll.minChoices ||
		maxChoices !== poll.maxChoices ||
		deadline?.getTime() !== poll.deadline?.getTime() ||
		results !== poll.resultsVisibility ||
		ballot !== poll.ballotVisibility ||
		allowVoteChange !== poll.allowVoteChange ||
		allowUserOptions !== poll.allowUserOptions ||
		(allowUserOptions &&
			(perUser !== poll.maxOptionsPerUser || total !== poll.maxOptionsTotal));

	const problem =
		results === "after_deadline" && !deadline
			? "Showing results after the deadline needs a deadline."
			: allowUserOptions && perUser > total
				? "Each member's limit cannot be higher than the total."
				: null;

	function save() {
		mutation.mutate({
			postSlug,
			...(type !== poll.type ||
			minChoices !== poll.minChoices ||
			maxChoices !== poll.maxChoices
				? { type, minChoices, maxChoices }
				: {}),
			...(deadline?.getTime() !== poll.deadline?.getTime() ? { deadline } : {}),
			...(results !== poll.resultsVisibility
				? { resultsVisibility: results }
				: {}),
			...(ballot !== poll.ballotVisibility ? { ballotVisibility: ballot } : {}),
			...(allowVoteChange !== poll.allowVoteChange ? { allowVoteChange } : {}),
			...(allowUserOptions !== poll.allowUserOptions
				? { allowUserOptions }
				: {}),
			...(allowUserOptions
				? { maxOptionsPerUser: perUser, maxOptionsTotal: total }
				: {}),
		});
	}

	return (
		<div className="flex flex-col gap-4">
			{ended ? (
				<p className="border border-border bg-muted/30 px-3 py-2 text-sm">
					This poll has ended, so its settings are fixed.
				</p>
			) : locked ? (
				<p className="border border-border bg-muted/30 px-3 py-2 text-sm">
					People have voted. The type, the options and the choice limits are
					fixed now, the deadline can only move later, and ballot privacy can
					only get stricter.
				</p>
			) : null}

			<Block title="Options on the poll">
				<ul className="flex flex-col divide-y divide-border border border-border">
					{poll.options.map((option) => (
						<li key={option.id} className="px-3 py-2">
							<PollOptionContent option={option} />
						</li>
					))}
				</ul>
				<p className="text-muted-foreground text-xs">
					{locked
						? "Your options are locked once voting starts. You can still remove options members added, from the poll itself."
						: "Add or remove options on the poll itself. Members' own options can be removed there too."}
				</p>
			</Block>

			<Block title="Type">
				<SegmentedControl<PostPollType>
					label="Poll type"
					value={type}
					onChange={setType}
					options={POST_POLL_TYPES.map((id) => ({
						id,
						label: POST_POLL_TYPE_LABELS[id],
					}))}
				/>
				{type !== "single" ? (
					<div className="flex flex-wrap items-center gap-3 text-sm">
						<label htmlFor={`${uid}-min`} className="flex items-center gap-2">
							At least
							<Input
								id={`${uid}-min`}
								type="number"
								min={1}
								max={maxChoices}
								value={minChoices}
								disabled={locked || ended}
								onChange={(event) =>
									setMinChoices(toInt(event.target.value, 1))
								}
								className="w-20"
							/>
						</label>
						<label htmlFor={`${uid}-max`} className="flex items-center gap-2">
							at most
							<Input
								id={`${uid}-max`}
								type="number"
								min={minChoices}
								max={POST_POLL_LIMITS.maxOptions}
								value={maxChoices}
								disabled={locked || ended}
								onChange={(event) =>
									setMaxChoices(toInt(event.target.value, 2))
								}
								className="w-20"
							/>
						</label>
					</div>
				) : null}
				{locked ? (
					<p className="text-muted-foreground text-xs">
						Locked because people have voted.
					</p>
				) : null}
			</Block>

			<Block
				title="Deadline"
				hint={
					deadline
						? `Voting closes ${formatDateTime(deadline)}.`
						: "No deadline: voting stays open until you end the poll."
				}
			>
				<div className="flex flex-wrap items-center gap-2">
					{DEADLINE_PRESETS.map((preset) => (
						<Button
							key={preset.label}
							type="button"
							size="sm"
							variant="outline"
							disabled={ended}
							onClick={() =>
								setDeadline(
									new Date(
										Math.max(Date.now(), poll.deadline?.getTime() ?? 0) +
											preset.ms,
									),
								)
							}
						>
							+{preset.label}
						</Button>
					))}
					<Button
						type="button"
						size="sm"
						variant="ghost"
						disabled={ended || locked || results === "after_deadline"}
						onClick={() => setDeadline(null)}
					>
						No deadline
					</Button>
				</div>
				<Input
					type="datetime-local"
					value={toLocalInputValue(deadline)}
					disabled={ended}
					min={toLocalInputValue(poll.deadline ?? new Date())}
					onChange={(event) =>
						setDeadline(
							event.target.value ? new Date(event.target.value) : null,
						)
					}
					aria-label="Deadline"
				/>
			</Block>

			<Block title="Who sees the results">
				<div className="grid gap-2 sm:grid-cols-2">
					{POST_POLL_RESULTS_VISIBILITY.map((id) => (
						<Choice
							key={id}
							active={results === id}
							disabled={ended || (id === "after_deadline" && !deadline)}
							title={POST_POLL_RESULTS_LABELS[id].label}
							hint={POST_POLL_RESULTS_LABELS[id].hint}
							onClick={() => setResults(id)}
						/>
					))}
				</div>
			</Block>

			<Block
				title="Ballot privacy"
				hint="From fully secret to public names. Once people vote it can only get stricter."
			>
				<div className="flex flex-col gap-2">
					{POST_POLL_BALLOT_VISIBILITY.map((id, index) => (
						<Choice
							key={id}
							active={ballot === id}
							disabled={ended || (locked && index > currentBallotIndex)}
							title={POST_POLL_BALLOT_LABELS[id].label}
							hint={POST_POLL_BALLOT_LABELS[id].hint}
							onClick={() => setBallot(id)}
						/>
					))}
				</div>
			</Block>

			<Block title="Voting rules">
				<SwitchLine
					id={`${uid}-change`}
					label="Let people change their vote"
					hint="They can switch or remove their vote until the poll ends."
					checked={allowVoteChange}
					disabled={ended}
					onChange={setAllowVoteChange}
				/>
				<SwitchLine
					id={`${uid}-options`}
					label="Let members add options"
					hint="They add the same kind of option the poll already uses."
					checked={allowUserOptions}
					disabled={ended}
					onChange={setAllowUserOptions}
				/>
				{allowUserOptions ? (
					<div className="flex flex-wrap items-center gap-3 text-sm">
						<label htmlFor={`${uid}-per`} className="flex items-center gap-2">
							Each member
							<Input
								id={`${uid}-per`}
								type="number"
								min={1}
								value={perUser}
								disabled={ended}
								onChange={(event) => setPerUser(toInt(event.target.value, 1))}
								className="w-20"
							/>
						</label>
						<label htmlFor={`${uid}-total`} className="flex items-center gap-2">
							up to, everyone together
							<Input
								id={`${uid}-total`}
								type="number"
								min={1}
								value={total}
								disabled={ended}
								onChange={(event) => setTotal(toInt(event.target.value, 1))}
								className="w-20"
							/>
						</label>
					</div>
				) : null}
			</Block>

			<div className="flex flex-wrap items-center gap-3">
				<LoadingButton
					type="button"
					loading={mutation.isPending}
					disabled={ended || !changed || problem != null}
					onClick={save}
				>
					Save poll settings
				</LoadingButton>
				<Button
					type="button"
					variant="ghost"
					render={<Link href={`/posts/${postSlug}/poll/stats` as Route} />}
					nativeButton={false}
				>
					<BarChart3 data-icon="inline-start" aria-hidden />
					Poll stats
				</Button>
				{problem ? (
					<span className="text-destructive text-xs">{problem}</span>
				) : null}
			</div>
		</div>
	);
}
