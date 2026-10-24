"use client";

import {
	MAX_JOIN_UNTIL_PERCENT,
	MIN_JOIN_UNTIL_PERCENT,
	SITTING_JOIN_TYPE_LABELS,
	SITTING_JOIN_TYPES,
	type SittingJoinConfig,
} from "@bbrc/shared";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import { Globe, Link2, Lock } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/utils";

const JOIN_TYPE_ICONS = {
	public: Globe,
	unlisted: Link2,
	private: Lock,
} as const;

type SittingJoinSettingsFieldsProps = {
	value: SittingJoinConfig;
	onChange: (next: SittingJoinConfig) => void;
	disabled?: boolean;
	/** The real closing date of the reading window, once the deadline is known. */
	windowPreview?: string | null;
};

const PHASES = [
	{
		key: "joinInVoting",
		title: "Voting",
		hint: "While members vote for the book.",
	},
	{
		key: "joinInReading",
		title: "Reading",
		hint: "While the book is being read.",
	},
] as const;

/**
 * Who can join a sitting by themselves, and for how long. Organisers can always
 * add people by hand, whatever is chosen here.
 */
export function SittingJoinSettingsFields({
	value,
	onChange,
	disabled = false,
	windowPreview = null,
}: SittingJoinSettingsFieldsProps) {
	const uid = useId();
	const selfJoining = value.joinType !== "private";
	const phasesLocked = disabled || !selfJoining;

	return (
		<div className="flex flex-col gap-6">
			<fieldset className="flex flex-col gap-2" disabled={disabled}>
				<legend className="pb-1 font-medium text-sm">Who can join</legend>
				<div className="grid gap-2 sm:grid-cols-3">
					{SITTING_JOIN_TYPES.map((type) => {
						const Icon = JOIN_TYPE_ICONS[type];
						const copy = SITTING_JOIN_TYPE_LABELS[type];
						return (
							<label
								key={type}
								className={cn(
									"flex cursor-pointer flex-col gap-1.5 border p-3 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-ring",
									value.joinType === type
										? "border-foreground bg-muted/40"
										: "border-border hover:bg-muted/20",
									disabled && "cursor-not-allowed opacity-60",
								)}
							>
								<input
									type="radio"
									name={`${uid}-join-type`}
									value={type}
									checked={value.joinType === type}
									onChange={() => onChange({ ...value, joinType: type })}
									className="sr-only"
								/>
								<span className="flex items-center gap-2 font-medium text-sm">
									<Icon className="size-4" aria-hidden />
									{copy.label}
								</span>
								<span className="text-muted-foreground text-xs leading-relaxed">
									{copy.hint}
								</span>
							</label>
						);
					})}
				</div>
			</fieldset>

			<fieldset className="flex flex-col gap-2" disabled={phasesLocked}>
				<legend className="pb-1 font-medium text-sm">
					When people can join by themselves
				</legend>
				{!selfJoining ? (
					<p className="text-muted-foreground text-xs">
						Private sittings are never joined by members themselves, so these
						choices apply to Public and Unlisted sittings.
					</p>
				) : null}
				<div className="grid gap-2 sm:grid-cols-2">
					{PHASES.map((phase) => (
						<label
							key={phase.key}
							htmlFor={`${uid}-${phase.key}`}
							className={cn(
								"flex cursor-pointer items-start gap-3 border p-3 transition-colors",
								value[phase.key] && selfJoining
									? "border-foreground bg-muted/40"
									: "border-border hover:bg-muted/20",
								phasesLocked && "cursor-not-allowed opacity-60",
							)}
						>
							<Checkbox
								id={`${uid}-${phase.key}`}
								className="mt-0.5"
								checked={value[phase.key]}
								disabled={phasesLocked}
								onCheckedChange={(checked) =>
									onChange({ ...value, [phase.key]: checked === true })
								}
							/>
							<span className="flex flex-col gap-0.5">
								<span className="font-medium text-sm">{phase.title}</span>
								<span className="text-muted-foreground text-xs">
									{phase.hint}
								</span>
							</span>
						</label>
					))}
				</div>

				{value.joinInReading && selfJoining ? (
					<div className="mt-2 flex flex-col gap-2 border border-border p-3">
						<div className="flex items-baseline justify-between gap-3">
							<label htmlFor={`${uid}-percent`} className="font-medium text-sm">
								{value.joinReadingUntilPercent >= MAX_JOIN_UNTIL_PERCENT
									? "Joining stays open until the reading deadline"
									: `Joining closes after ${value.joinReadingUntilPercent}% of the reading period`}
							</label>
							<span className="font-heading font-semibold text-lg tabular-nums">
								{value.joinReadingUntilPercent}%
							</span>
						</div>
						<input
							id={`${uid}-percent`}
							type="range"
							min={MIN_JOIN_UNTIL_PERCENT}
							max={MAX_JOIN_UNTIL_PERCENT}
							step={5}
							value={value.joinReadingUntilPercent}
							disabled={phasesLocked}
							onChange={(event) =>
								onChange({
									...value,
									joinReadingUntilPercent: Number(event.target.value),
								})
							}
							className="w-full accent-primary"
						/>
						<p className="text-muted-foreground text-xs leading-relaxed">
							The reading deadline depends on the book the club picks, so it
							isn't known yet. A share of the reading period works whatever the
							book is: from the day reading starts to the deadline. Someone who
							joins late has less time to finish.
						</p>
						{windowPreview ? (
							<p className="font-medium text-xs">{windowPreview}</p>
						) : null}
					</div>
				) : null}
			</fieldset>

			<p className="text-muted-foreground text-xs leading-relaxed">
				Organisers can always add people by hand while voting or reading,
				whatever is set here.
			</p>
		</div>
	);
}
