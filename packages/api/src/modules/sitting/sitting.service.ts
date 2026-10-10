import type { Session } from "@bbrc/auth";
import type { Database, DatabaseTransaction, Prisma } from "@bbrc/db";
import { LONG_INTERACTIVE_TRANSACTION } from "@bbrc/db";
import {
	calculateSittingReadingDeadline,
	clampSittingDeadlineToClubEnd,
	computeMidtermAt,
	defaultPollDeadline,
	formatSittingDisplayName,
	generateSlug,
	generateUniqueSlug,
	resolveClubTimeZone,
	sittingReadingDeadlinePlaceholder,
	snapPollDeadlineOnOrAfter,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import {
	telegramAnnouncePollOpen,
	telegramAnnounceReadingStarted,
	telegramAnnounceSittingFinished,
	telegramSendReadingProgressPoll,
} from "../../lib/telegram/sitting-announcements";
import { definePagination } from "../../utils/pagination";
import { mergeWhereFragments } from "../../utils/searching";
import { getBookListFields } from "../book/book.schema";
import { loadLikedFeedbackIdsForViewer } from "../feedback/feedback.service";
import {
	notifyParticipantFinishedBook,
	notifySittingFinished,
	notifySittingPollClosed,
	notifySittingPollStarted,
} from "../notification/notification-triggers";
import {
	ensureReadForSittingCompletion,
	syncParticipationWithExistingReadsForSelectedBook,
} from "../read/read.service";
import { calculateRpPointsDelta } from "../rp/rp.service";
import { XP_AWARD } from "../xp/xp.schema";
import { awardParticipationXp, awardPollVoteXp } from "../xp/xp.service";
import {
	activeParticipationWhere,
	countActiveParticipantsForSitting,
} from "./participation-active";
import {
	assertMemberCanSetProgress,
	progressAffectsUserStatus,
} from "./participation-progress";
import {
	sittingListRanging,
	sittingListSearching,
	sittingListSorting,
	sittingOngoingWhere,
} from "./sitting.listing";
import {
	buildSittingPollSlug,
	type CreateSittingInput,
	type CreateSittingOutput,
	type GetOngoingSittingOutput,
	type GetPollOptionReadersInput,
	type GetPollOptionReadersOutput,
	type GetPollOptionVotesInput,
	type GetPollOptionVotesOutput,
	type GetPollVotesByUserInput,
	type GetPollVotesByUserOutput,
	type GetSittingBySlugOutput,
	type GetSittingListInput,
	type GetSittingListOutput,
	type GetSittingPollPreviewReadersInput,
	getSittingBySlugFields,
	getSittingListFields,
	getSittingRemovedParticipantFields,
	type PreviewSittingPollOptionsInput,
	type PreviewSittingPollOptionsOutput,
	type ReplaceSittingPollPreviewOptionInput,
	type ReplaceSittingPollPreviewOptionOutput,
	type ResendSittingTelegramPollOpenInput,
	type ResendSittingTelegramPollOpenOutput,
	type SendSittingTelegramProgressPollInput,
	type SendSittingTelegramProgressPollOutput,
	type SittingParticipantMutationInput,
	type SittingParticipantMutationOutput,
	type SubmitPollVotesInput,
	type SubmitPollVotesOutput,
	type TransitionSittingInput,
	type TransitionSittingOutput,
	type UpdateMyParticipationProgressInput,
	type UpdateMyParticipationProgressOutput,
	type UpdateParticipationInput,
	type UpdateParticipationOutput,
	type UpdateSittingDeadlinesInput,
	type UpdateSittingDeadlinesOutput,
} from "./sitting.schema";
import { applyFinishedSittingParticipantEffects } from "./sitting-finish-participant-effects";
import {
	assertParticipantsExist,
	assertValidPollOptionBookIds,
	drawInitialPollBookIds,
	drawReplacementPollBookId,
	loadPollDrawContext,
	loadPollPreviewBooks,
} from "./sitting-poll-pool";
import { createPollInputToStoredFilters } from "./sitting-poll-stored-filters";
import {
	cancelSittingReadingTelegramJobs,
	syncSittingReadingTelegramJobs,
} from "./sitting-qstash.service";
import { applyUserStatusForParticipationProgress } from "./sitting-user-status";

type SittingListRow = Prisma.SittingGetPayload<{
	select: typeof getSittingListFields;
}>;

type SittingDetailRow = Prisma.SittingGetPayload<{
	select: typeof getSittingBySlugFields;
}>;

const sittingListCursorCodec = {
	decode(cursor: string): { slug: string } {
		return { slug: cursor };
	},
	encode(item: SittingListRow): string {
		return item.slug;
	},
};

const SITTING_SLUG_WORDS = [
	"amber",
	"azure",
	"coral",
	"crimson",
	"golden",
	"indigo",
	"ivory",
	"jade",
	"quiet",
	"silver",
	"velvet",
	"wild",
] as const;

const SITTING_SLUG_NOUNS = [
	"circle",
	"gathering",
	"round",
	"session",
	"sitting",
	"table",
] as const;

async function loadParticipantReadCountsByBookId(
	participantUserIds: string[],
	bookIds: string[],
	db: Database,
): Promise<Map<string, number>> {
	if (participantUserIds.length === 0 || bookIds.length === 0) {
		return new Map();
	}

	const rows = await db.read.groupBy({
		by: ["bookId"],
		where: {
			userId: { in: participantUserIds },
			bookId: { in: bookIds },
		},
		_count: { _all: true },
	});

	return new Map(rows.map((row) => [row.bookId, row._count._all]));
}

function randomSittingSlugSeed(): string {
	const word =
		SITTING_SLUG_WORDS[Math.floor(Math.random() * SITTING_SLUG_WORDS.length)] ??
		"sitting";
	const noun =
		SITTING_SLUG_NOUNS[Math.floor(Math.random() * SITTING_SLUG_NOUNS.length)] ??
		"session";
	const suffix = Math.floor(Math.random() * 9000 + 1000);

	return generateSlug(`${word}_${noun}_${suffix}`);
}

function withStableSlugOrderBy(
	orderBy: Prisma.SittingOrderByWithRelationInput,
	sortDirection: "asc" | "desc",
): Prisma.SittingOrderByWithRelationInput[] {
	return [orderBy, { slug: sortDirection }];
}

async function generateSittingSlug(db: DatabaseTransaction): Promise<string> {
	try {
		return await generateUniqueSlug(randomSittingSlugSeed(), async (slug) => {
			const existing = await db.sitting.findUnique({
				where: { slug },
				select: { id: true },
			});
			return existing == null;
		});
	} catch {
		throw new ORPCError("CONFLICT", {
			message: "Failed to generate a unique sitting slug",
		});
	}
}

async function assertPollSlugAvailable(
	slug: string,
	db: DatabaseTransaction,
): Promise<void> {
	const existing = await db.poll.findUnique({
		where: { slug },
		select: { id: true },
	});

	if (existing) {
		throw new ORPCError("CONFLICT", {
			message: "Failed to generate a unique poll slug",
			data: { slug },
		});
	}
}

function mapSittingListRow(row: SittingListRow) {
	return {
		slug: row.slug,
		status: row.status,
		deadline: row.deadline,
		createdAt: row.createdAt,
		participantCount: row._count.participants,
		displayName: formatSittingDisplayName(
			row.slug,
			row.status,
			row.selectedBook?.title,
		),
	};
}

function mapSittingDetail(
	row: SittingDetailRow,
	myVoteOptionIds: string[],
	reviews: GetSittingBySlugOutput["reviews"],
	pollVoterCount: number,
	removedParticipants: GetSittingBySlugOutput["removedParticipants"],
	participantReadCountByBookId: Map<string, number>,
	viewerReadBookIds: ReadonlySet<string>,
): GetSittingBySlugOutput {
	const bookPages = row.selectedBook?.pages ?? null;

	return {
		slug: row.slug,
		status: row.status,
		deadline: row.deadline,
		createdAt: row.createdAt,
		displayName: formatSittingDisplayName(
			row.slug,
			row.status,
			row.selectedBook?.title,
		),
		selectedBook: row.selectedBook,
		poll: row.poll
			? {
					slug: row.poll.slug,
					deadline: row.poll.deadline,
					minPages: row.poll.minPages,
					maxPages: row.poll.maxPages,
					minPublishedIn: row.poll.minPublishedIn,
					maxPublishedIn: row.poll.maxPublishedIn,
					minOpenLibraryRating: row.poll.minOpenLibraryRating,
					minReads: row.poll.minReads,
					maxReads: row.poll.maxReads,
					countries: row.poll.filterCountries,
					authors: row.poll.filterAuthorSlugs,
					take: row.poll.take,
					minChoices: row.poll.minChoices,
					maxChoices: row.poll.maxChoices,
					options: row.poll.options.map((option) => ({
						id: option.id,
						voteCount: option._count.votes,
						participantReadCount:
							participantReadCountByBookId.get(option.book.id) ?? 0,
						viewerHasRead: viewerReadBookIds.has(option.book.id),
						book: option.book,
					})),
					myVoteOptionIds,
					voterCount: pollVoterCount,
				}
			: null,
		reviews,
		participants: row.participants.map((participation) => {
			let rpChange: number | null = null;

			if (
				row.status === "finished" &&
				bookPages != null &&
				progressAffectsUserStatus(participation.progress)
			) {
				rpChange = calculateRpPointsDelta(participation.progress, bookPages);
			}

			return {
				userId: participation.userId,
				username: participation.user.username,
				name: participation.user.name,
				image: participation.user.image,
				status: participation.user.status,
				progress: participation.progress,
				rpChange,
			};
		}),
		removedParticipants,
	};
}

async function loadSittingReviews(
	bookId: string,
	participantUserIds: string[],
	db: Database,
	viewerUserId: string | null,
): Promise<GetSittingBySlugOutput["reviews"]> {
	if (participantUserIds.length === 0) {
		return [];
	}

	const feedbacks = await db.feedback.findMany({
		where: {
			bookId,
			authorId: { in: participantUserIds },
		},
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			slug: true,
			rating: true,
			review: true,
			createdAt: true,
			authorId: true,
			author: {
				select: {
					username: true,
					name: true,
					image: true,
				},
			},
			_count: {
				select: {
					likes: true,
					comments: true,
				},
			},
		},
	});

	const likedFeedbackIds = await loadLikedFeedbackIdsForViewer(
		feedbacks.map((row) => row.id),
		viewerUserId,
		db,
	);

	return feedbacks.map((feedback) => ({
		slug: feedback.slug,
		authorId: feedback.authorId,
		username: feedback.author.username,
		name: feedback.author.name,
		image: feedback.author.image,
		rating: feedback.rating,
		review: feedback.review,
		createdAt: feedback.createdAt,
		likeCount: feedback._count.likes,
		likedByMe: likedFeedbackIds.has(feedback.id),
		commentCount: feedback._count.comments,
	}));
}

