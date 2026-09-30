export type FieldLabels<TField extends string> = Record<TField, string>;

export function labelForField<TField extends string>(
	labels: FieldLabels<TField>,
	field: TField,
): string {
	return labels[field];
}

export const sortDirectionLabels = {
	asc: "Ascending",
	desc: "Descending",
} as const satisfies FieldLabels<"asc" | "desc">;
