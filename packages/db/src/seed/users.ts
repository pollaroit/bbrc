import { faker } from "@faker-js/faker";
import type { Role } from "../../prisma/generated/client.js";
import type { Database } from "../index.js";

export type SeedUserSpec = {
	username: string;
	email: string;
	role: Role;
};

export const SEED_USER_SPECS: SeedUserSpec[] = [
	{
		username: "admin_1",
		email: "admin_1@bbrc.test",
		role: "super_admin",
	},
	{
		username: "admin_2",
		email: "admin_2@bbrc.test",
		role: "admin",
	},
	{
		username: "moderator_1",
		email: "moderator_1@bbrc.test",
		role: "moderator",
	},
	{
		username: "member_1",
		email: "member_1@bbrc.test",
		role: "user",
	},
	{
		username: "member_2",
		email: "member_2@bbrc.test",
		role: "user",
	},
	{
		username: "member_3",
		email: "member_3@bbrc.test",
		role: "user",
	},
	{
		username: "member_4",
		email: "member_4@bbrc.test",
		role: "user",
	},
	{
		username: "member_5",
		email: "member_5@bbrc.test",
		role: "user",
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
				role: spec.role,
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
