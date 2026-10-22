import type { Database } from "@bbrc/db";
import { ORPCError } from "@orpc/server";
import { getBookPollSelect } from "../book/book.schema";
import {
	loadSeriesBooksStatusBySeriesId,
	wishlistBookEligibleForPoll,
} from "../series/series-poll-eligibility";
import type {
	CreateSittingPollInput,
	PreviewSittingPollOptionsOutput,
} from "./sitting.schema";
import { resolveWishlistPollBookWhere } from "./sitting-poll-book-where";
import {
	pickOneWeightedPollBookId,
	pickWeightedPollBookIds,
} from "./sitting-poll-weighted-selection";

export type PollDrawContext = {
	take: number;
	participantIds: string[];
	eligibleBookIds: string[];
	readCountByBookId: Map<string, number>;
};

export function resolvePollTake(poll: CreateSittingPollInput): number {
	return poll.take ?? 10;
}

export async function assertParticipantsExist(
	participantUserIds: string[],
	db: Database,
): Promise<string[]> {
	const uniqueParticipantIds = [...new Set(participantUserIds)];

	const users = await db.user.findMany({
		where: { id: { in: uniqueParticipantIds }, isHidden: false },
		select: { id: true },
	});

	if (users.length !== uniqueParticipantIds.length) {
		throw new ORPCError("BAD_REQUEST", {
			message: "One or more selected participants do not exist",
		});
	}

	return uniqueParticipantIds;
}

/**
 * How many wishlist books could appear on a poll with these filters. Unlike
 * `loadPollDrawContext` this never throws on a small pool, so the setup form
 * can show the count live while an admin adjusts filters.
 */
export async function countEligiblePollBooks(
	poll: CreateSittingPollInput,
	db: Database,
): Promise<number> {
	const bookWhere = await resolveWishlistPollBookWhere(poll, db);
	if (bookWhere == null) {
		return 0;
	}

	const wishlistBooks = await db.book.findMany({
		where: bookWhere,
		select: {
			id: true,
			readAfterPrerequisites: {
				select: { prerequisiteBook: { select: { status: true } } },
			},
			seriesMembership: { select: { position: true, seriesId: true } },
		},
	});

	const seriesIds = [
		...new Set(
			wishlistBooks.flatMap((book) =>
				book.seriesMembership ? [book.seriesMembership.seriesId] : [],
			),
		),
	];
	const seriesBooksBySeriesId = await loadSeriesBooksStatusBySeriesId(
		seriesIds,
		db,
	);

	return wishlistBooks.filter((book) =>
		wishlistBookEligibleForPoll(book, seriesBooksBySeriesId),
	).length;
}

export async function loadPollDrawContext(
	participantUserIds: string[],
	poll: CreateSittingPollInput,
	db: Database,
): Promise<PollDrawContext> {
	const participantIds = await assertParticipantsExist(participantUserIds, db);
	const take = resolvePollTake(poll);
	const bookWhere = await resolveWishlistPollBookWhere(poll, db);

	if (bookWhere == null) {
		throw new ORPCError("BAD_REQUEST", {
			message: "No wishlist books match the poll filters",
			data: { available: 0, take },
		});
	}

	const wishlistBooks = await db.book.findMany({
		where: bookWhere,
		select: {
			id: true,
			readAfterPrerequisites: {
				select: {
					prerequisiteBook: {
						select: { status: true },
					},
				},
			},
			seriesMembership: {
				select: {
					position: true,
					seriesId: true,
				},
			},
		},
	});

	const seriesIds = [
		...new Set(
			wishlistBooks.flatMap((book) =>
				book.seriesMembership ? [book.seriesMembership.seriesId] : [],
			),
		),
	];

	const seriesBooksBySeriesId = await loadSeriesBooksStatusBySeriesId(
		seriesIds,
		db,
	);

	const eligibleWishlistBooks = wishlistBooks.filter((book) =>
		wishlistBookEligibleForPoll(book, seriesBooksBySeriesId),
	);

	if (eligibleWishlistBooks.length < take) {
		throw new ORPCError("BAD_REQUEST", {
			message: `Not enough wishlist books match the poll filters (need at least ${take})`,
			data: { available: eligibleWishlistBooks.length, take },
		});
	}

	const eligibleBookIds = eligibleWishlistBooks.map((book) => book.id);
	const readCountByBookId = await loadParticipantReadCountsByBookId(
		participantIds,
		eligibleBookIds,
		db,
	);

	return {
		take,
		participantIds,
		eligibleBookIds,
		readCountByBookId,
	};
}

