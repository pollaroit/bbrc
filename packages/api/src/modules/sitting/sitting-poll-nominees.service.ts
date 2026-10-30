import type { Database } from "@bbrc/db";
import { type PollNomineeFilter, pollNomineeReasons } from "@bbrc/shared";
import { getBookPollSelect } from "../book/book.schema";
import {
	buildBookTextSearchWhere,
	findBookIdsByAuthorNameSearch,
} from "../book/book-list-search";
import { prerequisitesSatisfiedForPoll } from "../book/book-reading-prerequisites";
import {
	loadSeriesBooksStatusBySeriesId,
	seriesPriorBooksSatisfiedForPoll,
} from "../series/series-poll-eligibility";
import type {
	CreateSittingPollInput,
	PreviewSittingPollOptionsOutput,
} from "./sitting.schema";
import { resolveWishlistPollBookWhere } from "./sitting-poll-book-where";
import type {
	SearchPollNomineesInput,
	SearchPollNomineesOutput,
} from "./sitting-poll-nominees.schema";
import {
	assertParticipantsExist,
	loadParticipantReadCountsByBookId,
} from "./sitting-poll-pool";

type PollOption = PreviewSittingPollOptionsOutput["options"][number];

/** Which poll settings each filter name stands for, to test one at a time. */
const FILTER_FIELDS: Record<
	PollNomineeFilter,
	(keyof CreateSittingPollInput)[]
> = {
	pages: ["minPages", "maxPages"],
	published_year: ["minPublishedIn", "maxPublishedIn"],
	rating: ["minOpenLibraryRating"],
	country: ["countries"],
	author: ["authors"],
	reads: ["minReads", "maxReads"],
};

function isSet(value: unknown): boolean {
	return Array.isArray(value) ? value.length > 0 : value != null;
}

async function idsFittingFilters(
	poll: CreateSittingPollInput,
	bookIds: string[],
	db: Database,
): Promise<Set<string>> {
	if (bookIds.length === 0) return new Set();
	const where = await resolveWishlistPollBookWhere(poll, db);
	if (where == null) return new Set();
	const rows = await db.book.findMany({
		where: { AND: [where, { id: { in: bookIds } }] },
		select: { id: true },
	});
	return new Set(rows.map((row) => row.id));
}

/**
 * Books for an admin to nominate directly. The whole library is searched, and each
 * book comes back with the reasons it cannot go on the poll (decided here, by the
 * same rules that draw the poll: wishlist status, the poll filters, series order
 * and prerequisites). A book some participants have already read is allowed:
 * its read count is returned so the screen can warn.
 */
export async function searchPollNominees(
	input: SearchPollNomineesInput,
	db: Database,
): Promise<SearchPollNomineesOutput> {
	const participantIds = await assertParticipantsExist(
		input.participantUserIds,
		db,
	);
	const authorBookIds = await findBookIdsByAuthorNameSearch(db, input.query);
	const books = await db.book.findMany({
		where: buildBookTextSearchWhere(input.query, authorBookIds),
		orderBy: [{ title: "asc" }],
		take: input.limit,
		select: {
			...getBookPollSelect,
			status: true,
			readAfterPrerequisites: {
				select: { prerequisiteBook: { select: { status: true } } },
			},
			seriesMembership: { select: { position: true, seriesId: true } },
		},
	});

	const bookIds = books.map((book) => book.id);
	const wishlistIds = books
		.filter((book) => book.status === "wishlist")
		.map((book) => book.id);

	const [readCounts, fitting, seriesBooks] = await Promise.all([
		loadParticipantReadCountsByBookId(participantIds, bookIds, db),
		idsFittingFilters(input.poll, wishlistIds, db),
		loadSeriesBooksStatusBySeriesId(
			[
				...new Set(
					books.flatMap((book) =>
						book.seriesMembership ? [book.seriesMembership.seriesId] : [],
					),
				),
			],
			db,
		),
	]);

	// Which filter is to blame: clear one at a time and see who then fits.
	const failing = wishlistIds.filter((id) => !fitting.has(id));
	const blame = new Map<string, PollNomineeFilter[]>();
	if (failing.length > 0) {
		for (const filter of Object.keys(FILTER_FIELDS) as PollNomineeFilter[]) {
			const fields = FILTER_FIELDS[filter];
			if (!fields.some((field) => isSet(input.poll[field]))) continue;
			const relaxed: CreateSittingPollInput = { ...input.poll };
			for (const field of fields) {
				(relaxed as Record<string, unknown>)[field] = undefined;
			}
			for (const id of await idsFittingFilters(relaxed, failing, db)) {
				blame.set(id, [...(blame.get(id) ?? []), filter]);
			}
		}
	}

	const inPoll = new Set(input.currentOptionBookIds);

	return {
		participantCount: participantIds.length,
		items: books.map((book) => {
			const membership = book.seriesMembership;
			const reasons = pollNomineeReasons({
				inPoll: inPoll.has(book.id),
				onWishlist: book.status === "wishlist",
				seriesOrderOk:
					!membership ||
					seriesPriorBooksSatisfiedForPoll(
						membership.position,
						seriesBooks.get(membership.seriesId) ?? [],
					),
				prerequisitesOk: prerequisitesSatisfiedForPoll(
					book.readAfterPrerequisites.map((row) => row.prerequisiteBook),
				),
				fitsFilters: fitting.has(book.id),
			});
			const {
				status: _status,
				readAfterPrerequisites: _p,
				seriesMembership: _s,
				...rest
			} = book;
			const option: PollOption = {
				book: rest as PollOption["book"],
				participantReadCount: readCounts.get(book.id) ?? 0,
			};
			return {
				option,
				reasons,
				filters: blame.get(book.id) ?? [],
			};
		}),
	};
}
