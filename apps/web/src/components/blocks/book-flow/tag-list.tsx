"use client";

import { Button } from "@bbrc/ui/components/button";
import { Field, FieldLabel } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { X } from "lucide-react";
import { useState } from "react";

/** A short list of tags that can be removed one by one. */
export function TagList({
	label,
	values,
	onChange,
	empty,
	action,
}: {
	label: string;
	values: string[];
	onChange: (next: string[]) => void;
	empty: string;
	action?: React.ReactNode;
}) {
	const [draft, setDraft] = useState("");
	const add = () => {
		const next = draft.trim();
		if (
			!next ||
			values.some((value) => value.toLowerCase() === next.toLowerCase())
		) {
			setDraft("");
			return;
		}
		onChange([...values, next]);
		setDraft("");
	};

	return (
		<Field>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<FieldLabel>{label}</FieldLabel>
				{action}
			</div>
			{values.length === 0 ? (
				<p className="text-muted-foreground text-xs">{empty}</p>
			) : (
				<ul className="flex flex-wrap gap-1.5">
					{values.map((value) => (
						<li
							key={value}
							className="inline-flex items-center gap-1 border border-border bg-muted/30 py-0.5 ps-2 pe-0.5 text-xs"
						>
							{value}
							<button
								type="button"
								className="p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
								aria-label={`Remove ${value}`}
								onClick={() =>
									onChange(values.filter((item) => item !== value))
								}
							>
								<X className="size-3" aria-hidden />
							</button>
						</li>
					))}
				</ul>
			)}
			<div className="flex gap-2">
				<Input
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault();
							add();
						}
					}}
					placeholder="Add and press Enter"
					className="h-8 text-sm"
				/>
				<Button type="button" variant="outline" size="sm" onClick={add}>
					Add
				</Button>
			</div>
		</Field>
	);
}
