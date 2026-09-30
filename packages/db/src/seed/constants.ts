/** Shared login for every seeded user (Better Auth min length is 7). */
export const SEED_PASSWORD = "bbrcpwd1" as const;

export const SEED_FAKER_SEED = 2_026_0330;

export const XP_AWARD = {
	participation: 3,
	feedback: 5,
	vote: 1,
} as const;

export type SeedProgress = "not_started" | "in_progress" | "completed" | "dnf";

export function rpDelta(
	progress: Extract<SeedProgress, "completed" | "dnf">,
	bookPages: number,
): number {
	if (progress === "completed") {
		return Math.round(bookPages / 10);
	}

	return -Math.round(1000 / bookPages);
}
