import type { Session } from "@bbrc/auth";
import type { Database, DatabaseTransaction, Prisma } from "@bbrc/db";
import { LONG_INTERACTIVE_TRANSACTION } from "@bbrc/db";
import {
	calculateSittingReadingDeadline,
	clampSittingDeadlineToClubEnd,
	computeMidtermAt,
	computePollChipGrants,
	defaultPollDeadline,
	formatSittingDisplayName,
	generateSlug,
	generateUniqueSlug,
	pollChipRankFromGrants,
	resolveClubTimeZone,
	selfJoinWindow,
	sittingReadingDeadlinePlaceholder,
	snapPollDeadlineOnOrAfter,
	validatePollVoteSubmission,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { definePagination } from "../../utils/pagination";
import { mergeWhereFragments } from "../../utils/searching";
import { getBookListFields } from "../book/book.schema";
import { loadLikedFeedbackIdsForViewer } from "../feedback/feedback.service";
import { dispatchNotification } from "../notification/notification.service";
import {
	notifyParticipantFinishedBook,
	notifySittingFinished,
	notifySittingOpened,
	notifySittingPollClosed,
	notifySittingPollStarted,
} from "../notification/notification-triggers";
import {
	deleteReadForUserBook,
	ensureReadForSittingCompletion,
	syncParticipationWithExistingReadsForSelectedBook,
} from "../read/read.service";
import {
	ensureReadingForSitting,
	syncParticipationWithActiveReadings,
} from "../reading/reading.service";
import { calculateRpPointsDelta } from "../rp/rp.service";
import { userMemberLevelsFromPoints } from "../user/member-levels";
import { loadActorSocialGate } from "../user/user-visibility";
import { XP_AWARD } from "../xp/xp.schema";
import {
	awardParticipationXp,
	awardParticipationXpBulk,
	awardPollVoteXp,
} from "../xp/xp.service";
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
	type GetMySittingStateOutput,
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
	type GetSittingPollPoolSizeInput,
	type GetSittingPollPoolSizeOutput,
	type GetSittingPollPreviewReadersInput,
	getSittingBySlugFields,
	getSittingListFields,
	getSittingRemovedParticipantFields,
	type PreviewSittingPollOptionsInput,
	type PreviewSittingPollOptionsOutput,
	type RemoveSittingParticipantInput,
	type ReplaceSittingPollPreviewOptionInput,
	type ReplaceSittingPollPreviewOptionOutput,
	type ShuffleSittingPollPreviewOptionsInput,
	type ShuffleSittingPollPreviewOptionsOutput,
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
import { withJoinDefaults } from "./sitting-join.service";
import { insertPollChipGrantsForParticipants } from "./sitting-poll-chip-grants";
import {
	assertParticipantsExist,
	assertValidPollOptionBookIds,
	countEligiblePollBooks,
	drawInitialPollBookIds,
	drawReplacementPollBookId,
	loadPollDrawContext,
	loadPollPreviewBooks,
	resolvePollTake,
	shuffleUnlockedPollPreviewBookIds,
} from "./sitting-poll-pool";
import { createPollInputToStoredFilters } from "./sitting-poll-stored-filters";
import { syncSittingReadingSchedule } from "./sitting-reading-schedule.service";
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

function mapSittingListRow(
	row: SittingListRow,
	completedCount: number,
	viewerProgress: GetSittingListOutput["items"][number]["viewerProgress"],
) {
	return {
		slug: row.slug,
		status: row.status,
		deadline: row.deadline,
		createdAt: row.createdAt,
		participantCount: row._count.participants,
		completedCount,
		displayName: formatSittingDisplayName(
			row.slug,
			row.status,
			row.selectedBook?.title,
		),
		selectedBook: row.selectedBook,
		poll: row.poll,
		viewerProgress,
		joinType: row.joinType,
		joinOpen:
			row.joinType === "public" &&
			selfJoinWindow({
				status: row.status,
				readingStartedAt: row.readingStartedAt,
				deadline: row.deadline,
				joinType: row.joinType,
				joinInVoting: row.joinInVoting,
				joinInReading: row.joinInReading,
				joinReadingUntilPercent: row.joinReadingUntilPercent,
			}).open,
	};
}

const emptyChipGrants = { canUseGolden: false, canUseSilver: false };

function mapSittingDetail(
	row: SittingDetailRow,
	myVotes: GetSittingBySlugOutput["poll"] extends null
		? never
		: NonNullable<GetSittingBySlugOutput["poll"]>["myVotes"],
	myChipGrants: NonNullable<GetSittingBySlugOutput["poll"]>["myChipGrants"],
	reviews: GetSittingBySlugOutput["reviews"],
	pollVoterCount: number,
	removedParticipants: GetSittingBySlugOutput["removedParticipants"],
	participantReadCountByBookId: Map<string, number>,
	viewerReadBookIds: ReadonlySet<string>,
	optionAggregatesById: Map<string, { voteCount: number; pointTotal: number }>,
	hidePollAggregates: boolean,
	pollChipRankByUserId: Map<string, 1 | 2 | null>,
): Omit<GetSittingBySlugOutput, "selectedBookAuthors"> {
	const myVoteOptionIds = myVotes.map((vote) => vote.optionId);
	const bookPages = row.selectedBook?.pages ?? null;

	const progressCounts = {
		not_started: 0,
		in_progress: 0,
		completed: 0,
		dnf: 0,
	};
	for (const participation of row.participants) {
		progressCounts[participation.progress] += 1;
	}
	const averageRating =
		reviews.length > 0
			? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
			: null;

	return {
		slug: row.slug,
		status: row.status,
		deadline: row.deadline,
		createdAt: row.createdAt,
		readingStartedAt: row.readingStartedAt,
		midtermAt: row.midtermAt,
		stats: {
			participantCount: row.participants.length,
			progressCounts,
			reviewCount: reviews.length,
			averageRating,
		},
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
					options: row.poll.options.map((option) => {
						const aggregates = optionAggregatesById.get(option.id) ?? {
							voteCount: 0,
							pointTotal: 0,
						};

						return {
							id: option.id,
							voteCount: hidePollAggregates ? 0 : aggregates.voteCount,
							pointTotal: hidePollAggregates ? 0 : aggregates.pointTotal,
							participantReadCount:
								participantReadCountByBookId.get(option.book.id) ?? 0,
							viewerHasRead: viewerReadBookIds.has(option.book.id),
							book: (() => {
								const { seriesMembership, ...book } = option.book;
								return {
									...book,
									series: seriesMembership
										? {
												title: seriesMembership.series.title,
												slug: seriesMembership.series.slug,
												position: seriesMembership.position,
											}
										: null,
								};
							})(),
						};
					}),
					myVoteOptionIds,
					myVotes,
					myChipGrants,
					// Only the number of ballots is public while voting; picks and points stay hidden.
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

			const levels = userMemberLevelsFromPoints(
				participation.user.xp,
				participation.user.rp,
			);

			return {
				userId: participation.userId,
				username: participation.user.username,
				name: participation.user.name,
				image: participation.user.image,
				status: participation.user.status,
				xp: participation.user.xp,
				rp: participation.user.rp,
				xpLevel: levels.xpLevel,
				rpLevel: levels.rpLevel,
				progress: participation.progress,
				rpChange,
				pollChipRank: pollChipRankByUserId.get(participation.userId) ?? null,
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
			isSpoiler: true,
			imageUrl: true,
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
		isSpoiler: feedback.isSpoiler,
		imageUrl: feedback.imageUrl,
		createdAt: feedback.createdAt,
		likeCount: feedback._count.likes,
		likedByMe: likedFeedbackIds.has(feedback.id),
		commentCount: feedback._count.comments,
	}));
}

