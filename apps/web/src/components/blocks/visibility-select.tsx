"use client";

import {
	VISIBILITY_DESCRIPTIONS,
	VISIBILITY_LABELS,
	VISIBILITY_LEVELS,
	type Visibility,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@bbrc/ui/components/popover";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@bbrc/ui/components/sheet";
import { Check, ChevronDown, Globe, Lock, Users } from "lucide-react";
import { useState } from "react";
import { useMediaQuery } from "@/lib/reading-mode/use-media-query";
import { cn } from "@/lib/utils";

const ICONS = { public: Globe, friends: Users, private: Lock } as const;

export function VisibilityIcon({
	level,
	className,
}: {
	level: Visibility;
	className?: string;
}) {
	const Icon = ICONS[level];
	return <Icon className={className} aria-hidden />;
}

type VisibilitySelectProps = {
	value: Visibility;
	onChange: (value: Visibility) => void;
	/** Levels to offer. Default: all. */
	levels?: readonly Visibility[];
	disabled?: boolean;
	size?: "sm" | "default";
	className?: string;
	/** A note under the options, for example about a private profile. */
	hint?: string;
	/** Name of the thing, for the accessible label: "Who can see this post". */
	label?: string;
};

function Options({
	value,
	levels,
	onPick,
	hint,
}: {
	value: Visibility;
	levels: readonly Visibility[];
	onPick: (level: Visibility) => void;
	hint?: string;
}) {
	return (
		<div className="flex flex-col gap-1">
			<fieldset className="m-0 flex min-w-0 flex-col border-0 p-0">
				<legend className="sr-only">Who can see this</legend>
				{levels.map((level) => {
					const selected = level === value;
					return (
						<button
							key={level}
							type="button"
							aria-pressed={selected}
							onClick={() => onPick(level)}
							className={cn(
								"flex items-start gap-3 px-3 py-2.5 text-left outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50",
								selected && "bg-muted/60",
							)}
						>
							<VisibilityIcon
								level={level}
								className="mt-0.5 size-4 shrink-0 text-muted-foreground"
							/>
							<span className="flex min-w-0 flex-1 flex-col">
								<span className="font-medium text-sm">
									{VISIBILITY_LABELS[level]}
								</span>
								<span className="text-muted-foreground text-xs">
									{VISIBILITY_DESCRIPTIONS[level]}
								</span>
							</span>
							{selected ? (
								<Check className="mt-0.5 size-4 shrink-0" aria-hidden />
							) : null}
						</button>
					);
				})}
			</fieldset>
			{hint ? (
				<p className="px-3 pt-1 pb-2 text-muted-foreground text-xs leading-relaxed">
					{hint}
				</p>
			) : null}
		</div>
	);
}

/** Who can see an item: a compact button that opens a popover (desktop) or a bottom sheet (phone). */
export function VisibilitySelect({
	value,
	onChange,
	levels = VISIBILITY_LEVELS,
	disabled,
	size = "sm",
	className,
	hint,
	label = "Who can see this",
}: VisibilitySelectProps) {
	const [open, setOpen] = useState(false);
	const isDesktop = useMediaQuery("(min-width: 768px)");

	const pick = (level: Visibility) => {
		onChange(level);
		setOpen(false);
	};

	const trigger = (
		<>
			<VisibilityIcon level={value} className="size-3.5" />
			<span>{VISIBILITY_LABELS[value]}</span>
			<ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
		</>
	);
	const ariaLabel = `${label}: ${VISIBILITY_LABELS[value]}`;

	if (isDesktop) {
		return (
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger
					disabled={disabled}
					aria-label={ariaLabel}
					render={
						<Button
							type="button"
							variant="outline"
							size={size}
							className={className}
						/>
					}
				>
					{trigger}
				</PopoverTrigger>
				<PopoverContent align="start" className="w-72 p-1">
					<Options value={value} levels={levels} onPick={pick} hint={hint} />
				</PopoverContent>
			</Popover>
		);
	}

	return (
		<>
			<Button
				type="button"
				variant="outline"
				size={size}
				className={className}
				disabled={disabled}
				aria-label={ariaLabel}
				aria-haspopup="dialog"
				onClick={() => setOpen(true)}
			>
				{trigger}
			</Button>
			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent side="bottom" className="pb-4">
					<SheetHeader>
						<SheetTitle>{label}</SheetTitle>
						<SheetDescription className="sr-only">
							Choose who can see it.
						</SheetDescription>
					</SheetHeader>
					<div className="px-1">
						<Options value={value} levels={levels} onPick={pick} hint={hint} />
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}

/** A small chip for cards. Nothing for public. */
export function VisibilityBadge({
	level,
	className,
}: {
	level?: Visibility | null;
	className?: string;
}) {
	if (!level || level === "public") return null;
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 border border-border px-1.5 py-0.5 text-muted-foreground text-xs leading-none",
				className,
			)}
			title={VISIBILITY_DESCRIPTIONS[level]}
		>
			<VisibilityIcon level={level} className="size-3" />
			{VISIBILITY_LABELS[level]}
		</span>
	);
}