async function loadMyPollVoteOptionIds(
	pollId: string,
	userId: string,
	db: Database,
): Promise<string[]> {
	const votes = await db.pollVote.findMany({
		where: {
			userId,
			option: { pollId },
		},
		select: { optionId: true },
	});

	return votes.map((vote) => vote.optionId);
}

export async function getSittingList(
	input: GetSittingListInput,
	db: Database,
): Promise<GetSittingListOutput> {
	const pagination = definePagination.cursor(input, sittingListCursorCodec);
	const sorting = sittingListSorting.from(input);
	const ranging = sittingListRanging.from(input);
	const searching = sittingListSearching.from(input);

	const where = mergeWhereFragments<Prisma.SittingWhereInput>(
		ranging.use(),
		searching.use(),
		{
			status: input.ongoingOnly
				? { in: ["voting", "reading"] }
				: input.statuses
					? { in: input.statuses }
					: undefined,
		},
	);

	const rows = await db.sitting.findMany({
		...pagination.use(),
		where,
		orderBy: withStableSlugOrderBy(sorting.use(), sorting.sortDirection),
		select: getSittingListFields,
	});

	const page = pagination.paginate(rows);

	return {
		items: page.items.map(mapSittingListRow),
		metadata: page.metadata,
	};
}

export async function getSittingBySlug(
	slug: string,
	db: Database,
	session: Session | null,
): Promise<GetSittingBySlugOutput> {
	const sitting = await db.sitting.findUnique({
		where: { slug },
		select: getSittingBySlugFields,
	});

	if (!sitting) {
		throw new ORPCError("NOT_FOUND", {
			message: "Sitting not found",
			data: { slug },
		});
	}

	if (sitting.status === "reading" && sitting.selectedBookId) {
		await syncParticipationWithExistingReadsForSelectedBook(
			db,
			sitting.id,
			sitting.selectedBookId,
		);
	}

	const userId = session?.user.id;
	const myVoteOptionIds =
		userId && sitting.poll
			? await loadMyPollVoteOptionIds(sitting.poll.id, userId, db)
			: [];

	const participantUserIds = sitting.participants.map(
		(participant) => participant.userId,
	);

	const reviews =
		sitting.selectedBookId != null
			? await loadSittingReviews(
					sitting.selectedBookId,
					participantUserIds,
					db,
					userId ?? null,
				)
			: [];

	const pollVoterCount =
		sitting.poll != null
			? (
					await db.pollVote.groupBy({
						by: ["userId"],
						where: { option: { pollId: sitting.poll.id } },
					})
				).length
			: 0;

	const pollBookIds =
		sitting.poll?.options.map((option) => option.book.id) ?? [];
	const participantReadCountByBookId = await loadParticipantReadCountsByBookId(
		participantUserIds,
		pollBookIds,
		db,
	);

	const viewerReadBookIds = new Set<string>();
	if (userId && pollBookIds.length > 0) {
		const viewerReads = await db.read.findMany({
			where: {
				userId,
				bookId: { in: pollBookIds },
			},
			select: { bookId: true },
		});
		for (const read of viewerReads) {
			viewerReadBookIds.add(read.bookId);
		}
	}

	let removedParticipants: GetSittingBySlugOutput["removedParticipants"] = [];

	if (session?.user.isAdmin) {
		const removedRows = await db.participation.findMany({
			where: {
				sittingId: sitting.id,
				removedAt: { not: null },
			},
			orderBy: { removedAt: "desc" },
			select: getSittingRemovedParticipantFields,
		});

		removedParticipants = removedRows.flatMap((row) => {
			if (row.removedAt == null) {
				return [];
			}

			return [
				{
					userId: row.userId,
					username: row.user.username,
					name: row.user.name,
					image: row.user.image,
					status: row.user.status,
					progress: row.progress,
					rpChange: null,
					removedAt: row.removedAt,
				},
			];
		});
	}

	return mapSittingDetail(
		sitting,
		myVoteOptionIds,
		reviews,
		pollVoterCount,
		removedParticipants,
		participantReadCountByBookId,
		viewerReadBookIds,
	);
}