async function loadMyPollVotes(
	pollId: string,
	userId: string,
	db: Database,
): Promise<NonNullable<GetSittingBySlugOutput["poll"]>["myVotes"]> {
	const votes = await db.pollVote.findMany({
		where: {
			userId,
			option: { pollId },
		},
		select: { optionId: true, points: true },
		orderBy: { createdAt: "asc" },
	});

	return votes.map((vote) => ({
		optionId: vote.optionId,
		points: vote.points as 1 | 2 | 3,
	}));
}

async function loadMyPollChipGrants(
	pollId: string,
	userId: string,
	db: Database,
): Promise<NonNullable<GetSittingBySlugOutput["poll"]>["myChipGrants"]> {
	const grant = await db.pollChipGrant.findUnique({
		where: {
			pollId_userId: { pollId, userId },
		},
		select: {
			canUseGolden: true,
			canUseSilver: true,
		},
	});

	return grant ?? emptyChipGrants;
}

async function loadPollChipRankByUserId(
	pollId: string,
	participants: { userId: string; rp: number }[],
	db: Database,
): Promise<Map<string, 1 | 2 | null>> {
	const stored = await db.pollChipGrant.findMany({
		where: { pollId },
		select: {
			userId: true,
			canUseGolden: true,
			canUseSilver: true,
		},
	});

	const grantsByUserId =
		stored.length > 0
			? new Map(
					stored.map((row) => [
						row.userId,
						{
							canUseGolden: row.canUseGolden,
							canUseSilver: row.canUseSilver,
						},
					]),
				)
			: computePollChipGrants(participants);

	const rankByUserId = new Map<string, 1 | 2 | null>();

	for (const participant of participants) {
		const flags = grantsByUserId.get(participant.userId) ?? {
			canUseGolden: false,
			canUseSilver: false,
		};
		rankByUserId.set(participant.userId, pollChipRankFromGrants(flags));
	}

	return rankByUserId;
}

