import { formatReadFinishedMonth } from "@bbrc/shared";

export function formatReadFinishedMonthField(
	readEndYear: number | null | undefined,
	readEndMonth: number | null | undefined,
): string {
	if (readEndYear == null || readEndMonth == null) {
		return "Finish month not set";
	}
	return formatReadFinishedMonth({ year: readEndYear, month: readEndMonth });
}