export async function getOngoingSitting(
	db: Database,
	viewerUserId?: string,
): Promise<GetOngoingSittingOutput> {
	const sitting = await db.sitting.findFirst({
		where: sittingOngoingWhere(),
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			slug: true,
			status: true,
			deadline: true,
			createdAt: true,
			selectedBook: {
				select: { title: true },
			},
			poll: {
				select: { deadline: true },
			},
		},
	});

	if (!sitting) {
		return null;
	}

	const participantCount = await countActiveParticipantsForSitting(
		db,
		sitting.id,
	);

	let viewerIsParticipant = false;
	if (viewerUserId) {
		const participation = await db.participation.findFirst({
			where: {
				sittingId: sitting.id,
				userId: viewerUserId,
				...activeParticipationWhere,
			},
			select: { id: true },
		});
		viewerIsParticipant = participation != null;
	}

	const selectedBookTitle = sitting.selectedBook?.title ?? null;

	return {
		slug: sitting.slug,
		status: sitting.status,
		deadline: sitting.deadline,
		createdAt: sitting.createdAt,
		participantCount,
		displayName: formatSittingDisplayName(
			sitting.slug,
			sitting.status,
			selectedBookTitle,
		),
		pollDeadline: sitting.poll?.deadline ?? null,
		selectedBookTitle,
		viewerIsParticipant,
	};
}

async function markPollWinnerBookAsReading(
	tx: DatabaseTransaction,
	bookId: string,
): Promise<void> {
	await tx.book.update({
		where: { id: bookId },
		data: { status: "reading" },
	});
}

export async function previewSittingPollOptions(
	input: PreviewSittingPollOptionsInput,
	db: Database,
): Promise<PreviewSittingPollOptionsOutput> {
	const context = await loadPollDrawContext(
		input.participantUserIds,
		input.poll,
		db,
	);

	const { bookIds, usedUniformFallback } = drawInitialPollBookIds(context);
	const options = await loadPollPreviewBooks(
		bookIds,
		context.readCountByBookId,
		db,
	);

	return {
		options,
		eligiblePoolSize: context.eligibleBookIds.length,
		usedUniformFallback,
	};
}