async function loadPollOptionAggregates(
	pollId: string,
	db: Database,
): Promise<Map<string, { voteCount: number; pointTotal: number }>> {
	const rows = await db.pollVote.groupBy({
		by: ["optionId"],
		where: { option: { pollId } },
		_count: { _all: true },
		_sum: { points: true },
	});

	return new Map(
		rows.map((row) => [
			row.optionId,
			{
				voteCount: row._count._all,
				pointTotal: row._sum.points ?? 0,
			},
		]),
	);
}

export async function getSittingList(
	input: GetSittingListInput,
	db: Database,
	session: Session | null = null,
): Promise<GetSittingListOutput> {
	const viewerId = session?.user?.id ?? null;
	if (input.mineOnly && !viewerId) {
		throw new ORPCError("UNAUTHORIZED", {
			message: "Sign in to filter by your sittings.",
		});
	}

	const pagination = definePagination.cursor(input, sittingListCursorCodec);
	const sorting = sittingListSorting.from(input);
	const ranging = sittingListRanging.from(input);
	const searching = sittingListSearching.from(input);

	// Prisma cannot filter on relation counts, so resolve matching sittings first.
	let participantCountWhere: Prisma.SittingWhereInput = {};
	if (input.minParticipants != null || input.maxParticipants != null) {
		const groups = await db.participation.groupBy({
			by: ["sittingId"],
			where: { removedAt: null },
			having: {
				id: {
					_count: {
						...(input.minParticipants != null
							? { gte: input.minParticipants }
							: {}),
						...(input.maxParticipants != null
							? { lte: input.maxParticipants }
							: {}),
					},
				},
			},
		});
		participantCountWhere = {
			id: { in: groups.map((group) => group.sittingId) },
		};
	}

	const baseWhere = mergeWhereFragments<Prisma.SittingWhereInput>(
		ranging.use(),
		searching.use(),
		{
			status: input.ongoingOnly
				? { in: ["voting", "reading"] }
				: input.statuses
					? { in: input.statuses }
					: undefined,
		},
		participantCountWhere,
		input.minPages != null || input.maxPages != null
			? {
					selectedBook: {
						pages: {
							...(input.minPages != null ? { gte: input.minPages } : {}),
							...(input.maxPages != null ? { lte: input.maxPages } : {}),
						},
					},
				}
			: {},
		input.mineOnly && viewerId
			? { participants: { some: { userId: viewerId, removedAt: null } } }
			: {},
	);

	// The completed-member count needs a grouped query, so filtering and sorting
	// by it happen here instead of in the database query.
	const needsCompletedCounts =
		sorting.sortBy === "completedCount" ||
		input.minCompleted != null ||
		input.maxCompleted != null;

	let where = baseWhere;
	let orderedSlugs: string[] | null = null;

	if (needsCompletedCounts) {
		const candidates = await db.sitting.findMany({
			where: baseWhere,
			select: { id: true, slug: true },
		});
		const grouped = await db.participation.groupBy({
			by: ["sittingId"],
			where: {
				progress: "completed",
				removedAt: null,
				sittingId: { in: candidates.map((candidate) => candidate.id) },
			},
			_count: { _all: true },
		});
		const counts = new Map(
			grouped.map((group) => [group.sittingId, group._count._all]),
		);
		const countOf = (id: string) => counts.get(id) ?? 0;

		const matching = candidates.filter((candidate) => {
			const count = countOf(candidate.id);
			return (
				(input.minCompleted == null || count >= input.minCompleted) &&
				(input.maxCompleted == null || count <= input.maxCompleted)
			);
		});

		where = { id: { in: matching.map((candidate) => candidate.id) } };

		if (sorting.sortBy === "completedCount") {
			const sign = sorting.sortDirection === "asc" ? 1 : -1;
			orderedSlugs = matching
				.toSorted(
					(a, b) =>
						sign * (countOf(a.id) - countOf(b.id)) ||
						a.slug.localeCompare(b.slug),
				)
				.map((candidate) => candidate.slug);
		}
	}

	const isFirstPage = input.cursor == null;

	let rows: SittingListRow[];
	if (orderedSlugs) {
		const start = input.cursor ? orderedSlugs.indexOf(input.cursor) + 1 : 0;
		const pageSlugs = orderedSlugs.slice(start, start + pagination.limit + 1);
		const found = await db.sitting.findMany({
			where: { slug: { in: pageSlugs } },
			select: getSittingListFields,
		});
		const bySlug = new Map(found.map((row) => [row.slug, row]));
		rows = pageSlugs.flatMap((slug) => {
			const row = bySlug.get(slug);
			return row ? [row] : [];
		});
	} else {
		rows = await db.sitting.findMany({
			...pagination.use(),
			where,
			orderBy: withStableSlugOrderBy(sorting.use(), sorting.sortDirection),
			select: getSittingListFields,
		});
	}

	const total = isFirstPage
		? orderedSlugs
			? orderedSlugs.length
			: await db.sitting.count({ where })
		: undefined;

	const page = pagination.paginate(rows);
	const pageIds = page.items.map((row) => row.id);

	const [completedGroups, viewerParticipations] = await Promise.all([
		db.participation.groupBy({
			by: ["sittingId"],
			where: {
				progress: "completed",
				removedAt: null,
				sittingId: { in: pageIds },
			},
			_count: { _all: true },
		}),
		viewerId
			? db.participation.findMany({
					where: {
						userId: viewerId,
						removedAt: null,
						sittingId: { in: pageIds },
					},
					select: { sittingId: true, progress: true },
				})
			: Promise.resolve([]),
	]);
	const completedBySitting = new Map(
		completedGroups.map((group) => [group.sittingId, group._count._all]),
	);
	const progressBySitting = new Map(
		viewerParticipations.map((row) => [row.sittingId, row.progress]),
	);

	return {
		items: page.items.map((row) =>
			mapSittingListRow(
				row,
				completedBySitting.get(row.id) ?? 0,
				progressBySitting.get(row.id) ?? null,
			),
		),
		metadata: {
			...page.metadata,
			...(total != null ? { total } : {}),
		},
	};
}

