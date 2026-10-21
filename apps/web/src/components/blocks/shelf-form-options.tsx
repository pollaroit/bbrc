"use client";

import { Archive, Check, Globe, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ShelfOption<T extends string> = {
	value: T;
	title: string;
	description: string;
	/** Small glyph shown beside the title. */
	icon?: ReactNode;
	/** Larger illustration shown above the title. */
	sketch?: ReactNode;
};

type ShelfOptionPickerProps<T extends string> = {
	name: string;
	label: string;
	description?: string;
	value: T;
	options: ShelfOption<T>[];
	onChange: (value: T) => void;
	columns?: 2 | 3;
};

export function ShelfOptionPicker<T extends string>({
	name,
	label,
	description,
	value,
	options,
	onChange,
	columns = 2,
}: ShelfOptionPickerProps<T>) {
	return (
		<div className="flex flex-col gap-3">
			<div className="space-y-1">
				<p id={`${name}-label`} className="font-medium text-sm">
					{label}
				</p>
				{description ? (
					<p className="text-muted-foreground text-sm leading-relaxed">
						{description}
					</p>
				) : null}
			</div>
			<div
				role="radiogroup"
				aria-labelledby={`${name}-label`}
				className={cn(
					"grid gap-2",
					columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
				)}
			>
				{options.map((option) => {
					const selected = value === option.value;
					return (
						<label
							key={option.value}
							className={cn(
								"relative flex cursor-pointer flex-col gap-2 border p-3.5 text-left transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50",
								selected
									? "border-foreground bg-muted/30"
									: "border-border hover:bg-muted/40",
							)}
						>
							<input
								type="radio"
								name={name}
								value={option.value}
								checked={selected}
								onChange={() => onChange(option.value)}
								className="sr-only"
							/>
							{option.sketch}
							<span className="flex items-center justify-between gap-2">
								<span className="flex items-center gap-2 font-medium text-sm leading-snug">
									{option.icon}
									{option.title}
								</span>
								{selected ? (
									<Check className="size-4 shrink-0" aria-hidden />
								) : null}
							</span>
							<span className="text-muted-foreground text-xs leading-relaxed">
								{option.description}
							</span>
						</label>
					);
				})}
			</div>
		</div>
	);
}

const iconClass = "size-4 text-muted-foreground";

/** Tiny stack of rows hinting at how the shelf page lays books out. */
function ListSketch({ ranked }: { ranked: boolean }) {
	return (
		<span className="flex flex-col gap-1" aria-hidden>
			{[1, 2, 3].map((n) => (
				<span key={n} className="flex items-center gap-1.5">
					<span className="w-3 text-center font-semibold text-[10px] text-muted-foreground tabular-nums">
						{ranked ? n : "•"}
					</span>
					<span className="h-2 flex-1 bg-muted-foreground/25" />
				</span>
			))}
		</span>
	);
}

export const shelfVisibilityCreateOptions = [
	{
		value: "draft",
		title: "Draft",
		description: "Only you see it while you add books and tweak the list.",
		icon: <Lock className={iconClass} aria-hidden />,
	},
	{
		value: "active",
		title: "Public",
		description: "Shows on your profile. Anyone can open the shelf page.",
		icon: <Globe className={iconClass} aria-hidden />,
	},
] as const satisfies ShelfOption<"draft" | "active">[];

export const shelfVisibilityEditOptions = [
	...shelfVisibilityCreateOptions,
	{
		value: "archived",
		title: "Archived",
		description: "Hidden from your profile. You can still open it by link.",
		icon: <Archive className={iconClass} aria-hidden />,
	},
] as const satisfies ShelfOption<"draft" | "active" | "archived">[];

export function shelfVisibilityOptionsForEdit(
	currentStatus: "draft" | "active" | "archived",
) {
	if (currentStatus === "draft") {
		return [...shelfVisibilityEditOptions];
	}
	return shelfVisibilityEditOptions.filter(
		(option) => option.value !== "draft",
	);
}

export const shelfTypeOptions = [
	{
		value: "unordered",
		title: "Simple list",
		description: "Books in the order you arrange them, no rank numbers.",
		sketch: <ListSketch ranked={false} />,
	},
	{
		value: "ordered",
		title: "Ranked list",
		description: "Shows 1, 2, 3 on the shelf page. Good for top picks.",
		sketch: <ListSketch ranked />,
	},
] as const satisfies ShelfOption<"ordered" | "unordered">[];