export async function replaceSittingPollPreviewOption(
	input: ReplaceSittingPollPreviewOptionInput,
	db: Database,
): Promise<ReplaceSittingPollPreviewOptionOutput> {
	const context = await loadPollDrawContext(
		input.participantUserIds,
		input.poll,
		db,
	);

	if (input.currentOptionBookIds.length !== context.take) {
		throw new ORPCError("BAD_REQUEST", {
			message: `Expected ${context.take} current poll options`,
		});
	}

	const { bookId, usedUniformFallback } = drawReplacementPollBookId(
		context,
		input.currentOptionBookIds,
		input.replaceBookId,
	);

	const [option] = await loadPollPreviewBooks(
		[bookId],
		context.readCountByBookId,
		db,
	);

	if (!option) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Could not load replacement book",
		});
	}

	return { option, usedUniformFallback };
}

export async function createSitting(
	input: CreateSittingInput,
	db: Database,
): Promise<CreateSittingOutput> {
	const ongoing = await db.sitting.findFirst({
		where: sittingOngoingWhere(),
		select: { slug: true },
	});

	if (ongoing) {
		throw new ORPCError("CONFLICT", {
			message: "A sitting is already in progress",
			data: { slug: ongoing.slug },
		});
	}

	const context = await loadPollDrawContext(
		input.participantUserIds,
		input.poll,
		db,
	);
	const uniqueParticipantIds = context.participantIds;
	const take = context.take;
	const minChoices = input.poll.minChoices ?? 1;
	const maxChoices = input.poll.maxChoices ?? take;

	let pollBookIds: string[];
	if (input.optionBookIds != null) {
		await assertValidPollOptionBookIds(input.optionBookIds, context, db);
		pollBookIds = input.optionBookIds;
	} else {
		pollBookIds = drawInitialPollBookIds(context).bookIds;
	}
	const clubTimeZone = resolveClubTimeZone();
	const pollDeadline = input.pollDeadline
		? snapPollDeadlineOnOrAfter(input.pollDeadline, clubTimeZone)
		: defaultPollDeadline(new Date(), clubTimeZone);
	const sittingDeadline = sittingReadingDeadlinePlaceholder();

	const created = await db.$transaction(async (tx) => {
		const sittingSlug = await generateSittingSlug(tx);
		const pollSlug = buildSittingPollSlug(sittingSlug);
		await assertPollSlugAvailable(pollSlug, tx);

		const sitting = await tx.sitting.create({
			data: {
				slug: sittingSlug,
				deadline: sittingDeadline,
				status: "voting",
			},
			select: { id: true, slug: true },
		});

		const storedFilters = createPollInputToStoredFilters(input.poll);

		await tx.poll.create({
			data: {
				slug: pollSlug,
				sittingId: sitting.id,
				deadline: pollDeadline,
				minPages: storedFilters.minPages ?? undefined,
				maxPages: storedFilters.maxPages ?? undefined,
				minPublishedIn: storedFilters.minPublishedIn ?? undefined,
				maxPublishedIn: storedFilters.maxPublishedIn ?? undefined,
				minOpenLibraryRating: storedFilters.minOpenLibraryRating ?? undefined,
				minReads: storedFilters.minReads ?? undefined,
				maxReads: storedFilters.maxReads ?? undefined,
				filterCountries: storedFilters.filterCountries,
				filterAuthorSlugs: storedFilters.filterAuthorSlugs,
				take,
				minChoices,
				maxChoices,
				options: {
					create: pollBookIds.map((bookId) => ({ bookId })),
				},
			},
		});

		await tx.participation.createMany({
			data: uniqueParticipantIds.map((userId) => ({
				userId,
				sittingId: sitting.id,
			})),
		});

		for (const userId of uniqueParticipantIds) {
			await awardParticipationXp({ userId, sittingId: sitting.id }, tx);
		}

		return {
			slug: sitting.slug,
			pollSlug,
		};
	});

	void notifySittingPollStarted(db, created.slug);
	void telegramAnnouncePollOpen(db, created.slug);

	return created;
}

export async function submitPollVotes(
	input: SubmitPollVotesInput,
	userId: string,
	db: Database,
): Promise<SubmitPollVotesOutput> {
	const sitting = await db.sitting.findUnique({
		where: { slug: input.sittingSlug },
		select: {
			id: true,
			status: true,
			poll: {
				select: {
					id: true,
					minChoices: true,
					maxChoices: true,
					take: true,
					options: {
						select: { id: true },
					},
				},
			},
			participants: {
				where: { userId, ...activeParticipationWhere },
				select: { userId: true },
			},
		},
	});

	if (!sitting) {
		throw new ORPCError("NOT_FOUND", {
			message: "Sitting not found",
			data: { slug: input.sittingSlug },
		});
	}

	if (sitting.status !== "voting") {
		throw new ORPCError("BAD_REQUEST", {
			message: "This sitting is not accepting votes",
			data: { status: sitting.status },
		});
	}

	if (!sitting.poll) {
		throw new ORPCError("BAD_REQUEST", {
			message: "This sitting has no poll",
		});
	}

	if (sitting.participants.length === 0) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only sitting participants can vote",
		});
	}

	const poll = sitting.poll;
	const allowedOptionIds = new Set(poll.options.map((option) => option.id));
	const uniqueOptionIds = [...new Set(input.optionIds)];

	if (uniqueOptionIds.length !== input.optionIds.length) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Duplicate poll options are not allowed",
		});
	}

	if (uniqueOptionIds.some((optionId) => !allowedOptionIds.has(optionId))) {
		throw new ORPCError("BAD_REQUEST", {
			message: "One or more selected options are not on this poll",
		});
	}

	const minChoices = poll.minChoices;
	const maxChoices = poll.maxChoices ?? poll.take;
	const choiceCount = uniqueOptionIds.length;

	if (choiceCount < minChoices) {
		throw new ORPCError("BAD_REQUEST", {
			message: `Select at least ${minChoices} ${minChoices === 1 ? "book" : "books"}`,
			data: { minChoices, choiceCount },
		});
	}

	if (choiceCount > maxChoices) {
		throw new ORPCError("BAD_REQUEST", {
			message: `Select at most ${maxChoices} ${maxChoices === 1 ? "book" : "books"}`,
			data: { maxChoices, choiceCount },
		});
	}

	let xpAwarded: number | null = null;

	await db.$transaction(async (tx) => {
		await tx.pollVote.deleteMany({
			where: {
				userId,
				option: { pollId: poll.id },
			},
		});

		if (uniqueOptionIds.length > 0) {
			await tx.pollVote.createMany({
				data: uniqueOptionIds.map((optionId) => ({
					userId,
					optionId,
				})),
			});
		}

		const awarded = await awardPollVoteXp({ userId, pollId: poll.id }, tx);

		if (awarded) {
			xpAwarded = XP_AWARD.vote;
		}
	});

	return {
		myVoteOptionIds: uniqueOptionIds,
		xpAwarded,
	};
}

