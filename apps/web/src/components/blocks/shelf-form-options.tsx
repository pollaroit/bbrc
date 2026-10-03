"use client";

import { cn } from "@/lib/utils";

type ShelfOption<T extends string> = {
	value: T;
	title: string;
	description: string;
};

type ShelfOptionPickerProps<T extends string> = {
	name: string;
	label: string;
	description?: string;
	value: T;
	options: ShelfOption<T>[];
	onChange: (value: T) => void;
};

export function ShelfOptionPicker<T extends string>({
	name,
	label,
	description,
	value,
	options,
	onChange,
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
				className="grid gap-2 sm:grid-cols-2"
			>
				{options.map((option) => {
					const selected = value === option.value;
					return (
						<label
							key={option.value}
							className={cn(
								"flex cursor-pointer flex-col gap-1 border border-border p-4 text-left transition-colors",
								selected &&
									"border-foreground bg-muted/30 ring-1 ring-foreground",
								!selected && "hover:bg-muted/40",
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
							<span className="font-medium text-sm leading-snug">
								{option.title}
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

export const shelfVisibilityCreateOptions = [
	{
		value: "draft",
		title: "Draft",
		description: "Only you see it while you add books and tweak the list.",
	},
	{
		value: "active",
		title: "Public",
		description: "Shows on your profile. Anyone can open the shelf page.",
	},
] as const satisfies ShelfOption<"draft" | "active">[];

export const shelfVisibilityEditOptions = [
	...shelfVisibilityCreateOptions,
	{
		value: "archived",
		title: "Archived",
		description: "Hidden from your profile. You can still open it by link.",
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
		description: "Ordered by how you arrange books, without rank numbers.",
	},
	{
		value: "ordered",
		title: "Ranked list",
		description: "Shows 1, 2, 3 on the shelf page. Good for top picks.",
	},
] as const satisfies ShelfOption<"ordered" | "unordered">[];
