import { orpc, queryClient } from "@/utils/orpc";

type Progress = "not_started" | "in_progress" | "completed" | "dnf";

/**
 * Shows a reading-status change on the sitting page before the server
 * answers: the member's row, the progress counters and, for the viewer's own
 * change, their personal sitting state. Returns what to put back on failure.
 */
export async function applyProgressOptimistically(
	sittingSlug: string,
	userId: string,
	next: Progress,
	options: { self: boolean },
) {
	const sittingKey = orpc.sitting.getSittingBySlug.queryKey({
		input: sittingSlug,
	});
	const myStateKey = orpc.sitting.getMySittingState.queryKey({
		input: sittingSlug,
	});

	await Promise.all([
		queryClient.cancelQueries({ queryKey: sittingKey }),
		queryClient.cancelQueries({ queryKey: myStateKey }),
	]);

	const previousSitting = queryClient.getQueryData(sittingKey);
	const previousMyState = queryClient.getQueryData(myStateKey);

	queryClient.setQueryData(sittingKey, (old) => {
		if (!old) {
			return old;
		}
		const before = old.participants.find(
			(person) => person.userId === userId,
		)?.progress;
		if (!before || before === next) {
			return old;
		}

		return {
			...old,
			participants: old.participants.map((person) =>
				person.userId === userId ? { ...person, progress: next } : person,
			),
			stats: {
				...old.stats,
				progressCounts: {
					...old.stats.progressCounts,
					[before]: Math.max(0, old.stats.progressCounts[before] - 1),
					[next]: old.stats.progressCounts[next] + 1,
				},
			},
		};
	});

	if (options.self) {
		queryClient.setQueryData(myStateKey, (old) =>
			old ? { ...old, progress: next } : old,
		);
	}

	return { previousSitting, previousMyState, sittingKey, myStateKey };
}

export function restoreProgress(
	snapshot: Awaited<ReturnType<typeof applyProgressOptimistically>> | undefined,
) {
	if (!snapshot) {
		return;
	}
	queryClient.setQueryData(snapshot.sittingKey, snapshot.previousSitting);
	queryClient.setQueryData(snapshot.myStateKey, snapshot.previousMyState);
}