export async function transitionSitting(
	input: TransitionSittingInput,
	db: Database,
): Promise<TransitionSittingOutput> {
	if (input.transition === "start_reading") {
		const sitting = await db.sitting.findUnique({
			where: { slug: input.slug },
			select: {
				id: true,
				status: true,
				poll: {
					select: {
						id: true,
						options: {
							select: {
								id: true,
								bookId: true,
							},
						},
					},
				},
			},
		});

		if (!sitting) {
			throw new ORPCError("NOT_FOUND", {
				message: "Sitting not found",
				data: { slug: input.slug },
			});
		}

		if (sitting.status !== "voting") {
			throw new ORPCError("BAD_REQUEST", {
				message: "Only sittings in voting can start reading",
				data: { status: sitting.status },
			});
		}

		if (!sitting.poll) {
			throw new ORPCError("BAD_REQUEST", {
				message: "This sitting has no poll to close",
			});
		}

		const selectedOption = sitting.poll.options.find(
			(option) => option.id === input.selectedPollOptionId,
		);

		if (!selectedOption) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Selected book is not part of this poll",
			});
		}

		const book = await db.book.findUnique({
			where: { id: selectedOption.bookId },
			select: { id: true, pages: true },
		});

		if (!book) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Selected book was not found",
			});
		}

		const clubTimeZone = resolveClubTimeZone();
		const readingStartedAt = new Date();
		const readingDeadline = clampSittingDeadlineToClubEnd(
			calculateSittingReadingDeadline(book.pages),
			clubTimeZone,
		);
		const midtermAt = computeMidtermAt(
			readingStartedAt,
			readingDeadline,
			clubTimeZone,
		);

		const updated = await db.$transaction(async (tx) => {
			const sittingUpdate = await tx.sitting.update({
				where: { id: sitting.id },
				data: {
					status: "reading",
					selectedBookId: selectedOption.bookId,
					deadline: readingDeadline,
					readingStartedAt,
					midtermAt,
				},
				select: {
					slug: true,
					status: true,
					selectedBook: {
						select: getBookListFields,
					},
				},
			});

			await markPollWinnerBookAsReading(tx, selectedOption.bookId);

			await syncParticipationWithExistingReadsForSelectedBook(
				tx,
				sitting.id,
				selectedOption.bookId,
			);

			return sittingUpdate;
		});

		void notifySittingPollClosed(
			db,
			updated.slug,
			updated.selectedBook?.title ?? "the selected book",
		);
		void telegramAnnounceReadingStarted(db, updated.slug);
		void syncSittingReadingTelegramJobs(db, updated.slug);

		return updated;
	}

	const sitting = await db.sitting.findUnique({
		where: { slug: input.slug },
		select: { id: true, status: true, selectedBookId: true },
	});

	if (!sitting) {
		throw new ORPCError("NOT_FOUND", {
			message: "Sitting not found",
			data: { slug: input.slug },
		});
	}

	if (sitting.status !== "reading") {
		throw new ORPCError("BAD_REQUEST", {
			message: "Only sittings in reading can be marked finished",
			data: { status: sitting.status },
		});
	}

	if (!sitting.selectedBookId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "This sitting has no selected book to complete",
		});
	}

	void cancelSittingReadingTelegramJobs(db, input.slug);

	const selectedBookId = sitting.selectedBookId;

	const book = await db.book.findUnique({
		where: { id: selectedBookId },
		select: { pages: true },
	});

	if (!book) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Selected book was not found",
		});
	}

	await db.$transaction(async (tx) => {
		await tx.book.update({
			where: { id: selectedBookId },
			data: { status: "completed" },
		});

		await tx.sitting.update({
			where: { id: sitting.id },
			data: { status: "finished" },
			select: { id: true },
		});

		await tx.participation.updateMany({
			where: {
				sittingId: sitting.id,
				...activeParticipationWhere,
				progress: { in: ["not_started", "in_progress"] },
			},
			data: { progress: "dnf" },
		});

		const participants = await tx.participation.findMany({
			where: { sittingId: sitting.id, ...activeParticipationWhere },
			select: { userId: true, progress: true },
		});

		await applyFinishedSittingParticipantEffects(
			{ sittingId: sitting.id, bookPages: book.pages },
			participants,
			tx,
		);
	}, LONG_INTERACTIVE_TRANSACTION);

	const updated = await db.sitting.findUnique({
		where: { id: sitting.id },
		select: {
			slug: true,
			status: true,
			selectedBook: {
				select: getBookListFields,
			},
		},
	});

	if (!updated) {
		throw new ORPCError("NOT_FOUND", {
			message: "Sitting not found after finish",
			data: { slug: input.slug },
		});
	}

	void notifySittingFinished(db, updated.slug);
	void telegramAnnounceSittingFinished(db, updated.slug);

	return updated;
}

