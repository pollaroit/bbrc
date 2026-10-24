"use client";

import type {
	CreatePollInput,
	PollOption,
	PostPollView,
} from "@bbrc/api/modules/post-poll/post-poll.schema";
import {
	ballotAccess,
	normalizeChoiceLimits,
	POST_POLL_BALLOT_LABELS,
	POST_POLL_BALLOT_VISIBILITY,
	POST_POLL_LIMITS,
	POST_POLL_OPTION_KIND_LABELS,
	POST_POLL_OPTION_KINDS,
	POST_POLL_RESULTS_LABELS,
	POST_POLL_RESULTS_VISIBILITY,
	POST_POLL_TYPE_HINTS,
	POST_POLL_TYPE_LABELS,
	POST_POLL_TYPES,
	type PostPollBallotVisibility,
	type PostPollOptionKind,
	type PostPollResultsVisibility,
	type PostPollType,
	textDedupeKey,
	validatePollSetup,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Input } from "@bbrc/ui/components/input";
import { Switch } from "@bbrc/ui/components/switch";
import { Check, Plus, X } from "lucide-react";
import { type ReactNode, useId, useRef } from "react";
import { PollOptionContent } from "@/components/blocks/poll-option-content";
import {
	type PollTargetPick,
	PollTargetPicker,
} from "@/components/blocks/poll-target-picker";
import { SegmentedControl } from "@/components/blocks/segmented-control";
import { formatDateTime } from "@/lib/format-datetime";
import { PENDING_OPTION_PREFIX } from "@/lib/poll/format";
import { cn } from "@/lib/utils";

// ── Draft ──────────────────────────────────────────────────────────────────

export type PollDraftOption = {
	id: string;
	text: string;
	pick: PollTargetPick | null;
};

export type PollDraft = {
	type: PostPollType;
	optionKind: PostPollOptionKind;
	options: PollDraftOption[];
	minChoices: number;
	maxChoices: number;
	allowUserOptions: boolean;
	maxOptionsPerUser: number;
	maxOptionsTotal: number;
	resultsVisibility: PostPollResultsVisibility;
	ballotVisibility: PostPollBallotVisibility;
	allowVoteChange: boolean;
	deadline: Date | null;
};

function emptyOption(): PollDraftOption {
	return { id: crypto.randomUUID(), text: "", pick: null };
}

export function emptyPollDraft(): PollDraft {
	return {
		type: "single",
		optionKind: "text",
		options: [emptyOption(), emptyOption()],
		minChoices: 1,
		maxChoices: 2,
		allowUserOptions: false,
		maxOptionsPerUser: 2,
		maxOptionsTotal: 6,
		resultsVisibility: "everyone",
		ballotVisibility: "owner",
		allowVoteChange: true,
		deadline: null,
	};
}

function optionKey(draft: PollDraft, option: PollDraftOption): string {
	return draft.optionKind === "text"
		? textDedupeKey(option.text)
		: `${draft.optionKind}:${option.pick?.key ?? ""}`;
}

function isFilled(draft: PollDraft, option: PollDraftOption): boolean {
	return draft.optionKind === "text"
		? option.text.trim().length > 0
		: option.pick != null;
}

/** The first problem with the poll in plain words, or null when it can be posted. */
export function pollDraftProblem(draft: PollDraft): string | null {
	const unfilled = draft.options.filter((option) => !isFilled(draft, option));
	if (unfilled.length > 0) {
		return draft.optionKind === "text"
			? "Fill in every option, or remove the empty ones."
			: "Pick something for every option, or remove the empty ones.";
	}

	const keys = draft.options.map((option) => optionKey(draft, option));
	if (new Set(keys).size !== keys.length) {
		return "Two of your options are the same.";
	}

	const limits = normalizeChoiceLimits(
		draft.type,
		draft.minChoices,
		draft.maxChoices,
		draft.options.length,
	);
	return validatePollSetup({
		type: draft.type,
		optionKind: draft.optionKind,
		optionCount: draft.options.length,
		minChoices: limits.minChoices,
		maxChoices: limits.maxChoices,
		allowUserOptions: draft.allowUserOptions,
		maxOptionsPerUser: draft.allowUserOptions ? draft.maxOptionsPerUser : null,
		maxOptionsTotal: draft.allowUserOptions ? draft.maxOptionsTotal : null,
		resultsVisibility: draft.resultsVisibility,
		deadline: draft.deadline,
	});
}

