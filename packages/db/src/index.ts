import { PrismaNeon } from "@prisma/adapter-neon";

import { type Prisma, PrismaClient } from "../prisma/generated/client";
import type { DatabaseConfig } from "./config";

export function createPrismaClient(env: DatabaseConfig) {
	const adapter = new PrismaNeon({
		connectionString: env.DATABASE_URL,
	});

	return new PrismaClient({ adapter });
}

export type Database = ReturnType<typeof createPrismaClient>;
/** Client passed to interactive `$transaction` callbacks (`tx`). */
export type DatabaseTransaction = Prisma.TransactionClient;

export { LONG_INTERACTIVE_TRANSACTION } from "./transaction-options";

export type { Prisma };
