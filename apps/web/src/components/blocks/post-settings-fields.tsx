"use client";

import { Switch } from "@bbrc/ui/components/switch";
import { useId } from "react";

export type PostSettings = {
	isSpoiler: boolean;
	allowLikes: boolean;
	allowComments: boolean;
	allowShares: boolean;
};

export const DEFAULT_POST_SETTINGS: PostSettings = {
	isSpoiler: false,
	allowLikes: true,
	allowComments: true,
	allowShares: true,
};

const rows: {
	key: keyof PostSettings;
	label: string;
	hint: string;
}[] = [
	{
		key: "isSpoiler",
		label: "Contains spoilers",
		hint: "The text stays hidden until someone taps to reveal it.",
	},
	{
		key: "allowLikes",
		label: "Allow likes",
		hint: "Members can like the post.",
	},
	{
		key: "allowComments",
		label: "Allow comments",
		hint: "Members can reply under the post.",
	},
	{
		key: "allowShares",
		label: "Allow sharing in posts",
		hint: "Members can share it inside their own posts. Links still work anywhere.",
	},
];

/** The switches that decide how members can interact with a post. */
export function PostSettingsFields({
	value,
	onChange,
	disabled = false,
}: {
	value: PostSettings;
	onChange: (next: PostSettings) => void;
	disabled?: boolean;
}) {
	const id = useId();

	return (
		<fieldset className="flex flex-col divide-y divide-border border border-border">
			<legend className="sr-only">Post settings</legend>
			{rows.map((row) => (
				<div
					key={row.key}
					className="flex items-center justify-between gap-4 px-3 py-2.5"
				>
					<label
						htmlFor={`${id}-${row.key}`}
						className="flex min-w-0 flex-col gap-0.5"
					>
						<span className="font-medium text-sm">{row.label}</span>
						<span className="text-muted-foreground text-xs">{row.hint}</span>
					</label>
					<Switch
						id={`${id}-${row.key}`}
						checked={value[row.key]}
						disabled={disabled}
						onCheckedChange={(checked) =>
							onChange({ ...value, [row.key]: checked })
						}
					/>
				</div>
			))}
		</fieldset>
	);
}