export function pollDraftToInput(draft: PollDraft): CreatePollInput {
	const limits = normalizeChoiceLimits(
		draft.type,
		draft.minChoices,
		draft.maxChoices,
		draft.options.length,
	);

	return {
		type: draft.type,
		optionKind: draft.optionKind,
		options: draft.options.map((option) =>
			draft.optionKind === "text" || !option.pick
				? { text: option.text.trim() }
				: { key: option.pick.key, label: option.pick.label },
		),
		minChoices: limits.minChoices,
		maxChoices: limits.maxChoices,
		allowUserOptions: draft.allowUserOptions,
		maxOptionsPerUser: draft.allowUserOptions ? draft.maxOptionsPerUser : null,
		maxOptionsTotal: draft.allowUserOptions ? draft.maxOptionsTotal : null,
		resultsVisibility: draft.resultsVisibility,
		ballotVisibility: draft.ballotVisibility,
		allowVoteChange: draft.allowVoteChange,
		deadline: draft.deadline,
	};
}

function targetFromPick(
	kind: PostPollOptionKind,
	pick: PollTargetPick | null,
): PollOption["target"] {
	const target: PollOption["target"] = {
		slug: null,
		title: null,
		authors: [],
		coverId: null,
		username: null,
		name: null,
		image: null,
		code: null,
	};
	if (!pick) return target;

	switch (kind) {
		case "book":
			return {
				...target,
				slug: pick.key,
				title: pick.label,
				authors: pick.sublabel ? pick.sublabel.split(", ") : [],
				coverId: pick.coverId,
			};
		case "user":
			return {
				...target,
				username: pick.key,
				name: pick.label,
				image: pick.image,
			};
		case "country":
			return { ...target, code: pick.key };
		case "author":
		case "series":
			return { ...target, slug: pick.key, title: pick.label };
		default:
			return target;
	}
}

/** The poll as the author will see it the moment they post, before the server answers. */
export function pollDraftToPreview(
	draft: PollDraft,
	author: { username: string; name: string; image: string | null },
): PostPollView {
	const input = pollDraftToInput(draft);
	const access = ballotAccess(draft.ballotVisibility, {
		isOwner: true,
		isAdmin: false,
		hasVoted: false,
		resultsVisible: true,
	});

	return {
		id: `${PENDING_OPTION_PREFIX}poll-${crypto.randomUUID()}`,
		type: draft.type,
		minChoices: input.minChoices ?? 1,
		maxChoices: input.maxChoices ?? 1,
		optionKind: draft.optionKind,
		allowUserOptions: draft.allowUserOptions,
		maxOptionsPerUser: draft.allowUserOptions ? draft.maxOptionsPerUser : null,
		maxOptionsTotal: draft.allowUserOptions ? draft.maxOptionsTotal : null,
		resultsVisibility: draft.resultsVisibility,
		ballotVisibility: draft.ballotVisibility,
		allowVoteChange: draft.allowVoteChange,
		deadline: draft.deadline,
		closedAt: null,
		ended: false,
		resultsVisible: true,
		totalVoters: 0,
		ballotAccess: access,
		turnout: access === "none" ? null : [],
		viewer: {
			isOwner: true,
			hasVoted: false,
			myBallot: [],
			canVote: true,
			blockedReason: null,
			canAddOption: true,
			ownOptionsLeft: null,
			hasVotes: false,
		},
		options: draft.options.map((option, index) => ({
			id: `${PENDING_OPTION_PREFIX}${crypto.randomUUID()}`,
			kind: draft.optionKind,
			label:
				draft.optionKind === "text"
					? option.text.trim()
					: (option.pick?.label ?? ""),
			position: index,
			userAdded: false,
			addedBy: author,
			target: targetFromPick(draft.optionKind, option.pick),
			canRemove: true,
			result: { voters: 0, share: 0, points: 0, firstChoices: 0, rankSum: 0 },
			voters: access === "ballots" ? [] : null,
		})),
	};
}

// ── UI ─────────────────────────────────────────────────────────────────────

