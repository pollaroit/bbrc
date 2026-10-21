import type { Database } from "@bbrc/db";
import { getUsernameUpdateEligibility } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
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
		throw new ORPCError("NOT_FOUND", { message: "User not found" });
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
		throw new ORPCError("NOT_FOUND", { message: "User not found" });
	}

	if (nextName === user.name) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Choose a different name than your current one.",
		});
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
		throw new ORPCError("NOT_FOUND", { message: "User not found" });
	}

	if (user.status !== "active") {
		throw new ORPCError("FORBIDDEN", {
			message: "Your account cannot change its username right now.",
		});
	}

	if (nextUsername === user.username) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Choose a different username than your current one.",
		});
	}

	const eligibility = getUsernameUpdateEligibility(user.usernameLastUpdatedAt);
	if (!eligibility.canUpdate) {
		throw new ORPCError("FORBIDDEN", {
			message: "You can change your username again after the cooldown ends.",
			data: { nextAllowedAt: eligibility.nextAllowedAt?.toISOString() },
		});
	}

	const taken = await db.user.findUnique({
		where: { username: nextUsername },
		select: { id: true },
	});

	if (taken && taken.id !== userId) {
		throw new ORPCError("CONFLICT", {
			message: "That username is already taken.",
		});
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
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Username update did not complete.",
		});
	}

	return {
		username: updated.username,
		usernameLastUpdatedAt: updated.usernameLastUpdatedAt,
	};
}
