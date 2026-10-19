import type { Database } from "@bbrc/db";
import { ORPCError } from "@orpc/server";
import { fetchOpenLibraryWorkTitlesByOlid } from "../../lib/open-library/work-titles";
import { notifyBookRequested } from "../notification/notification-triggers";
import { awardBookRequestXp } from "../xp/xp.service";
import type {
	CreateBookRequestInput,
	CreateBookRequestOutput,
	ListMyBookRequestsOutput,
	ListPendingBookRequestsOutput,
	RejectBookRequestInput,
	RejectBookRequestOutput,
} from "./book-request.schema";

export async function createBookRequest(
	input: CreateBookRequestInput,
	userId: string,
	isAdmin: boolean,
	db: Database,
): Promise<CreateBookRequestOutput> {
	if (isAdmin) {
		throw new ORPCError("FORBIDDEN", {
			message: "Admins add books directly; members can request titles instead.",
		});
	}

	const request = await db.$transaction(async (tx) => {
		const existingBook = await tx.book.findUnique({
			where: { olid: input.olid },
			select: { slug: true },
		});

		if (existingBook) {
			throw new ORPCError("CONFLICT", {
				message: "This book is already in the club library.",
				data: { olid: input.olid, slug: existingBook.slug },
			});
		}

		const pending = await tx.bookRequest.findFirst({
			where: { olid: input.olid, status: "pending" },
			select: { id: true },
		});

		if (pending) {
			throw new ORPCError("CONFLICT", {
				message: "This book already has a pending request.",
				data: { olid: input.olid },
			});
		}

		const created = await tx.bookRequest.create({
			data: {
				userId,
				olid: input.olid,
				title: input.title.trim(),
			},
			select: { id: true, olid: true, title: true },
		});

		await awardBookRequestXp({ userId, bookRequestId: created.id }, tx);

		return created;
	});

	void notifyBookRequested(db, request.id, userId, request.olid, request.title);

	return { id: request.id };
}

function requesterDisplayName(user: {
	name: string | null;
	username: string;
}): string {
	const name = user.name?.trim();
	return name && name.length > 0 ? name : user.username;
}

function resolveRequestTitle(
	storedTitle: string | null,
	olid: string,
	fetchedByOlid: Map<string, string | null>,
): string {
	const trimmed = storedTitle?.trim();
	if (trimmed) {
		return trimmed;
	}

	return fetchedByOlid.get(olid) ?? olid;
}

export async function listPendingBookRequests(
	db: Database,
): Promise<ListPendingBookRequestsOutput> {
	const rows = await db.bookRequest.findMany({
		where: { status: "pending" },
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		select: {
			id: true,
			olid: true,
			title: true,
			createdAt: true,
			user: {
				select: { username: true, name: true },
			},
		},
	});

	const missingOlids = [
		...new Set(rows.filter((row) => !row.title?.trim()).map((row) => row.olid)),
	];

	const fetchedByOlid =
		missingOlids.length > 0
			? await fetchOpenLibraryWorkTitlesByOlid(missingOlids)
			: new Map<string, string | null>();

	return {
		count: rows.length,
		items: rows.map((row) => ({
			id: row.id,
			olid: row.olid,
			title: resolveRequestTitle(row.title, row.olid, fetchedByOlid),
			createdAt: row.createdAt,
			requester: {
				username: row.user.username,
				name: requesterDisplayName(row.user),
			},
		})),
	};
}

export async function listMyBookRequests(
	userId: string,
	db: Database,
): Promise<ListMyBookRequestsOutput> {
	const rows = await db.bookRequest.findMany({
		where: { userId },
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		select: {
			id: true,
			olid: true,
			title: true,
			status: true,
			createdAt: true,
			acceptanceNotes: true,
			rejectionReason: true,
		},
	});

	const olids = [...new Set(rows.map((row) => row.olid))];
	const missingOlids = [
		...new Set(rows.filter((row) => !row.title?.trim()).map((row) => row.olid)),
	];

	const [fetchedByOlid, books] = await Promise.all([
		missingOlids.length > 0
			? fetchOpenLibraryWorkTitlesByOlid(missingOlids)
			: Promise.resolve(new Map<string, string | null>()),
		db.book.findMany({
			where: { olid: { in: olids } },
			select: { olid: true, slug: true },
		}),
	]);

	const slugByOlid = new Map(books.map((book) => [book.olid, book.slug]));

	return {
		count: rows.length,
		items: rows.map((row) => ({
			id: row.id,
			olid: row.olid,
			title: resolveRequestTitle(row.title, row.olid, fetchedByOlid),
			status: row.status,
			createdAt: row.createdAt,
			acceptanceNotes: row.acceptanceNotes,
			rejectionReason: row.rejectionReason,
			bookSlug: slugByOlid.get(row.olid) ?? null,
		})),
	};
}

export async function rejectBookRequest(
	input: RejectBookRequestInput,
	db: Database,
): Promise<RejectBookRequestOutput> {
	const request = await db.bookRequest.findUnique({
		where: { id: input.id },
		select: { id: true, status: true },
	});

	if (!request) {
		throw new ORPCError("NOT_FOUND", {
			message: "Book request not found",
		});
	}

	if (request.status !== "pending") {
		throw new ORPCError("BAD_REQUEST", {
			message: "Only pending requests can be rejected",
		});
	}

	await db.bookRequest.update({
		where: { id: input.id },
		data: {
			status: "rejected",
			rejectionReason: input.rejectionReason.trim(),
			acceptanceNotes: null,
		},
	});

	return { id: input.id };
}
