import type { ProgressSchema } from "@bbrc/schemas";
import { ORPCError } from "@orpc/server";
import type { z } from "zod";

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
		throw new ORPCError("BAD_REQUEST", {
			message: "DNF is applied automatically when a sitting ends",
		});
	}

	if (current === next) {
		return;
	}

	if (!memberTransitions[current].includes(next)) {
		throw new ORPCError("BAD_REQUEST", {
			message: `Cannot change progress from ${current} to ${next}`,
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