export async function getMySittingState(
	slug: string,
	userId: string,
	db: Database,
): Promise<GetMySittingStateOutput> {
	const sitting = await db.sitting.findUnique({
		where: { slug },
		select: { id: true, poll: { select: { id: true } } },
	});

	if (!sitting) {
		throw new ORPCError("NOT_FOUND", {
			message: "Sitting not found",
			data: { slug },
		});
	}

	const [participation, voteCount] = await Promise.all([
		db.participation.findFirst({
			where: { sittingId: sitting.id, userId, removedAt: null },
			select: { progress: true },
		}),
		sitting.poll
			? db.pollVote.count({
					where: { userId, option: { pollId: sitting.poll.id } },
				})
			: Promise.resolve(0),
	]);

	return {
		isParticipant: participation != null,
		progress: participation?.progress ?? null,
		hasVoted: voteCount > 0,
		voteCount,
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

	// A sitting's book follows its phase: reading while it runs, completed after.
	// Self-heal if the two drifted apart (for example after a manual data edit).
	if (sitting.selectedBook && sitting.selectedBookId) {
		const expectedBookStatus =
			sitting.status === "reading"
				? "reading"
				: sitting.status === "finished"
					? "completed"
					: null;

		if (
			expectedBookStatus &&
			sitting.selectedBook.status !== expectedBookStatus
		) {
			await db.book.update({
				where: { id: sitting.selectedBookId },
				data: { status: expectedBookStatus },
			});
			sitting.selectedBook = {
				...sitting.selectedBook,
				status: expectedBookStatus,
			};
		}
	}

	if (sitting.status === "reading" && sitting.selectedBookId) {
		await syncParticipationWithExistingReadsForSelectedBook(
			db,
			sitting.id,
			sitting.selectedBookId,
		);
		await syncParticipationWithActiveReadings(
			db,
			sitting.id,
			sitting.selectedBookId,
		);
	}

	const userId = session?.user.id;
	const myVotes =
		userId && sitting.poll
			? await loadMyPollVotes(sitting.poll.id, userId, db)
			: [];
	const myChipGrants =
		userId && sitting.poll
			? await loadMyPollChipGrants(sitting.poll.id, userId, db)
			: emptyChipGrants;

	const visibleParticipants = sitting.participants.filter(
		(participant) => !participant.user.isHidden,
	);
	const sittingForDetail = { ...sitting, participants: visibleParticipants };

	const participantUserIds = visibleParticipants.map(
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

	const optionAggregatesById =
		sitting.poll != null
			? await loadPollOptionAggregates(sitting.poll.id, db)
			: new Map();

	const pollVoterCount =
		sitting.poll != null
			? (
					await db.pollVote.groupBy({
						by: ["userId"],
						where: { option: { pollId: sitting.poll.id } },
					})
				).length
			: 0;

	const hidePollAggregates =
		sitting.status === "voting" && session?.user.isAdmin !== true;

	const pollChipRankByUserId =
		sitting.poll != null
			? await loadPollChipRankByUserId(
					sitting.poll.id,
					visibleParticipants.map((participant) => ({
						userId: participant.userId,
						rp: participant.user.rp,
					})),
					db,
				)
			: new Map<string, 1 | 2 | null>();

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

			const levels = userMemberLevelsFromPoints(row.user.xp, row.user.rp);

			return [
				{
					userId: row.userId,
					username: row.user.username,
					name: row.user.name,
					image: row.user.image,
					status: row.user.status,
					xp: row.user.xp,
					rp: row.user.rp,
					xpLevel: levels.xpLevel,
					rpLevel: levels.rpLevel,
					progress: row.progress,
					rpChange: null,
					pollChipRank: null,
					removedAt: row.removedAt,
				},
			];
		});
	}

	// The picked book's author records (with photos) for the page header.
	const authorLinks =
		sitting.selectedBookId != null
			? await db.bookAuthor.findMany({
					where: { bookId: sitting.selectedBookId },
					orderBy: { position: "asc" },
					select: {
						author: { select: { slug: true, name: true, photoUrl: true } },
					},
				})
			: [];

	return {
		...mapSittingDetail(
			sittingForDetail,
			myVotes,
			myChipGrants,
			reviews,
			pollVoterCount,
			removedParticipants,
			participantReadCountByBookId,
			viewerReadBookIds,
			optionAggregatesById,
			hidePollAggregates,
			pollChipRankByUserId,
		),
		selectedBookAuthors: authorLinks.map((link) => link.author),
	};
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
				select: { title: true, authors: true },
			},
			poll: {
				select: { deadline: true },
			},
		},
	});

	if (!sitting) {
		return null;
	}

	const [participantCount, participantRows] = await Promise.all([
		countActiveParticipantsForSitting(db, sitting.id),
		db.participation.findMany({
			where: {
				sittingId: sitting.id,
				...activeParticipationWhere,
			},
			orderBy: { createdAt: "asc" },
			take: 5,
			select: {
				user: {
					select: {
						username: true,
						name: true,
						image: true,
					},
				},
			},
		}),
	]);

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
	const selectedBookAuthors = sitting.selectedBook?.authors ?? [];

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
		selectedBookAuthors,
		participantPreview: participantRows.map((row) => row.user),
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