export function Block({
	title,
	hint,
	children,
}: {
	title: string;
	hint?: ReactNode;
	children: ReactNode;
}) {
	return (
		<fieldset className="flex min-w-0 flex-col gap-3 border border-border p-4">
			<legend className="px-1 font-medium text-sm">{title}</legend>
			{hint ? (
				<p className="-mt-1 text-muted-foreground text-xs leading-relaxed">
					{hint}
				</p>
			) : null}
			{children}
		</fieldset>
	);
}

export function SwitchLine({
	id,
	label,
	hint,
	checked,
	disabled,
	onChange,
}: {
	id: string;
	label: string;
	hint: string;
	checked: boolean;
	disabled?: boolean;
	onChange: (checked: boolean) => void;
}) {
	return (
		<div className="flex items-start justify-between gap-4">
			<div className="space-y-0.5">
				<label htmlFor={id} className="font-medium text-sm">
					{label}
				</label>
				<p className="text-muted-foreground text-xs leading-relaxed">{hint}</p>
			</div>
			<Switch
				id={id}
				checked={checked}
				disabled={disabled}
				onCheckedChange={onChange}
			/>
		</div>
	);
}

export function toInt(value: string, fallback: number): number {
	const parsed = Number.parseInt(value, 10);
	return Number.isNaN(parsed) ? fallback : parsed;
}

/** `datetime-local` wants the local wall-clock time, without a zone. */
export function toLocalInputValue(date: Date | null): string {
	if (!date) return "";
	const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
	return shifted.toISOString().slice(0, 16);
}

export const DEADLINE_PRESETS = [
	{ label: "1 hour", ms: 60 * 60_000 },
	{ label: "1 day", ms: 24 * 60 * 60_000 },
	{ label: "3 days", ms: 3 * 24 * 60 * 60_000 },
	{ label: "1 week", ms: 7 * 24 * 60 * 60_000 },
] as const;

const KIND_NOUN: Record<PostPollOptionKind, string> = {
	text: "text",
	book: "books",
	author: "authors",
	series: "series",
	country: "countries",
	user: "members",
};

type PollBuilderProps = {
	draft: PollDraft;
	onChange: (next: PollDraft) => void;
	disabled?: boolean;
};