export async function updateSittingDeadlines(
	input: UpdateSittingDeadlinesInput,
	db: Database,
): Promise<UpdateSittingDeadlinesOutput> {
	const sitting = await db.sitting.findUnique({
		where: { slug: input.slug },
		select: {
			id: true,
			slug: true,
			status: true,
			deadline: true,
			readingStartedAt: true,
			poll: { select: { id: true, deadline: true } },
		},
	});

	if (!sitting) {
		throw new ORPCError("NOT_FOUND", {
			message: "Sitting not found",
			data: { slug: input.slug },
		});
	}

	const sittingDeadlineChanged = input.sittingDeadline != null;

	if (input.sittingDeadline != null) {
		const clubTimeZone = resolveClubTimeZone();
		const newDeadline = clampSittingDeadlineToClubEnd(
			input.sittingDeadline,
			clubTimeZone,
		);
		const midtermAt =
			sitting.status === "reading" && sitting.readingStartedAt
				? computeMidtermAt(sitting.readingStartedAt, newDeadline, clubTimeZone)
				: undefined;

		await db.sitting.update({
			where: { id: sitting.id },
			data: {
				deadline: newDeadline,
				...(midtermAt ? { midtermAt } : {}),
			},
		});
	}

	if (input.pollDeadline != null) {
		if (!sitting.poll) {
			throw new ORPCError("BAD_REQUEST", {
				message: "This sitting has no poll deadline to update",
			});
		}

		await db.poll.update({
			where: { id: sitting.poll.id },
			data: {
				deadline: snapPollDeadlineOnOrAfter(
					input.pollDeadline,
					resolveClubTimeZone(),
				),
			},
		});
	}

	const refreshed = await db.sitting.findUnique({
		where: { id: sitting.id },
		select: {
			slug: true,
			deadline: true,
			poll: { select: { deadline: true } },
		},
	});

	if (!refreshed) {
		throw new ORPCError("NOT_FOUND", { message: "Sitting not found" });
	}

	if (sitting.status === "reading" && sittingDeadlineChanged) {
		void syncSittingReadingTelegramJobs(db, sitting.slug);
	}

	return {
		slug: refreshed.slug,
		pollDeadline: refreshed.poll?.deadline ?? null,
		sittingDeadline: refreshed.deadline,
	};
}

export async function updateMyParticipationProgress(
	input: UpdateMyParticipationProgressInput,
	userId: string,
	db: Database,
): Promise<UpdateMyParticipationProgressOutput> {
	const sitting = await db.sitting.findUnique({
		where: { slug: input.slug },
		select: {
			id: true,
			status: true,
			participants: {
				where: { userId, ...activeParticipationWhere },
				select: {
					userId: true,
					progress: true,
				},
			},
		},
	});

	if (!sitting) {
		throw new ORPCError("NOT_FOUND", {
			message: "Sitting not found",
			data: { slug: input.slug },
		});
	}

	if (sitting.status !== "reading") {
		throw new ORPCError("BAD_REQUEST", {
			message: "Progress can only be updated during the reading phase",
			data: { status: sitting.status },
		});
	}

	const participation = sitting.participants[0];

	if (!participation) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only sitting participants can update progress",
		});
	}

	assertMemberCanSetProgress(participation.progress, input.progress);

	const previousProgress = participation.progress;

	const updated = await db.participation.update({
		where: {
			userId_sittingId: {
				userId,
				sittingId: sitting.id,
			},
		},
		data: {
			progress: input.progress,
		},
		select: {
			userId: true,
			progress: true,
		},
	});

	if (input.progress === "completed" && previousProgress !== "completed") {
		void notifyParticipantFinishedBook(db, input.slug, userId);
		void ensureReadForSittingCompletion(db, sitting.id, userId);
	}

	return updated;
}

export async function updateParticipation(
	input: UpdateParticipationInput,
	db: Database,
): Promise<UpdateParticipationOutput> {
	const sitting = await db.sitting.findUnique({
		where: { slug: input.slug },
		select: {
			id: true,
			status: true,
			participants: {
				where: { userId: input.userId },
				select: {
					userId: true,
					progress: true,
					user: {
						select: {
							username: true,
							name: true,
							image: true,
							status: true,
						},
					},
				},
			},
		},
	});

	if (!sitting) {
		throw new ORPCError("NOT_FOUND", {
			message: "Sitting not found",
			data: { slug: input.slug },
		});
	}

	const participation = sitting.participants[0];

	if (!participation) {
		throw new ORPCError("NOT_FOUND", {
			message: "Participant not found on this sitting",
		});
	}

	const previousProgress = participation.progress;

	const updated = await db.$transaction(async (tx) => {
		const row = await tx.participation.update({
			where: {
				userId_sittingId: {
					userId: input.userId,
					sittingId: sitting.id,
				},
			},
			data: {
				progress: input.progress,
			},
			select: {
				userId: true,
				progress: true,
				user: {
					select: {
						username: true,
						name: true,
						image: true,
						status: true,
					},
				},
			},
		});

		if (
			sitting.status === "finished" &&
			progressAffectsUserStatus(input.progress)
		) {
			await applyUserStatusForParticipationProgress(
				input.userId,
				input.progress,
				tx,
			);

			const refreshedUser = await tx.user.findUnique({
				where: { id: input.userId },
				select: {
					username: true,
					name: true,
					image: true,
					status: true,
				},
			});

			if (refreshedUser) {
				row.user.status = refreshedUser.status;
			}
		}

		return row;
	});

	if (
		sitting.status === "reading" &&
		input.progress === "completed" &&
		previousProgress !== "completed"
	) {
		void notifyParticipantFinishedBook(db, input.slug, input.userId);
		void ensureReadForSittingCompletion(db, sitting.id, input.userId);
	}

	return {
		userId: updated.userId,
		username: updated.user.username,
		name: updated.user.name,
		image: updated.user.image,
		status: updated.user.status,
		progress: updated.progress,
		rpChange: null,
	};
}

function assertSittingAcceptsParticipantChanges(status: string) {
	if (status !== "voting" && status !== "reading") {
		throw new ORPCError("BAD_REQUEST", {
			message: "Participants can only be changed while voting or reading",
			data: { status },
		});
	}
}

