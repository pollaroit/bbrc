import type { Database } from "@bbrc/db";
import { ratingKey } from "@bbrc/shared";

export async function listMyRatingDefinitions(db: Database, userId: string) {
	const rows = await db.ratingDefinition.findMany({
		where: { userId },
		select: { ratingKey: true, text: true },
	});
	return {
		overrides: Object.fromEntries(rows.map((row) => [row.ratingKey, row.text])),
	};
}

export async function setRatingDefinition(
	db: Database,
	userId: string,
	input: { rating: number; text: string },
) {
	const key = ratingKey(input.rating);
	await db.ratingDefinition.upsert({
		where: { userId_ratingKey: { userId, ratingKey: key } },
		create: { userId, ratingKey: key, text: input.text },
		update: { text: input.text },
	});
	return { rating: input.rating, text: input.text };
}

/** Back to the default text: the row is removed, nothing is stored for a default. */
export async function resetRatingDefinition(
	db: Database,
	userId: string,
	input: { rating: number },
) {
	await db.ratingDefinition.deleteMany({
		where: { userId, ratingKey: ratingKey(input.rating) },
	});
	return { rating: input.rating, text: null };
}
