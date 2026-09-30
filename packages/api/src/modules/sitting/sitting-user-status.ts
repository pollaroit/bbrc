import type { DatabaseTransaction } from "@bbrc/db";
import type { UserStatusSchema } from "@bbrc/schemas";
import type { z } from "zod";
import type { ParticipationProgress } from "./participation-progress";

type UserStatus = z.infer<typeof UserStatusSchema>;

export function nextUserStatusAfterParticipationProgress(
	current: UserStatus,
	progress: Extract<ParticipationProgress, "completed" | "dnf">,
): UserStatus {
	if (progress === "dnf") {
		if (current === "active") {
			return "warned";
		}
		if (current === "warned") {
			return "banned";
		}
		return current;
	}

	if (progress === "completed" && current === "warned") {
		return "active";
	}

	return current;
}

export async function applyUserStatusForParticipationProgress(
	userId: string,
	progress: Extract<ParticipationProgress, "completed" | "dnf">,
	db: DatabaseTransaction,
): Promise<UserStatus | null> {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { status: true },
	});

	if (!user) {
		return null;
	}

	const nextStatus = nextUserStatusAfterParticipationProgress(
		user.status,
		progress,
	);

	if (nextStatus === user.status) {
		return null;
	}

	await db.user.update({
		where: { id: userId },
		data: { status: nextStatus },
	});

	return nextStatus;
}