export async function addSittingParticipant(
	input: SittingParticipantMutationInput,
	db: Database,
): Promise<SittingParticipantMutationOutput> {
	const sitting = await db.sitting.findUnique({
		where: { slug: input.slug },
		select: {
			id: true,
			status: true,
			poll: { select: { id: true } },
		},
	});

	if (!sitting) {
		throw new ORPCError("NOT_FOUND", {
			message: "Sitting not found",
			data: { slug: input.slug },
		});
	}

	assertSittingAcceptsParticipantChanges(sitting.status);

	const user = await db.user.findUnique({
		where: { id: input.userId },
		select: { id: true, status: true },
	});

	if (!user) {
		throw new ORPCError("BAD_REQUEST", {
			message: "User not found",
		});
	}

	if (user.status === "banned") {
		throw new ORPCError("BAD_REQUEST", {
			message: "Banned members cannot join a sitting",
		});
	}

	const existing = await db.participation.findUnique({
		where: {
			userId_sittingId: {
				userId: input.userId,
				sittingId: sitting.id,
			},
		},
		select: { removedAt: true },
	});

	if (existing && existing.removedAt == null) {
		throw new ORPCError("CONFLICT", {
			message: "Member is already on this sitting",
		});
	}

	await db.$transaction(async (tx) => {
		if (existing) {
			await tx.participation.update({
				where: {
					userId_sittingId: {
						userId: input.userId,
						sittingId: sitting.id,
					},
				},
				data: {
					removedAt: null,
					progress: "not_started",
				},
			});
		} else {
			await tx.participation.create({
				data: {
					userId: input.userId,
					sittingId: sitting.id,
				},
			});
		}

		await awardParticipationXp(
			{ userId: input.userId, sittingId: sitting.id },
			tx,
		);
	});

	return { ok: true };
}

export async function removeSittingParticipant(
	input: SittingParticipantMutationInput,
	db: Database,
): Promise<SittingParticipantMutationOutput> {
	const sitting = await db.sitting.findUnique({
		where: { slug: input.slug },
		select: {
			id: true,
			status: true,
			poll: { select: { id: true } },
		},
	});

	if (!sitting) {
		throw new ORPCError("NOT_FOUND", {
			message: "Sitting not found",
			data: { slug: input.slug },
		});
	}

	assertSittingAcceptsParticipantChanges(sitting.status);

	const participation = await db.participation.findUnique({
		where: {
			userId_sittingId: {
				userId: input.userId,
				sittingId: sitting.id,
			},
		},
		select: { removedAt: true, progress: true },
	});

	if (!participation || participation.removedAt != null) {
		throw new ORPCError("NOT_FOUND", {
			message: "Participant not found on this sitting",
		});
	}

	if (participation.progress === "completed") {
		throw new ORPCError("BAD_REQUEST", {
			message: "Cannot remove a member who already finished the book",
		});
	}

	const activeCount = await db.participation.count({
		where: { sittingId: sitting.id, ...activeParticipationWhere },
	});

	if (activeCount <= 1) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Cannot remove the last participant",
		});
	}

	const removedAt = new Date();

	await db.$transaction(async (tx) => {
		await tx.participation.update({
			where: {
				userId_sittingId: {
					userId: input.userId,
					sittingId: sitting.id,
				},
			},
			data: { removedAt },
		});

		if (sitting.status === "voting" && sitting.poll) {
			await tx.pollVote.deleteMany({
				where: {
					userId: input.userId,
					option: { pollId: sitting.poll.id },
				},
			});
		}
	});

	return { ok: true };
}

export async function getPollOptionVotes(
	input: GetPollOptionVotesInput,
	db: Database,
): Promise<GetPollOptionVotesOutput> {
	const option = await db.pollOption.findUnique({
		where: { id: input.pollOptionId },
		select: {
			id: true,
			pollId: true,
			poll: {
				select: {
					maxChoices: true,
					take: true,
				},
			},
			book: {
				select: { title: true },
			},
		},
	});

	if (!option) {
		throw new ORPCError("NOT_FOUND", {
			message: "Poll option not found",
			data: { pollOptionId: input.pollOptionId },
		});
	}

	const maxChoices = option.poll.maxChoices ?? option.poll.take;

	const votes = await db.pollVote.findMany({
		where: { optionId: option.id },
		orderBy: { createdAt: "desc" },
		select: {
			createdAt: true,
			userId: true,
			user: {
				select: {
					username: true,
					name: true,
					image: true,
					status: true,
				},
			},
		},
	});

	if (votes.length === 0) {
		return {
			bookTitle: option.book.title,
			voters: [],
		};
	}

	const userIds = votes.map((vote) => vote.userId);
	const selectionCounts = await db.pollVote.groupBy({
		by: ["userId"],
		where: {
			userId: { in: userIds },
			option: { pollId: option.pollId },
		},
		_count: { _all: true },
	});

	const selectionsByUserId = new Map(
		selectionCounts.map((row) => [row.userId, row._count._all]),
	);

	return {
		bookTitle: option.book.title,
		voters: votes.map((vote) => ({
			user: vote.user,
			votedAt: vote.createdAt,
			totalSelections: selectionsByUserId.get(vote.userId) ?? 1,
			maxChoices,
		})),
	};
}

async function loadPollOptionReadersForParticipants(
	bookId: string,
	participantUserIds: string[],
	db: Database,
	bookTitle: string,
): Promise<GetPollOptionReadersOutput> {
	const uniqueParticipantIds = [...new Set(participantUserIds)];

	if (uniqueParticipantIds.length === 0) {
		return {
			bookTitle,
			participantCount: 0,
			readers: [],
		};
	}

	const reads = await db.read.findMany({
		where: {
			bookId,
			userId: { in: uniqueParticipantIds },
		},
		orderBy: { updatedAt: "desc" },
		select: {
			updatedAt: true,
			user: {
				select: {
					username: true,
					name: true,
					image: true,
					status: true,
				},
			},
		},
	});

	return {
		bookTitle,
		participantCount: uniqueParticipantIds.length,
		readers: reads.map((read) => ({
			user: read.user,
			readRecordedAt: read.updatedAt,
		})),
	};
}

