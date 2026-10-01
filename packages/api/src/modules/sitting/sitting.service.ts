import type { Session } from "@bbrc/auth";
import type { Database, DatabaseTransaction, Prisma } from "@bbrc/db";
import { LONG_INTERACTIVE_TRANSACTION } from "@bbrc/db";
import {
	calculateSittingReadingDeadline,
	clampSittingDeadlineToClubEnd,
	defaultPollDeadline,
	generateSlug,
	generateUniqueSlug,
	resolveClubTimeZone,
	sittingReadingDeadlinePlaceholder,
	snapPollDeadlineOnOrAfter,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { definePagination } from "../../utils/pagination";
import { mergeWhereFragments } from "../../utils/searching";
import { getBookListFields } from "../book/book.schema";
import {
	notifyParticipantFinishedBook,
	notifySittingFinished,
	notifySittingPollClosed,
	notifySittingPollStarted,
} from "../notification/notification-triggers";
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
	type GetSittingBySlugOutput,
	type GetSittingListInput,
	type GetSittingListOutput,
	getSittingBySlugFields,
	getSittingListFields,
	getSittingRemovedParticipantFields,
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

function shuffleInPlace<T>(items: T[]): void {
	for (let index = items.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(Math.random() * (index + 1));
		const current = items[index];
		const swap = items[swapIndex];
		if (current === undefined || swap === undefined) {
			continue;
		}
		items[index] = swap;
		items[swapIndex] = current;
	}
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
	};
}

function mapSittingDetail(
	row: SittingDetailRow,
	myVoteOptionIds: string[],
	reviews: GetSittingBySlugOutput["reviews"],
	pollVoterCount: number,
	removedParticipants: GetSittingBySlugOutput["removedParticipants"],
): GetSittingBySlugOutput {
	const bookPages = row.selectedBook?.pages ?? null;

	return {
		slug: row.slug,
		status: row.status,
		deadline: row.deadline,
		createdAt: row.createdAt,
		selectedBook: row.selectedBook,
		poll: row.poll
			? {
					slug: row.poll.slug,
					deadline: row.poll.deadline,
					minPages: row.poll.minPages,
					maxPages: row.poll.maxPages,
					take: row.poll.take,
					minChoices: row.poll.minChoices,
					maxChoices: row.poll.maxChoices,
					options: row.poll.options.map((option) => ({
						id: option.id,
						voteCount: option._count.votes,
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
		},
	});

	return feedbacks.map((feedback) => ({
		authorId: feedback.authorId,
		username: feedback.author.username,
		name: feedback.author.name,
		image: feedback.author.image,
		rating: feedback.rating,
		review: feedback.review,
		createdAt: feedback.createdAt,
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
			? await loadSittingReviews(sitting.selectedBookId, participantUserIds, db)
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
	);
}

export async function getOngoingSitting(
	db: Database,
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

	return {
		slug: sitting.slug,
		status: sitting.status,
		deadline: sitting.deadline,
		createdAt: sitting.createdAt,
		participantCount,
		pollDeadline: sitting.poll?.deadline ?? null,
		selectedBookTitle: sitting.selectedBook?.title ?? null,
	};
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

	const uniqueParticipantIds = [...new Set(input.participantUserIds)];

	const users = await db.user.findMany({
		where: { id: { in: uniqueParticipantIds } },
		select: { id: true },
	});

	if (users.length !== uniqueParticipantIds.length) {
		throw new ORPCError("BAD_REQUEST", {
			message: "One or more selected participants do not exist",
		});
	}

	const take = input.poll.take ?? 10;
	const minChoices = input.poll.minChoices ?? 1;
	const maxChoices = input.poll.maxChoices ?? take;

	const bookWhere: Prisma.BookWhereInput = {
		status: "wishlist",
	};

	if (input.poll.minPages != null || input.poll.maxPages != null) {
		bookWhere.pages = {
			gte: input.poll.minPages ?? undefined,
			lte: input.poll.maxPages ?? undefined,
		};
	}

	const wishlistBooks = await db.book.findMany({
		where: bookWhere,
		select: { id: true },
	});

	if (wishlistBooks.length < take) {
		throw new ORPCError("BAD_REQUEST", {
			message: `Not enough wishlist books match the poll filters (need at least ${take})`,
			data: { available: wishlistBooks.length, take },
		});
	}

	const selectedBooks = [...wishlistBooks];
	shuffleInPlace(selectedBooks);
	const pollBookIds = selectedBooks.slice(0, take).map((book) => book.id);
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

		await tx.poll.create({
			data: {
				slug: pollSlug,
				sittingId: sitting.id,
				deadline: pollDeadline,
				minPages: input.poll.minPages ?? undefined,
				maxPages: input.poll.maxPages ?? undefined,
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

		const readingDeadline = clampSittingDeadlineToClubEnd(
			calculateSittingReadingDeadline(book.pages),
			resolveClubTimeZone(),
		);

		const updated = await db.$transaction(async (tx) => {
			const sittingUpdate = await tx.sitting.update({
				where: { id: sitting.id },
				data: {
					status: "reading",
					selectedBookId: selectedOption.bookId,
					deadline: readingDeadline,
				},
				select: {
					slug: true,
					status: true,
					selectedBook: {
						select: getBookListFields,
					},
				},
			});

			await tx.book.update({
				where: { id: selectedOption.bookId },
				data: { status: "reading" },
			});

			return sittingUpdate;
		});

		void notifySittingPollClosed(
			db,
			updated.slug,
			updated.selectedBook?.title ?? "the selected book",
		);

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
			deadline: true,
			poll: { select: { id: true, deadline: true } },
		},
	});

	if (!sitting) {
		throw new ORPCError("NOT_FOUND", {
			message: "Sitting not found",
			data: { slug: input.slug },
		});
	}

	if (input.sittingDeadline != null) {
		await db.sitting.update({
			where: { id: sitting.id },
			data: {
				deadline: clampSittingDeadlineToClubEnd(
					input.sittingDeadline,
					resolveClubTimeZone(),
				),
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
