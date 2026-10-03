import type { Database } from "@bbrc/db";
import { ORPCError } from "@orpc/server";
import type {
	BlockOpenLibraryWorkInput,
	ListBlockedOpenLibraryWorksOutput,
} from "./book-recommendation-block.schema";

export async function listBlockedOpenLibraryWorks(
	db: Database,
): Promise<ListBlockedOpenLibraryWorksOutput> {
	const rows = await db.blockedOpenLibraryWork.findMany({
		orderBy: [{ createdAt: "desc" }, { olid: "desc" }],
		select: {
			olid: true,
			title: true,
			createdAt: true,
			blockedByUser: {
				select: { username: true, name: true },
			},
		},
	});

	return {
		count: rows.length,
		items: rows.map((row) => ({
			olid: row.olid,
			title: row.title,
			createdAt: row.createdAt,
			blockedBy: {
				username: row.blockedByUser.username,
				name: row.blockedByUser.name,
			},
		})),
	};
}

export async function blockOpenLibraryWork(
	input: BlockOpenLibraryWorkInput,
	userId: string,
	db: Database,
): Promise<{ olid: string }> {
	await db.blockedOpenLibraryWork.upsert({
		where: { olid: input.olid },
		create: {
			olid: input.olid,
			title: input.title?.trim() || null,
			blockedByUserId: userId,
		},
		update: {
			title: input.title?.trim() || null,
			blockedByUserId: userId,
		},
	});

	return { olid: input.olid };
}

export async function unblockOpenLibraryWork(
	olid: string,
	db: Database,
): Promise<{ olid: string }> {
	const deleted = await db.blockedOpenLibraryWork.deleteMany({
		where: { olid },
	});

	if (deleted.count === 0) {
		throw new ORPCError("NOT_FOUND", {
			message: "This work is not on the block list",
		});
	}

	return { olid };
}

export async function loadBlockedOpenLibraryOlids(
	db: Database,
): Promise<Set<string>> {
	const rows = await db.blockedOpenLibraryWork.findMany({
		select: { olid: true },
	});

	return new Set(rows.map((row) => row.olid));
}