async function loadParticipantReadCountsByBookId(
	participantUserIds: string[],
	bookIds: string[],
	db: Database,
): Promise<Map<string, number>> {
	if (participantUserIds.length === 0 || bookIds.length === 0) {
		return new Map();
	}

	const readRows = await db.read.findMany({
		where: {
			userId: { in: participantUserIds },
			bookId: { in: bookIds },
		},
		select: { bookId: true },
	});

	const readCountByBookId = new Map<string, number>();
	for (const row of readRows) {
		readCountByBookId.set(
			row.bookId,
			(readCountByBookId.get(row.bookId) ?? 0) + 1,
		);
	}

	return readCountByBookId;
}

export function drawInitialPollBookIds(context: PollDrawContext): {
	bookIds: string[];
	usedUniformFallback: boolean;
} {
	return pickWeightedPollBookIds(
		context.eligibleBookIds,
		context.readCountByBookId,
		context.participantIds.length,
		context.take,
	);
}

export function drawReplacementPollBookId(
	context: PollDrawContext,
	currentOptionBookIds: string[],
	replaceBookId: string,
): { bookId: string; usedUniformFallback: boolean } {
	if (!currentOptionBookIds.includes(replaceBookId)) {
		throw new ORPCError("BAD_REQUEST", {
			message: "The book to replace is not in the current option list",
		});
	}

	const exclude = new Set(currentOptionBookIds);

	const result = pickOneWeightedPollBookId(
		context.eligibleBookIds,
		exclude,
		context.readCountByBookId,
		context.participantIds.length,
	);

	const { bookId, usedUniformFallback } = result;

	if (!bookId) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"No other eligible wishlist books are available for this replacement",
		});
	}

	return { bookId, usedUniformFallback };
}

export function shuffleUnlockedPollPreviewBookIds(
	context: PollDrawContext,
	currentOptionBookIds: string[],
	lockedBookIds: string[],
): {
	bookIds: string[];
	usedUniformFallback: boolean;
	partialShuffle: boolean;
} {
	const lockedSet = new Set(lockedBookIds);
	for (const bookId of lockedBookIds) {
		if (!currentOptionBookIds.includes(bookId)) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Locked book is not in the current option list",
			});
		}
	}

	if (new Set(lockedBookIds).size !== lockedBookIds.length) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Duplicate locked books are not allowed",
		});
	}

	const bookIds = [...currentOptionBookIds];
	let usedUniformFallback = false;
	let partialShuffle = false;

	for (let index = 0; index < bookIds.length; index++) {
		const currentBookId = bookIds[index];
		if (currentBookId == null || lockedSet.has(currentBookId)) {
			continue;
		}

		const exclude = new Set(bookIds);
		exclude.delete(currentBookId);

		const result = pickOneWeightedPollBookId(
			context.eligibleBookIds,
			exclude,
			context.readCountByBookId,
			context.participantIds.length,
		);

		if (result.usedUniformFallback) {
			usedUniformFallback = true;
		}

		if (!result.bookId) {
			partialShuffle = true;
			continue;
		}

		bookIds[index] = result.bookId;
	}

	return { bookIds, usedUniformFallback, partialShuffle };
}

type PollPreviewOption = PreviewSittingPollOptionsOutput["options"][number];

export async function loadPollPreviewBooks(
	bookIds: string[],
	readCountByBookId: Map<string, number>,
	db: Database,
): Promise<PollPreviewOption[]> {
	const books = await db.book.findMany({
		where: { id: { in: bookIds } },
		select: getBookPollSelect,
	});

	const byId = new Map(books.map((book) => [book.id, book]));

	return bookIds.flatMap((id) => {
		const book = byId.get(id);
		if (!book) {
			return [];
		}

		return [
			{
				book: book as PollPreviewOption["book"],
				participantReadCount: readCountByBookId.get(id) ?? 0,
			},
		];
	});
}

export async function assertValidPollOptionBookIds(
	optionBookIds: string[],
	context: PollDrawContext,
	db: Database,
): Promise<void> {
	const unique = new Set(optionBookIds);

	if (unique.size !== optionBookIds.length) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Poll options must not include duplicate books",
		});
	}

	if (optionBookIds.length !== context.take) {
		throw new ORPCError("BAD_REQUEST", {
			message: `Poll must have exactly ${context.take} options`,
			data: { expected: context.take, received: optionBookIds.length },
		});
	}

	const eligible = new Set(context.eligibleBookIds);
	for (const bookId of optionBookIds) {
		if (!eligible.has(bookId)) {
			throw new ORPCError("BAD_REQUEST", {
				message:
					"One or more poll options are not eligible wishlist books for this configuration",
			});
		}
	}

	const found = await db.book.count({
		where: { id: { in: optionBookIds } },
	});

	if (found !== optionBookIds.length) {
		throw new ORPCError("BAD_REQUEST", {
			message: "One or more poll option books were not found",
		});
	}
}
