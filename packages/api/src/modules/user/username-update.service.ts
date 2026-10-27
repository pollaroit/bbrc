import type { Database } from "@bbrc/db";
import { getUsernameUpdateEligibility } from "@bbrc/shared";
import { appError } from "../../lib/app-error";
import type {
	GetUsernameUpdateStatusOutput,
	UpdateNameInput,
	UpdateNameOutput,
	UpdateUsernameInput,
	UpdateUsernameOutput,
} from "./username-update.schema";

function normalizeUsername(username: string): string {
	return username.trim().toLowerCase();
}

export async function getUsernameUpdateStatus(
	userId: string,
	db: Database,
): Promise<GetUsernameUpdateStatusOutput> {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: {
			username: true,
			usernameLastUpdatedAt: true,
		},
	});

	if (!user) {
		throw appError("NOT_FOUND", "user.notFound");
	}

	const eligibility = getUsernameUpdateEligibility(user.usernameLastUpdatedAt);

	return {
		username: user.username,
		usernameLastUpdatedAt: user.usernameLastUpdatedAt,
		canUpdate: eligibility.canUpdate,
		nextAllowedAt: eligibility.nextAllowedAt,
	};
}

export async function updateName(
	userId: string,
	input: UpdateNameInput,
	db: Database,
): Promise<UpdateNameOutput> {
	const nextName = input.name.trim();

	const user = await db.user.findUnique({
		where: { id: userId },
		select: {
			name: true,
			username: true,
		},
	});

	if (!user) {
		throw appError("NOT_FOUND", "user.notFound");
	}

	if (nextName === user.name) {
		throw appError("BAD_REQUEST", "user.nameUnchanged");
	}

	const updated = await db.user.update({
		where: { id: userId },
		data: {
			name: nextName,
		},
		select: {
			name: true,
			username: true,
		},
	});

	return {
		name: updated.name,
		username: updated.username,
	};
}

export async function updateUsername(
	userId: string,
	input: UpdateUsernameInput,
	db: Database,
): Promise<UpdateUsernameOutput> {
	const nextUsername = normalizeUsername(input.username);

	const user = await db.user.findUnique({
		where: { id: userId },
		select: {
			username: true,
			usernameLastUpdatedAt: true,
			status: true,
		},
	});

	if (!user) {
		throw appError("NOT_FOUND", "user.notFound");
	}

	if (user.status !== "active") {
		throw appError("FORBIDDEN", "user.usernameAccountBlocked");
	}

	if (nextUsername === user.username) {
		throw appError("BAD_REQUEST", "user.usernameUnchanged");
	}

	const eligibility = getUsernameUpdateEligibility(user.usernameLastUpdatedAt);
	if (!eligibility.canUpdate) {
		throw appError("FORBIDDEN", "user.usernameCooldown", {
			data: { nextAllowedAt: eligibility.nextAllowedAt?.toISOString() },
		});
	}

	const taken = await db.user.findUnique({
		where: { username: nextUsername },
		select: { id: true },
	});

	if (taken && taken.id !== userId) {
		throw appError("CONFLICT", "user.usernameTaken");
	}

	const updated = await db.user.update({
		where: { id: userId },
		data: {
			username: nextUsername,
			usernameLastUpdatedAt: new Date(),
		},
		select: {
			username: true,
			usernameLastUpdatedAt: true,
		},
	});

	if (!updated.usernameLastUpdatedAt) {
		throw appError("INTERNAL_SERVER_ERROR", "user.usernameUpdateFailed");
	}

	return {
		username: updated.username,
		usernameLastUpdatedAt: updated.usernameLastUpdatedAt,
	};
}
