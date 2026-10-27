import type { ProgressSchema } from "@bbrc/schemas";
import type { z } from "zod";
import { appError } from "../../lib/app-error";

export type ParticipationProgress = z.infer<typeof ProgressSchema>;

const memberTransitions: Record<
	ParticipationProgress,
	readonly ParticipationProgress[]
> = {
	not_started: ["in_progress", "completed"],
	in_progress: ["completed"],
	completed: [],
	dnf: [],
};

export function assertMemberCanSetProgress(
	current: ParticipationProgress,
	next: ParticipationProgress,
): void {
	if (next === "dnf") {
		throw appError("BAD_REQUEST", "sitting.progress.dnfAutomatic");
	}

	if (current === next) {
		return;
	}

	if (!memberTransitions[current].includes(next)) {
		throw appError("BAD_REQUEST", "sitting.progress.changeNotAllowed", {
			params: { current, next },
			data: { current, next },
		});
	}
}

/** Maps participation progress to club user-status rules (completed vs dnf only). */
export function progressAffectsUserStatus(
	progress: ParticipationProgress,
): progress is "completed" | "dnf" {
	return progress === "completed" || progress === "dnf";
}
