"use client";

import { ChoiceGroup } from "@/components/blocks/preferences-ui";
import { cn } from "@/lib/utils";

type SegmentedControlProps<T extends string> = {
	label: string;
	value: T;
	options: readonly { id: T; label: string; count?: number }[];
	onChange: (value: T) => void;
	className?: string;
};

/** One joined control for picking a single option: a row of segments in a shared frame. */
export function SegmentedControl<T extends string>({
	label,
	value,
	options,
	onChange,
	className,
}: SegmentedControlProps<T>) {
	return (
		<ChoiceGroup
			label={label}
			className={cn(
				"inline-flex w-fit max-w-full divide-x divide-border overflow-x-auto border border-border",
				className,
			)}
		>
			{options.map((option) => {
				const active = option.id === value;
				return (
					<button
						key={option.id}
						type="button"
						aria-pressed={active}
						onClick={() => onChange(option.id)}
						className={cn(
							"flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-sm transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ring",
							active
								? "bg-foreground text-background"
								: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
						)}
					>
						{option.label}
						{option.count != null ? (
							<span
								className={cn(
									"text-2xs tabular-nums",
									active ? "text-background/70" : "text-muted-foreground",
								)}
							>
								{option.count}
							</span>
						) : null}
					</button>
				);
			})}
		</ChoiceGroup>
	);
}