export async function getSittingPollPreviewReaders(
	input: GetSittingPollPreviewReadersInput,
	db: Database,
): Promise<GetPollOptionReadersOutput> {
	const book = await db.book.findUnique({
		where: { id: input.bookId },
		select: { id: true, title: true },
	});

	if (!book) {
		throw new ORPCError("NOT_FOUND", {
			message: "Book not found",
			data: { bookId: input.bookId },
		});
	}

	await assertParticipantsExist(input.participantUserIds, db);

	return loadPollOptionReadersForParticipants(
		book.id,
		input.participantUserIds,
		db,
		book.title,
	);
}

export async function getPollOptionReaders(
	input: GetPollOptionReadersInput,
	userId: string,
	isAdmin: boolean,
	db: Database,
): Promise<GetPollOptionReadersOutput> {
	const option = await db.pollOption.findUnique({
		where: { id: input.pollOptionId },
		select: {
			bookId: true,
			book: {
				select: { title: true },
			},
			poll: {
				select: {
					sitting: {
						select: {
							participants: {
								where: activeParticipationWhere,
								select: { userId: true },
							},
						},
					},
				},
			},
		},
	});

	if (!option) {
		throw new ORPCError("NOT_FOUND", {
			message: "Poll option not found",
			data: { pollOptionId: input.pollOptionId },
		});
	}

	const participantUserIds = option.poll.sitting.participants.map(
		(participant) => participant.userId,
	);

	if (
		!isAdmin &&
		!participantUserIds.some((participantId) => participantId === userId)
	) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only sitting participants can view reader lists",
		});
	}

	return loadPollOptionReadersForParticipants(
		option.bookId,
		participantUserIds,
		db,
		option.book.title,
	);
}

export async function getPollVotesByUser(
	input: GetPollVotesByUserInput,
	db: Database,
): Promise<GetPollVotesByUserOutput> {
	const sitting = await db.sitting.findUnique({
		where: { slug: input.sittingSlug },
		select: {
			poll: {
				select: {
					id: true,
					maxChoices: true,
					take: true,
				},
			},
		},
	});

	if (!sitting?.poll) {
		throw new ORPCError("NOT_FOUND", {
			message: "Poll not found for this sitting",
			data: { sittingSlug: input.sittingSlug },
		});
	}

	const maxChoices = sitting.poll.maxChoices ?? sitting.poll.take;

	const votes = await db.pollVote.findMany({
		where: { option: { pollId: sitting.poll.id } },
		orderBy: [{ user: { username: "asc" } }, { createdAt: "asc" }],
		select: {
			userId: true,
			createdAt: true,
			optionId: true,
			user: {
				select: {
					username: true,
					name: true,
					image: true,
					status: true,
				},
			},
			option: {
				select: {
					book: {
						select: { title: true },
					},
				},
			},
		},
	});

	const voters: GetPollVotesByUserOutput["voters"] = [];
	const indexByUserId = new Map<string, number>();

	for (const vote of votes) {
		const choice = {
			pollOptionId: vote.optionId,
			bookTitle: vote.option.book.title,
			votedAt: vote.createdAt,
		};

		const existingIndex = indexByUserId.get(vote.userId);
		if (existingIndex == null) {
			indexByUserId.set(vote.userId, voters.length);
			voters.push({
				user: vote.user,
				choices: [choice],
				maxChoices,
			});
			continue;
		}

		voters[existingIndex]?.choices.push(choice);
	}

	return { maxChoices, voters };
}

export async function sendSittingTelegramProgressPoll(
	input: SendSittingTelegramProgressPollInput,
	db: Database,
): Promise<SendSittingTelegramProgressPollOutput> {
	const sitting = await db.sitting.findUnique({
		where: { slug: input.slug },
		select: { status: true, selectedBookId: true },
	});

	if (!sitting) {
		throw new ORPCError("NOT_FOUND", {
			message: "Sitting not found",
			data: { slug: input.slug },
		});
	}

	if (sitting.status !== "reading") {
		throw new ORPCError("BAD_REQUEST", {
			message: "Progress poll is only available during the reading phase",
			data: { status: sitting.status },
		});
	}

	if (!sitting.selectedBookId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "This sitting has no selected book",
		});
	}

	const sent = await telegramSendReadingProgressPoll(db, input.slug);
	if (!sent) {
		throw new ORPCError("FAILED_PRECONDITION", {
			message:
				"Telegram is disabled or the poll could not be sent. Check TELEGRAM_BOT_ENABLED, token, and group chat id.",
		});
	}

	return { ok: true };
}

export async function resendSittingTelegramPollOpen(
	input: ResendSittingTelegramPollOpenInput,
	db: Database,
): Promise<ResendSittingTelegramPollOpenOutput> {
	const sitting = await db.sitting.findUnique({
		where: { slug: input.slug },
		select: { status: true, poll: { select: { id: true } } },
	});

	if (!sitting) {
		throw new ORPCError("NOT_FOUND", {
			message: "Sitting not found",
			data: { slug: input.slug },
		});
	}

	if (sitting.status !== "voting" || !sitting.poll) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Poll open announcement is only for sittings in voting",
		});
	}

	const sent = await telegramAnnouncePollOpen(db, input.slug, { force: true });
	if (!sent) {
		throw new ORPCError("FAILED_PRECONDITION", {
			message:
				"Telegram is disabled or the message could not be sent. Check TELEGRAM_BOT_ENABLED, token, and group chat id.",
		});
	}

	return { ok: true, sent: true };
}
