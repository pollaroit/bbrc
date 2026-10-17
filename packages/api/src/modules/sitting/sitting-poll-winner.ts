import type { Database } from "@bbrc/db";

export async function pickPollWinningOptionId(
	pollId: string,
	db: Database,
): Promise<string> {
	const options = await db.pollOption.findMany({
		where: { pollId },
		select: { id: true },
	});

	if (options.length === 0) {
		throw new Error("Poll has no options");
	}

	const optionIds = options.map((option) => option.id);

	const pointTotals = await db.pollVote.groupBy({
		by: ["optionId"],
		where: { optionId: { in: optionIds } },
		_sum: { points: true },
	});

	const pointsByOptionId = new Map(
		pointTotals.map((row) => [row.optionId, row._sum.points ?? 0]),
	);

	let maxPoints = 0;
	for (const optionId of optionIds) {
		const points = pointsByOptionId.get(optionId) ?? 0;
		if (points > maxPoints) {
			maxPoints = points;
		}
	}

	const leaders = optionIds.filter(
		(optionId) => (pointsByOptionId.get(optionId) ?? 0) === maxPoints,
	);

	const index = Math.floor(Math.random() * leaders.length);
	const winnerId = leaders[index];

	if (!winnerId) {
		throw new Error("Could not pick a poll winner");
	}

	return winnerId;
}
