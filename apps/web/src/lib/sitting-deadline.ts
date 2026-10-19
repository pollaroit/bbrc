import type { GetOngoingSittingOutput } from "@bbrc/api/modules/sitting/sitting.schema";

export function getSittingPhaseDeadline(
	sitting: NonNullable<GetOngoingSittingOutput>,
): Date | null {
	if (sitting.status === "voting" && sitting.pollDeadline) {
		return new Date(sitting.pollDeadline);
	}
	if (sitting.status !== "voting" && sitting.deadline) {
		return new Date(sitting.deadline);
	}
	return null;
}

export function getSittingPhaseDeadlineLabel(
	sitting: NonNullable<GetOngoingSittingOutput>,
): string {
	return sitting.status === "voting" ? "Poll closes" : "Reading deadline";
}

/** Elapsed fraction toward the current phase deadline (0–100), or null if unknown. */
export function getSittingDeadlineProgress(
	sitting: NonNullable<GetOngoingSittingOutput>,
	now = Date.now(),
): number | null {
	const end = getSittingPhaseDeadline(sitting);
	if (!end || Number.isNaN(end.getTime())) {
		return null;
	}

	const start = new Date(sitting.createdAt).getTime();
	const endMs = end.getTime();
	if (Number.isNaN(start) || endMs <= start) {
		return null;
	}

	const elapsed = now - start;
	const total = endMs - start;
	const ratio = Math.min(1, Math.max(0, elapsed / total));
	return Math.round(ratio * 100);
}