export function PollBuilder({ draft, onChange, disabled }: PollBuilderProps) {
	const uid = useId();
	const focusNext = useRef<string | null>(null);
	const optionCount = draft.options.length;
	const isText = draft.optionKind === "text";
	const choiceCap = draft.allowUserOptions
		? POST_POLL_LIMITS.maxOptions
		: Math.max(2, optionCount);

	const patch = (changes: Partial<PollDraft>) =>
		onChange({ ...draft, ...changes });

	const setOptions = (options: PollDraftOption[]) => {
		const cap = draft.allowUserOptions
			? POST_POLL_LIMITS.maxOptions
			: Math.max(2, options.length);
		const maxChoices = Math.min(draft.maxChoices, cap);
		onChange({
			...draft,
			options,
			maxChoices,
			minChoices: Math.min(draft.minChoices, maxChoices),
		});
	};

	const addTextOption = () => {
		if (optionCount >= POST_POLL_LIMITS.maxOptions) return;
		const next = emptyOption();
		focusNext.current = next.id;
		setOptions([...draft.options, next]);
	};

	const removeOption = (id: string) => {
		const remaining = draft.options.filter((option) => option.id !== id);
		// Text polls always show at least two rows so there is something to type into.
		while (isText && remaining.length < POST_POLL_LIMITS.minOptions) {
			remaining.push(emptyOption());
		}
		setOptions(remaining);
	};

	const takenKeys = new Set(
		draft.options.flatMap((option) => (option.pick ? [option.pick.key] : [])),
	);

	const deadlineLabel = draft.deadline
		? formatDateTime(draft.deadline)
		: "No deadline";

	const total = draft.maxOptionsTotal;
	const perUser = draft.maxOptionsPerUser;
	const memberRoom = POST_POLL_LIMITS.maxOptions - optionCount;

	return (
		<div className="flex flex-col gap-4">
			<Block title="Poll type" hint={POST_POLL_TYPE_HINTS[draft.type]}>
				<SegmentedControl
					label="Poll type"
					value={draft.type}
					onChange={(type) => patch({ type })}
					options={POST_POLL_TYPES.map((id) => ({
						id,
						label: POST_POLL_TYPE_LABELS[id],
					}))}
				/>
				{draft.type !== "single" ? (
					<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
						<label
							htmlFor={`${uid}-min`}
							className="text-muted-foreground text-xs"
						>
							Fewest
						</label>
						<Input
							id={`${uid}-min`}
							type="number"
							inputMode="numeric"
							min={1}
							max={draft.maxChoices}
							value={draft.minChoices}
							disabled={disabled}
							onChange={(event) =>
								patch({
									minChoices: Math.min(
										Math.max(1, toInt(event.target.value, 1)),
										draft.maxChoices,
									),
								})
							}
							className="w-20"
						/>
						<label
							htmlFor={`${uid}-max`}
							className="text-muted-foreground text-xs"
						>
							Most
						</label>
						<Input
							id={`${uid}-max`}
							type="number"
							inputMode="numeric"
							min={Math.max(draft.minChoices, 2)}
							max={choiceCap}
							value={draft.maxChoices}
							disabled={disabled}
							onChange={(event) =>
								patch({
									maxChoices: Math.min(
										Math.max(
											Math.max(draft.minChoices, 2),
											toInt(event.target.value, 2),
										),
										choiceCap,
									),
								})
							}
							className="w-20"
						/>
						<span className="text-muted-foreground text-xs">
							{draft.minChoices === draft.maxChoices
								? `Members ${draft.type === "ranking" ? "rank" : "pick"} exactly ${draft.minChoices} options`
								: `Members ${draft.type === "ranking" ? "rank" : "pick"} between ${draft.minChoices} and ${draft.maxChoices} options`}
						</span>
					</div>
				) : null}
			</Block>

			<Block
				title="Options"
				hint={`${optionCount} of ${POST_POLL_LIMITS.maxOptions}. Add at least ${POST_POLL_LIMITS.minOptions}.`}
			>
				<SegmentedControl
					label="Options are"
					value={draft.optionKind}
					onChange={(optionKind) => {
						if (optionKind === draft.optionKind) return;
						// A different kind makes the old options meaningless, so start fresh.
						onChange({
							...draft,
							optionKind,
							options: [emptyOption(), emptyOption()],
						});
					}}
					options={POST_POLL_OPTION_KINDS.map((id) => ({
						id,
						label: POST_POLL_OPTION_KIND_LABELS[id],
					}))}
				/>

				{isText ? (
					<ul className="flex flex-col gap-2">
						{draft.options.map((option, index) => (
							<li key={option.id} className="flex items-center gap-2">
								<span
									className="w-5 shrink-0 text-center text-muted-foreground text-xs tabular-nums"
									aria-hidden
								>
									{index + 1}
								</span>
								<Input
									value={option.text}
									maxLength={POST_POLL_LIMITS.optionTextMax}
									disabled={disabled}
									autoFocus={focusNext.current === option.id}
									aria-label={`Option ${index + 1}`}
									placeholder={`Option ${index + 1}`}
									onChange={(event) =>
										setOptions(
											draft.options.map((entry) =>
												entry.id === option.id
													? { ...entry, text: event.target.value }
													: entry,
											),
										)
									}
									onKeyDown={(event) => {
										if (
											event.key === "Enter" &&
											index === optionCount - 1 &&
											option.text.trim().length > 0
										) {
											event.preventDefault();
											addTextOption();
										}
									}}
								/>
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									className="shrink-0 text-muted-foreground hover:text-destructive"
									aria-label={`Remove option ${index + 1}`}
									disabled={
										disabled || optionCount <= POST_POLL_LIMITS.minOptions
									}
									onClick={() => removeOption(option.id)}
								>
									<X className="size-4" aria-hidden />
								</Button>
							</li>
						))}
					</ul>
				) : (
					<>
						{draft.options.length > 0 && draft.options.some((o) => o.pick) ? (
							<ul className="divide-y divide-border border border-border">
								{draft.options.map((option) =>
									option.pick ? (
										<li
											key={option.id}
											className="flex items-center gap-3 p-2.5"
										>
											<PollOptionContent
												className="flex-1"
												option={{
													kind: draft.optionKind,
													label: option.pick.label,
													target: targetFromPick(draft.optionKind, option.pick),
												}}
											/>
											<Button
												type="button"
												variant="ghost"
												size="icon-sm"
												className="shrink-0 text-muted-foreground hover:text-destructive"
												aria-label={`Remove ${option.pick.label}`}
												disabled={disabled}
												onClick={() =>
													setOptions(
														draft.options.filter(
															(entry) => entry.id !== option.id,
														),
													)
												}
											>
												<X className="size-4" aria-hidden />
											</Button>
										</li>
									) : null,
								)}
							</ul>
						) : null}
						{optionCount < POST_POLL_LIMITS.maxOptions ? (
							<PollTargetPicker
								kind={draft.optionKind as Exclude<PostPollOptionKind, "text">}
								taken={takenKeys}
								onPick={(pick) =>
									setOptions([
										...draft.options.filter((option) => option.pick),
										{ id: crypto.randomUUID(), text: "", pick },
									])
								}
							/>
						) : null}
					</>
				)}

				{isText ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="w-fit"
						disabled={disabled || optionCount >= POST_POLL_LIMITS.maxOptions}
						onClick={addTextOption}
					>
						<Plus data-icon="inline-start" aria-hidden />
						Add option
					</Button>
				) : null}
			</Block>

			<Block title="Deadline" hint={deadlineLabel}>
				<div className="flex flex-wrap gap-2">
					{DEADLINE_PRESETS.map((preset) => (
						<button
							key={preset.label}
							type="button"
							disabled={disabled}
							onClick={() =>
								patch({ deadline: new Date(Date.now() + preset.ms) })
							}
							className="border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
						>
							{preset.label}
						</button>
					))}
					<button
						type="button"
						aria-pressed={draft.deadline == null}
						disabled={disabled}
						onClick={() =>
							patch({
								deadline: null,
								resultsVisibility:
									draft.resultsVisibility === "after_deadline"
										? "everyone"
										: draft.resultsVisibility,
							})
						}
						className={cn(
							"border px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50",
							draft.deadline == null
								? "border-foreground bg-foreground text-background"
								: "border-border hover:bg-muted/50",
						)}
					>
						No deadline
					</button>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<label
						htmlFor={`${uid}-deadline`}
						className="text-muted-foreground text-xs"
					>
						Or pick a moment
					</label>
					<Input
						id={`${uid}-deadline`}
						type="datetime-local"
						disabled={disabled}
						value={toLocalInputValue(draft.deadline)}
						onChange={(event) => {
							const value = event.target.value;
							patch({ deadline: value ? new Date(value) : null });
						}}
						className="w-fit"
					/>
				</div>
			</Block>

			<Block
				title="Who sees the results"
				hint="You and admins always see live results."
			>
				<div
					role="radiogroup"
					aria-label="Who sees the results"
					className="grid gap-2 sm:grid-cols-2"
				>
					{POST_POLL_RESULTS_VISIBILITY.map((id) => {
						const selected = draft.resultsVisibility === id;
						const blocked = id === "after_deadline" && draft.deadline == null;
						return (
							<label
								key={id}
								className={cn(
									"relative flex cursor-pointer flex-col gap-1 border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50",
									selected
										? "border-foreground bg-muted/30"
										: "border-border hover:bg-muted/40",
									blocked &&
										"cursor-not-allowed opacity-50 hover:bg-transparent",
								)}
							>
								<input
									type="radio"
									name={`${uid}-results`}
									value={id}
									checked={selected}
									disabled={disabled || blocked}
									onChange={() => patch({ resultsVisibility: id })}
									className="sr-only"
								/>
								<span className="flex items-center justify-between gap-2 font-medium text-sm">
									{POST_POLL_RESULTS_LABELS[id].label}
									{selected ? (
										<Check className="size-4 shrink-0" aria-hidden />
									) : null}
								</span>
								<span className="text-muted-foreground text-xs leading-relaxed">
									{blocked
										? "Set a deadline first."
										: POST_POLL_RESULTS_LABELS[id].hint}
								</span>
							</label>
						);
					})}
				</div>
			</Block>

			<Block
				title="Ballot privacy"
				hint="Secret means nobody sees who voted or what they chose, not even you. Each step shows a little more."
			>
				<div
					role="radiogroup"
					aria-label="Ballot privacy"
					className="flex flex-col"
				>
					{POST_POLL_BALLOT_VISIBILITY.map((id, index) => {
						const selected = draft.ballotVisibility === id;
						const reached =
							POST_POLL_BALLOT_VISIBILITY.indexOf(draft.ballotVisibility) >=
							index;
						const last = index === POST_POLL_BALLOT_VISIBILITY.length - 1;
						return (
							<label
								key={id}
								className="group relative flex cursor-pointer gap-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring"
							>
								<input
									type="radio"
									name={`${uid}-ballots`}
									value={id}
									checked={selected}
									disabled={disabled}
									onChange={() => patch({ ballotVisibility: id })}
									className="sr-only"
								/>
								<span
									className="flex w-4 shrink-0 flex-col items-center"
									aria-hidden
								>
									<span
										className={cn(
											"mt-1 size-3 shrink-0 border-2",
											selected
												? "border-foreground bg-foreground"
												: reached
													? "border-foreground bg-background"
													: "border-border bg-background",
										)}
									/>
									{last ? null : (
										<span
											className={cn(
												"w-0.5 flex-1",
												POST_POLL_BALLOT_VISIBILITY.indexOf(
													draft.ballotVisibility,
												) > index
													? "bg-foreground"
													: "bg-border",
											)}
										/>
									)}
								</span>
								<span
									className={cn(
										"flex flex-1 flex-col gap-0.5 pb-3",
										selected ? "text-foreground" : "text-muted-foreground",
										"group-hover:text-foreground",
									)}
								>
									<span
										className={cn(
											"text-sm leading-snug",
											selected && "font-medium",
										)}
									>
										{POST_POLL_BALLOT_LABELS[id].label}
									</span>
									<span className="text-xs leading-relaxed">
										{POST_POLL_BALLOT_LABELS[id].hint}
									</span>
								</span>
							</label>
						);
					})}
				</div>
			</Block>

			<Block title="Voting rules">
				<SwitchLine
					id={`${uid}-change`}
					label="Let people change their vote"
					hint="Until the poll ends. Turn this off to make the first vote final."
					checked={draft.allowVoteChange}
					disabled={disabled}
					onChange={(allowVoteChange) => patch({ allowVoteChange })}
				/>
				<SwitchLine
					id={`${uid}-members`}
					label="Let members add options"
					hint={
						isText
							? "Members can suggest extra options. You can remove any of them."
							: `Members can only add the same kind (${KIND_NOUN[draft.optionKind]}).`
					}
					checked={draft.allowUserOptions}
					disabled={disabled}
					onChange={(allowUserOptions) => patch({ allowUserOptions })}
				/>
				{draft.allowUserOptions ? (
					<div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-border border-s-2 ps-4">
						<label
							htmlFor={`${uid}-per`}
							className="text-muted-foreground text-xs"
						>
							Each member
						</label>
						<Input
							id={`${uid}-per`}
							type="number"
							inputMode="numeric"
							min={1}
							max={Math.max(1, Math.min(total, memberRoom))}
							value={perUser}
							disabled={disabled}
							onChange={(event) =>
								patch({
									maxOptionsPerUser: Math.min(
										Math.max(1, toInt(event.target.value, 1)),
										Math.max(1, total),
									),
								})
							}
							className="w-20"
						/>
						<label
							htmlFor={`${uid}-total`}
							className="text-muted-foreground text-xs"
						>
							Everyone together
						</label>
						<Input
							id={`${uid}-total`}
							type="number"
							inputMode="numeric"
							min={perUser}
							max={Math.max(perUser, memberRoom)}
							value={total}
							disabled={disabled}
							onChange={(event) => {
								const next = Math.min(
									Math.max(perUser, toInt(event.target.value, perUser)),
									Math.max(perUser, memberRoom),
								);
								patch({ maxOptionsTotal: next });
							}}
							className="w-20"
						/>
						<span className="basis-full text-muted-foreground text-xs">
							Your {optionCount} options plus up to {total} from members stay
							within {POST_POLL_LIMITS.maxOptions}.
						</span>
					</div>
				) : null}
			</Block>
		</div>
	);
}
