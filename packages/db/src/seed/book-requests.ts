import type { User } from "../../prisma/generated/client.js";
import type { Database } from "../index.js";
import {
	BOOK_REQUEST_SEARCH_QUERIES,
	searchOpenLibraryWorkByQuery,
} from "./open-library.js";

export async function seedBookRequests(
	db: Database,
	users: User[],
	catalogOlids: ReadonlySet<string>,
): Promise<number> {
	const requesters = users.filter(
		(user) => !user.isAdmin && user.status === "active",
	);

	if (requesters.length === 0) {
		return 0;
	}

	let created = 0;

	for (const query of BOOK_REQUEST_SEARCH_QUERIES) {
		if (created >= requesters.length) {
			break;
		}

		const work = await searchOpenLibraryWorkByQuery(query);
		if (!work || catalogOlids.has(work.olid)) {
			continue;
		}

		const existingPending = await db.bookRequest.findFirst({
			where: { olid: work.olid, status: "pending" },
			select: { id: true },
		});

		if (existingPending) {
			continue;
		}

		const requester = requesters[created];
		if (!requester) {
			break;
		}

		await db.bookRequest.create({
			data: {
				userId: requester.id,
				olid: work.olid,
				title: work.title,
				status: "pending",
			},
		});

		created += 1;
	}

	return created;
}
