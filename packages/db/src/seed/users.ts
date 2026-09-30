import { faker } from "@faker-js/faker";
import type { UserStatus } from "../../prisma/generated/client.js";
import type { Database } from "../index.js";

export type SeedUserSpec = {
	username: string;
	email: string;
	status: UserStatus;
	isAdmin: boolean;
};

export const SEED_USER_SPECS: SeedUserSpec[] = [
	{
		username: "admin_1",
		email: "admin_1@bbrc.test",
		status: "active",
		isAdmin: true,
	},
	{
		username: "admin_2",
		email: "admin_2@bbrc.test",
		status: "active",
		isAdmin: true,
	},
	{
		username: "admin_warned",
		email: "admin_warned@bbrc.test",
		status: "warned",
		isAdmin: true,
	},
	{
		username: "active_1",
		email: "active_1@bbrc.test",
		status: "active",
		isAdmin: false,
	},
	{
		username: "active_2",
		email: "active_2@bbrc.test",
		status: "active",
		isAdmin: false,
	},
	{
		username: "active_3",
		email: "active_3@bbrc.test",
		status: "active",
		isAdmin: false,
	},
	{
		username: "active_4",
		email: "active_4@bbrc.test",
		status: "active",
		isAdmin: false,
	},
	{
		username: "active_5",
		email: "active_5@bbrc.test",
		status: "active",
		isAdmin: false,
	},
	{
		username: "warned_1",
		email: "warned_1@bbrc.test",
		status: "warned",
		isAdmin: false,
	},
	{
		username: "warned_2",
		email: "warned_2@bbrc.test",
		status: "warned",
		isAdmin: false,
	},
	{
		username: "warned_3",
		email: "warned_3@bbrc.test",
		status: "warned",
		isAdmin: false,
	},
	{
		username: "banned_1",
		email: "banned_1@bbrc.test",
		status: "banned",
		isAdmin: false,
	},
	{
		username: "banned_2",
		email: "banned_2@bbrc.test",
		status: "banned",
		isAdmin: false,
	},
	{
		username: "banned_3",
		email: "banned_3@bbrc.test",
		status: "banned",
		isAdmin: false,
	},
	{
		username: "banned_4",
		email: "banned_4@bbrc.test",
		status: "banned",
		isAdmin: false,
	},
];

export async function seedUsers(
	db: Database,
	passwordHash: string,
	createdAt: Date,
) {
	const users = [];

	for (const spec of SEED_USER_SPECS) {
		const user = await db.user.create({
			data: {
				name: faker.person.fullName().slice(0, 30),
				username: spec.username,
				email: spec.email,
				emailVerified: true,
				isAdmin: spec.isAdmin,
				status: spec.status,
				xp: 0,
				rp: 0,
				createdAt,
				updatedAt: createdAt,
			},
		});

		await db.account.create({
			data: {
				userId: user.id,
				accountId: user.id,
				providerId: "credential",
				password: passwordHash,
				createdAt,
				updatedAt: createdAt,
			},
		});

		users.push(user);
	}

	return users;
}

export function eligibleParticipants(
	users: Awaited<ReturnType<typeof seedUsers>>,
): typeof users {
	return users.filter((user) => user.status !== "banned");
}
