import type { Database, Prisma } from "@bbrc/db";
import { normalizePreferences } from "@bbrc/shared";

export async function getMyPreferences(userId: string, db: Database) {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { preferences: true },
	});

	return {
		preferences:
			user?.preferences == null ? null : normalizePreferences(user.preferences),
	};
}

export async function updateMyPreferences(
	userId: string,
	input: { preferences: unknown },
	db: Database,
) {
	const preferences = normalizePreferences(input.preferences);

	await db.user.update({
		where: { id: userId },
		data: { preferences: preferences as unknown as Prisma.InputJsonValue },
		select: { id: true },
	});

	return { preferences };
}
