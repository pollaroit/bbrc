"use client";

/**
 * `RequestNoteField({ value, onChange, className? })`
 * The optional "Why this book?" note for a request (controlled, 200 characters).
 */

import { Field, FieldDescription, FieldLabel } from "@bbrc/ui/components/field";
import { Textarea } from "@bbrc/ui/components/textarea";
import { useId } from "react";
import { cn } from "@/lib/utils";

const MAX = 200;

export function RequestNoteField({
	value,
	onChange,
	className,
}: {
	value: string;
	onChange: (next: string) => void;
	className?: string;
}) {
	const id = useId();
	return (
		<Field className={cn(className)}>
			<FieldLabel htmlFor={id}>Why this book? (optional)</FieldLabel>
			<Textarea
				id={id}
				value={value}
				maxLength={MAX}
				rows={3}
				placeholder="A line for the admins: what made you think of it?"
				onChange={(event) => onChange(event.target.value)}
			/>
			<FieldDescription className="tabular-nums">
				Admins see this next to your request · {value.trim().length}/{MAX}
			</FieldDescription>
		</Field>
	);
}
