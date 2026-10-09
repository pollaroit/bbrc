/** Keeps month Select controlled when no month is chosen. */
export const READ_DATE_MONTH_UNSET = "__month_unset__";

export const READ_DATE_MONTHS = [
	{ value: "1", label: "January" },
	{ value: "2", label: "February" },
	{ value: "3", label: "March" },
	{ value: "4", label: "April" },
	{ value: "5", label: "May" },
	{ value: "6", label: "June" },
	{ value: "7", label: "July" },
	{ value: "8", label: "August" },
	{ value: "9", label: "September" },
	{ value: "10", label: "October" },
	{ value: "11", label: "November" },
	{ value: "12", label: "December" },
] as const;

export function readDateMonthLabel(month: string): string | undefined {
	if (!month.trim()) {
		return undefined;
	}
	return READ_DATE_MONTHS.find((entry) => entry.value === month)?.label;
}
