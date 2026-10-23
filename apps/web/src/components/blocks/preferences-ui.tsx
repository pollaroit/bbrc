"use client";

import { Button } from "@bbrc/ui/components/button";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PreferencesSection({
	id,
	title,
	description,
	children,
}: {
	id: string;
	title: string;
	description: string;
	children: ReactNode;
}) {
	return (
		<section
			id={id}
			aria-labelledby={`${id}-heading`}
			className="flex scroll-mt-20 flex-col gap-5 border border-border px-4 py-5 sm:px-5"
		>
			<header className="space-y-1">
				<h2
					id={`${id}-heading`}
					className="font-semibold text-lg tracking-tight"
				>
					{title}
				</h2>
				<p className="text-muted-foreground text-sm leading-relaxed">
					{description}
				</p>
			</header>
			{children}
		</section>
	);
}

export function PreferenceRow({
	label,
	hint,
	children,
}: {
	label: string;
	hint?: ReactNode;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-2">
			<div className="space-y-0.5">
				<p className="font-medium text-sm">{label}</p>
				{hint ? (
					<p className="text-muted-foreground text-xs leading-relaxed">
						{hint}
					</p>
				) : null}
			</div>
			{children}
		</div>
	);
}

/** Groups related choices for screen readers (a fieldset with a hidden label). */
export function ChoiceGroup({
	label,
	className,
	children,
}: {
	label: string;
	className?: string;
	children: ReactNode;
}) {
	return (
		<fieldset className={cn("m-0 min-w-0 border-0 p-0", className)}>
			<legend className="sr-only">{label}</legend>
			{children}
		</fieldset>
	);
}

/** A row of mutually exclusive choices, shown as buttons. */
export function Segmented<T extends string>({
	label,
	value,
	options,
	onChange,
	disabled,
}: {
	label: string;
	value: T;
	options: readonly { id: T; label: string; hint?: string }[];
	onChange: (value: T) => void;
	disabled?: boolean;
}) {
	return (
		<ChoiceGroup label={label} className="flex flex-wrap gap-2">
			{options.map((option) => {
				const active = option.id === value;
				return (
					<Button
						key={option.id}
						type="button"
						size="sm"
						aria-pressed={active}
						variant={active ? "default" : "outline"}
						disabled={disabled}
						title={option.hint}
						onClick={() => onChange(option.id)}
					>
						{option.label}
					</Button>
				);
			})}
		</ChoiceGroup>
	);
}

/** One selectable card in a grid of choices (palettes, fonts). */
export function OptionCard({
	selected,
	onSelect,
	children,
	className,
	label,
}: {
	selected: boolean;
	onSelect: () => void;
	children: ReactNode;
	className?: string;
	label: string;
}) {
	return (
		<button
			type="button"
			aria-pressed={selected}
			aria-label={label}
			onClick={onSelect}
			className={cn(
				"flex flex-col gap-2 border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring",
				selected
					? "border-foreground bg-muted/40"
					: "border-border hover:bg-muted/30",
				className,
			)}
		>
			{children}
		</button>
	);
}