export async function getSittingPollPoolSize(
	input: GetSittingPollPoolSizeInput,
	db: Database,
): Promise<GetSittingPollPoolSizeOutput> {
	return {
		eligiblePoolSize: await countEligiblePollBooks(input.poll, db),
		take: resolvePollTake(input.poll),
	};
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

export async function shuffleSittingPollPreviewOptions(
	input: ShuffleSittingPollPreviewOptionsInput,
	db: Database,
): Promise<ShuffleSittingPollPreviewOptionsOutput> {
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

	const { bookIds, usedUniformFallback, partialShuffle } =
		shuffleUnlockedPollPreviewBookIds(
			context,
			input.currentOptionBookIds,
			input.lockedBookIds,
		);

	const options = await loadPollPreviewBooks(
		bookIds,
		context.readCountByBookId,
		db,
	);

	return { options, usedUniformFallback, partialShuffle };
}

export async function createSitting(
	input: CreateSittingInput,
	db: Database,
	createdById?: string,
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

	await assertMembersAllowBeingAdded(db, input.participantUserIds, createdById);

	const joinConfig = withJoinDefaults(input.join);

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

	const created = await db.$transaction(
		async (tx) => {
			const sittingSlug = await generateSittingSlug(tx);
			const pollSlug = buildSittingPollSlug(sittingSlug);
			await assertPollSlugAvailable(pollSlug, tx);

			const sitting = await tx.sitting.create({
				data: {
					slug: sittingSlug,
					deadline: sittingDeadline,
					status: "voting",
					joinType: joinConfig.joinType,
					joinInVoting: joinConfig.joinInVoting,
					joinInReading: joinConfig.joinInReading,
					joinReadingUntilPercent: joinConfig.joinReadingUntilPercent,
					createdById: createdById ?? null,
				},
				select: { id: true, slug: true },
			});

			const storedFilters = createPollInputToStoredFilters(input.poll);

			const poll = await tx.poll.create({
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
				select: { id: true },
			});

			await insertPollChipGrantsForParticipants(
				poll.id,
				uniqueParticipantIds,
				tx,
			);

			await tx.participation.createMany({
				data: uniqueParticipantIds.map((userId) => ({
					userId,
					sittingId: sitting.id,
				})),
			});

			await awardParticipationXpBulk(
				{ userIds: uniqueParticipantIds, sittingId: sitting.id },
				tx,
			);

			return {
				slug: sitting.slug,
				pollSlug,
			};
		},
		// Remote databases add latency to every query; 5s is too tight for a sitting
		// with a full roster.
		{ maxWait: 10_000, timeout: 30_000 },
	);

	void notifySittingPollStarted(db, created.slug);
	void notifySittingOpened(db, created.slug, createdById);

	return created;
}

export async function submitPollVotes(
	input: SubmitPollVotesInput,
	userId: string,
	db: Database,
): Promise<SubmitPollVotesOutput> {
	await loadActorSocialGate(userId, db);

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
	const minChoices = poll.minChoices;
	const maxChoices = poll.maxChoices ?? poll.take;

	const grants = await loadMyPollChipGrants(poll.id, userId, db);

	const normalizedVotes = input.votes.map((vote) => ({
		optionId: vote.optionId,
		points: vote.points as 1 | 2 | 3,
	}));

	const validation = validatePollVoteSubmission({
		votes: normalizedVotes,
		grants,
		minChoices,
		maxChoices,
		allowedOptionIds,
	});

	if (!validation.ok) {
		throw new ORPCError("BAD_REQUEST", {
			message: validation.message,
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

		if (normalizedVotes.length > 0) {
			await tx.pollVote.createMany({
				data: normalizedVotes.map((vote) => ({
					userId,
					optionId: vote.optionId,
					points: vote.points,
				})),
			});
		}

		const awarded = await awardPollVoteXp({ userId, pollId: poll.id }, tx);

		if (awarded) {
			xpAwarded = XP_AWARD.vote;
		}
	});

	return {
		myVoteOptionIds: normalizedVotes.map((vote) => vote.optionId),
		myVotes: normalizedVotes,
		myChipGrants: grants,
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
			await syncParticipationWithActiveReadings(
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
		void syncSittingReadingSchedule(db, updated.slug);

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

		// Members removed as DNF still take the DNF penalty when the sitting ends.
		const participants = await tx.participation.findMany({
			where: {
				sittingId: sitting.id,
				OR: [activeParticipationWhere, { progress: "dnf" }],
			},
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
		// Any club deadline hour (14/17/20/23) is allowed; other times snap forward.
		const newDeadline = snapPollDeadlineOnOrAfter(
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
		void syncSittingReadingSchedule(db, sitting.slug, {
			deadlineChanged: true,
		});
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
			selectedBookId: true,
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
		await ensureReadForSittingCompletion(db, sitting.id, userId);
	}

	// "In progress" on the sitting means the member is reading the book.
	if (
		input.progress === "in_progress" &&
		previousProgress !== "in_progress" &&
		sitting.selectedBookId
	) {
		await ensureReadingForSitting(db, userId, sitting.selectedBookId);
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
			selectedBookId: true,
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
						xp: true,
						rp: true,
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
					xp: true,
					rp: true,
				},
			});

			if (refreshedUser) {
				row.user = refreshedUser;
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
		await ensureReadForSittingCompletion(db, sitting.id, input.userId);
	}

	if (
		previousProgress === "completed" &&
		input.progress !== "completed" &&
		sitting.selectedBookId
	) {
		await deleteReadForUserBook(input.userId, sitting.selectedBookId, db);
	}

	const levels = userMemberLevelsFromPoints(updated.user.xp, updated.user.rp);

	return {
		userId: updated.userId,
		username: updated.user.username,
		name: updated.user.name,
		image: updated.user.image,
		status: updated.user.status,
		xp: updated.user.xp,
		rp: updated.user.rp,
		xpLevel: levels.xpLevel,
		rpLevel: levels.rpLevel,
		progress: updated.progress,
		rpChange: null,
		pollChipRank: null,
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

/** Members who turned off "add me automatically" cannot be picked; they can be invited instead. */
async function assertMembersAllowBeingAdded(
	db: Database,
	userIds: string[],
	actorId?: string,
) {
	const blocked = await db.user.findMany({
		where: {
			id: { in: userIds, ...(actorId ? { not: actorId } : {}) },
			allowSittingAutoAdd: false,
		},
		select: { name: true, username: true },
	});
	if (blocked.length > 0) {
		const names = blocked.map((user) => user.name || user.username).join(", ");
		throw new ORPCError("BAD_REQUEST", {
			message: `${names} ${blocked.length === 1 ? "does" : "do"} not allow being added to sittings. Invite ${blocked.length === 1 ? "them" : "them"} once the sitting exists instead.`,
		});
	}
}

export async function addSittingParticipant(
	input: SittingParticipantMutationInput,
	db: Database,
	actorId?: string,
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
		select: {
			id: true,
			name: true,
			username: true,
			status: true,
			isHidden: true,
			allowSittingAutoAdd: true,
		},
	});

	if (!user) {
		throw new ORPCError("NOT_FOUND", {
			message: "User not found",
		});
	}

	if (user.isHidden) {
		throw new ORPCError("NOT_FOUND", {
			message: "User not found",
		});
	}

	if (!user.allowSittingAutoAdd && user.id !== actorId) {
		throw new ORPCError("FORBIDDEN", {
			message: `${user.name || user.username} does not allow being added to sittings. Send them an invitation instead.`,
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
	// Recovering a removed member is an admin call; only new joins are blocked.
	if (!existing && user.status === "banned") {
		throw new ORPCError("BAD_REQUEST", {
			message: "Banned members cannot join a sitting",
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
					joinedAt: new Date(),
					joinSource: "organiser",
					inviteLinkId: null,
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

	if (input.userId !== actorId) {
		void notifyAddedToSitting(db, input.slug, input.userId);
	}

	return { ok: true };
}

async function notifyAddedToSitting(
	db: Database,
	slug: string,
	userId: string,
) {
	try {
		const sitting = await db.sitting.findUnique({
			where: { slug },
			select: {
				slug: true,
				status: true,
				selectedBook: { select: { title: true } },
			},
		});
		if (!sitting) return;
		await dispatchNotification(db, {
			kind: "sitting_added",
			recipientUserIds: [userId],
			title: "You were added to a sitting",
			body: `An organiser added you to ${formatSittingDisplayName(sitting.slug, sitting.status, sitting.selectedBook?.title ?? null)}.`,
			href: `/sittings/${sitting.slug}`,
		});
	} catch (error) {
		console.error("sitting added notification failed", error);
	}
}

export async function removeSittingParticipant(
	input: RemoveSittingParticipantInput,
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
		const key = {
			userId_sittingId: { userId: input.userId, sittingId: sitting.id },
		};

		if (input.mode === "remove") {
			await tx.participation.delete({ where: key });
		} else {
			await tx.participation.update({
				where: key,
				data: { removedAt, progress: "dnf" },
			});
		}

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
			points: true,
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
			points: vote.points as 1 | 2 | 3,
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
					isHidden: true,
				},
			},
		},
	});

	const visibleReads = reads.filter((read) => !read.user.isHidden);

	return {
		bookTitle,
		participantCount: uniqueParticipantIds.length,
		readers: visibleReads.map((read) => ({
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
			points: true,
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
			points: vote.points as 1 | 2 | 3,
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
