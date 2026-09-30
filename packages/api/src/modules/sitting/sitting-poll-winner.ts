import type { Database } from "@bbrc/db";

export async function pickPollWinningOptionId(
	pollId: string,
	db: Database,
): Promise<string> {
	const options = await db.pollOption.findMany({
		where: { pollId },
		select: {
			id: true,
			_count: { select: { votes: true } },
		},
	});

	if (options.length === 0) {
		throw new Error("Poll has no options");
	}

	const maxVotes = Math.max(...options.map((option) => option._count.votes));
	const leaders = options.filter((option) => option._count.votes === maxVotes);
	const index = Math.floor(Math.random() * leaders.length);
	const winner = leaders[index];

	if (!winner) {
		throw new Error("Could not pick a poll winner");
	}

	return winner.id;
}
