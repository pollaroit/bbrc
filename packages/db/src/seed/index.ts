import { faker } from "@faker-js/faker";
import { hashPassword } from "better-auth/crypto";
import { ENV } from "../env.js";
import { createPrismaClient } from "../index.js";
import { assertDevSeedEnvironment } from "./assert-dev.js";
import { SEED_FAKER_SEED, SEED_PASSWORD } from "./constants.js";
import { fetchOpenLibraryBooks } from "./open-library.js";
import { seedPostsAndComments } from "./posts.js";
import { resetDatabase } from "./reset.js";
import { seedBooksAndSittings } from "./sittings.js";
import { SEED_USER_SPECS, seedUsers } from "./users.js";

async function main() {
	assertDevSeedEnvironment();

	faker.seed(SEED_FAKER_SEED);

	const db = createPrismaClient({ DATABASE_URL: ENV.DATABASE_URL });

	try {
		const passwordHash = await hashPassword(SEED_PASSWORD);
		const baseCreatedAt = faker.date.past({ years: 1 });

		console.log("Clearing existing data…");
		await resetDatabase(db);

		console.log("Creating users…");
		const users = await seedUsers(db, passwordHash, baseCreatedAt);

		console.log("Fetching books from Open Library…");
		const works = await fetchOpenLibraryBooks(20);

		console.log("Creating books, sittings, polls, votes, XP/RP, and feedback…");
		const { books, sittings } = await seedBooksAndSittings(db, users, works);

		console.log("Creating posts, comments, and likes…");
		const { posts, comments } = await seedPostsAndComments(
			db,
			users,
			books,
			baseCreatedAt,
		);

		const finished = sittings.filter((s) => s.status === "finished").length;
		const active = sittings.filter((s) => s.status !== "finished").length;

		console.log("");
		console.log("Seed complete.");
		console.log(
			`  Users: ${users.length} (${SEED_USER_SPECS.length} configured)`,
		);
		console.log(`  Books: ${books.length}`);
		console.log(
			`  Sittings: ${sittings.length} (${finished} finished, ${active} active)`,
		);
		console.log(`  Posts: ${posts.length}, comments: ${comments.length}`);
		console.log("");
		console.log("Dev login for every seeded account:");
		console.log(`  Password: ${SEED_PASSWORD}`);
		console.log("  Examples:");
		for (const spec of SEED_USER_SPECS.slice(0, 4)) {
			console.log(`    ${spec.email} (@${spec.username})`);
		}
		console.log("  …see packages/db/src/seed/users.ts for the full list.");
	} finally {
		await db.$disconnect();
	}
}

main().catch((error: unknown) => {
	console.error(error);
	process.exit(1);
});
