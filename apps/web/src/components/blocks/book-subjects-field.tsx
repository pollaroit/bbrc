"use client";

/**
 * Subject tags for a book, as removable chips with an input to add more.
 *
 * - `value` / `onChange`  the current tags.
 * - `suggest`             optional slot (e.g. <SuggestSubjectsButton/>) shown beside the label.
 *
 * Enter or a comma adds the typed tag; Backspace on an empty box removes the last one.
 * Tags are trimmed, de-duplicated (ignoring case) and capped at 40.
 */

import {
	Field,
	FieldDescription,
	FieldLegend,
} from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { X } from "lucide-react";
import { type ReactNode, useId, useState } from "react";

const MAX_TAGS = 40;

export function BookSubjectsField({
	value,
	onChange,
	suggest,
}: {
	value: string[];
	onChange: (subjects: string[]) => void;
	suggest?: ReactNode;
}) {
	const id = useId();
	const [draft, setDraft] = useState("");

	function add(raw: string) {
		const tag = raw.trim().replace(/\s+/g, " ").slice(0, 80);
		if (!tag || value.length >= MAX_TAGS) return;
		if (value.some((entry) => entry.toLowerCase() === tag.toLowerCase())) {
			return;
		}
		onChange([...value, tag]);
	}

	return (
		<Field className="gap-2">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<FieldLegend variant="label">Subjects</FieldLegend>
				{suggest}
			</div>
			{value.length > 0 ? (
				<ul className="flex flex-wrap gap-1.5">
					{value.map((subject) => (
						<li
							key={subject}
							className="flex items-center gap-1 border border-border bg-muted/30 ps-2 text-xs"
						>
							{subject}
							<button
								type="button"
								aria-label={`Remove ${subject}`}
								className="flex size-6 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
								onClick={() => onChange(value.filter((tag) => tag !== subject))}
							>
								<X className="size-3" aria-hidden />
							</button>
						</li>
					))}
				</ul>
			) : (
				<p className="text-muted-foreground text-xs">No subjects yet.</p>
			)}
			<Input
				id={id}
				value={draft}
				placeholder={
					value.length >= MAX_TAGS ? "Tag limit reached" : "Add a subject…"
				}
				disabled={value.length >= MAX_TAGS}
				autoComplete="off"
				onChange={(event) => {
					const next = event.target.value;
					if (next.includes(",")) {
						for (const part of next.split(",")) add(part);
						setDraft("");
						return;
					}
					setDraft(next);
				}}
				onBlur={() => {
					add(draft);
					setDraft("");
				}}
				onKeyDown={(event) => {
					if (event.key === "Enter") {
						event.preventDefault();
						add(draft);
						setDraft("");
					} else if (
						event.key === "Backspace" &&
						draft === "" &&
						value.length
					) {
						onChange(value.slice(0, -1));
					}
				}}
			/>
			<FieldDescription>
				Press Enter or comma to add. Subjects help members find and group books.
			</FieldDescription>
		</Field>
	);
}
