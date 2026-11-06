/*
 * A book added by hand takes its page count and cover from its primary edition. When
 * that edition goes away, the oldest verified edition takes over (then the oldest of
 * any kind), so the book never has to guess its pages.
 */

export type PrimaryEditionCandidate = {
	id: string;
	status: "member" | "verified";
	createdAt: Date | string;
};

/** The edition that should become primary once `excludeId` is gone, or null when none is left. */
export function pickNextPrimaryEdition(
	candidates: readonly PrimaryEditionCandidate[],
	excludeId: string,
): string | null {
	const time = (value: Date | string) => new Date(value).getTime();
	const rest = candidates
		.filter((candidate) => candidate.id !== excludeId)
		.sort(
			(a, b) =>
				Number(b.status === "verified") - Number(a.status === "verified") ||
				time(a.createdAt) - time(b.createdAt),
		);
	return rest[0]?.id ?? null;
}
