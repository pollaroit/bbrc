import type { ProgressSchema } from "@bbrc/schemas";
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

export function progressChoicesForSitting(
	sittingStatus: "reading" | "finished" | "voting" | string,
): ParticipationProgress[] {
	const base: ParticipationProgress[] = [
		"not_started",
		"in_progress",
		"completed",
	];
	if (sittingStatus === "finished") {
		return [...base, "dnf"];
	}
	return base;
}

export function canMemberSelectProgress(
	current: ParticipationProgress,
	next: ParticipationProgress,
): boolean {
	if (next === "dnf") return false;
	if (current === next) return false;
	return memberTransitions[current].includes(next);
}

export function canAdminSelectProgress(
	sittingStatus: string,
	next: ParticipationProgress,
	current: ParticipationProgress,
): boolean {
	if (next === current) return false;
	if (next === "dnf" && sittingStatus !== "finished") return false;
	return true;
}
