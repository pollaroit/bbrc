import type { Database, DatabaseTransaction, Prisma } from "@bbrc/db";
import { LikeSourceSchema } from "@bbrc/schemas";
import type { Viewer } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { normalizeFeedbackReview } from "../../lib/feedback-review";
import { definePagination } from "../../utils/pagination";
import { mergeWhereFragments } from "../../utils/searching";
import {
	clubReadEligibilityHint,
	userCompletedClubRead,
} from "../book/book-read-eligibility";
import { warmLinkPreviewsInContent } from "../link-unfurl/link-unfurl.service";
import {
	loadMentionedIds,
	notifyMentions,
	prepareContentMentions,
	syncContentMentions,
} from "../mention/mention.service";
import { notifyMemberFeedbackOnBook } from "../notification/notification-triggers";
import { loadReadEditionRefs } from "../read/read-edition-ref";
import {
	canViewerSeeSection,
	isBlockedFrom,
	viewerIdOf,
} from "../read/section-access";
import { reviewVisibleWhere } from "../visibility/visibility-resources";
import { XP_AWARD } from "../xp/xp.schema";
import { awardFeedbackXp } from "../xp/xp.service";
import type {
	CreateFeedbackInput,
	CreateFeedbackOutput,
	DeleteFeedbackInput,
	DeleteFeedbackOutput,
	GetBookFeedbackListOutput,
	GetBookFeedbackStateOutput,
	GetFeedbackBySlugOutput,
	GetUserFeedbackListInput,
	GetUserFeedbackListOutput,
	UpdateFeedbackInput,
	UpdateFeedbackOutput,
} from "./feedback.schema";
import {
	getFeedbackBySlugFields,
	getUserFeedbackListFields,
} from "./feedback.schema";
import { generateFeedbackSlug } from "./feedback-slug";
import {
	userFeedbackListRanging,
	userFeedbackListSearching,
	userFeedbackListSorting,
	userFeedbackReviewTypeWhere,
} from "./user-feedback.listing";

async function loadBookBySlug(slug: string, db: Database) {
	const book = await db.book.findUnique({
		where: { slug },
		select: { id: true, slug: true },
	});

	if (!book) {
		throw new ORPCError("NOT_FOUND", {
			message: "Book not found",
			data: { slug },
		});
	}

	return book;
}

async function canUserSubmitFeedback(
	userId: string,
	bookId: string,
	db: Database,
): Promise<boolean> {
	return userCompletedClubRead(userId, bookId, db);
}

function feedbackEligibilityHint(
	userId: string,
	bookId: string,
	db: Database,
): Promise<string> {
	return clubReadEligibilityHint(userId, bookId, db).then((hint) => {
		if (hint.startsWith("Only participants")) {
			return "Only participants of a sitting that chose this book can leave feedback.";
		}
		if (hint.startsWith("Mark yourself")) {
			return "Mark yourself as completed on that sitting's page, then you can submit feedback here.";
		}
		return "You cannot submit feedback for this book right now.";
	});
}

function viewerUserId(viewer: Viewer): string | null {
	return viewerIdOf(viewer);
}

function feedbackListOrderBy(
	sortBy: "createdAt" | "rating" | undefined,
	sortDirection: "asc" | "desc" | undefined,
): Prisma.FeedbackOrderByWithRelationInput[] {
	const field = sortBy ?? "createdAt";
	const direction = sortDirection ?? "desc";

	if (field === "rating") {
		return [{ rating: direction }, { createdAt: "desc" }, { id: "desc" }];
	}

	return [{ createdAt: direction }, { id: direction }];
}

export async function getBookFeedbackList(
	input: {
		bookSlug: string;
		minRating?: number;
		sortBy?: "createdAt" | "rating";
		sortDirection?: "asc" | "desc";
	},
	db: Database,
	viewer: Viewer,
): Promise<GetBookFeedbackListOutput> {
	const book = await loadBookBySlug(input.bookSlug, db);
	const userId = viewerUserId(viewer);

	const feedbacks = await db.feedback.findMany({
		where: {
			bookId: book.id,
			AND: [reviewVisibleWhere(viewer) as Prisma.FeedbackWhereInput],
			...(input.minRating !== undefined
				? { rating: { gte: input.minRating } }
				: {}),
		},
		orderBy: feedbackListOrderBy(input.sortBy, input.sortDirection),
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
		userId,
		db,
	);
	const editionRefs = await loadReadEditionRefs(
		db,
		feedbacks.map((row) => ({ userId: row.authorId, bookId: book.id })),
	);

	return feedbacks.map((feedback) => ({
		readEdition: editionRefs.get(`${feedback.authorId}|${book.id}`) ?? null,
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

export async function loadLikedFeedbackIdsForViewer(
	feedbackIds: string[],
	userId: string | null,
	db: Database,
): Promise<Set<string>> {
	if (!userId || feedbackIds.length === 0) {
		return new Set();
	}

	const likes = await db.like.findMany({
		where: {
			userId,
			source: LikeSourceSchema.enum.feedback,
			feedbackId: { in: feedbackIds },
		},
		select: { feedbackId: true },
	});

	return new Set(
		likes.map((row) => row.feedbackId).filter((id): id is string => id != null),
	);
}

export async function getFeedbackBySlug(
	slug: string,
	db: Database,
	viewer: Viewer,
): Promise<GetFeedbackBySlugOutput> {
	const feedback = await db.feedback.findUnique({
		where: { slug },
		select: getFeedbackBySlugFields,
	});

	if (!feedback) {
		throw new ORPCError("NOT_FOUND", {
			message: "Feedback not found",
			data: { slug },
		});
	}

	const visible =
		!isBlockedFrom(viewer, feedback.authorId) &&
		(await canViewerSeeSection(db, viewer, feedback.authorId, "reviews"));
	if (!visible) {
		throw new ORPCError("NOT_FOUND", {
			message: "Feedback not found",
			data: { slug },
		});
	}

	const userId = viewerUserId(viewer);
	const likedFeedbackIds = await loadLikedFeedbackIdsForViewer(
		[feedback.id],
		userId,
		db,
	);

	const sitting = await db.sitting.findFirst({
		where: { selectedBookId: feedback.bookId },
		select: { slug: true },
		orderBy: { createdAt: "desc" },
	});
	const permalinkEdition = (
		await loadReadEditionRefs(db, [
			{ userId: feedback.authorId, bookId: feedback.bookId },
		])
	).get(`${feedback.authorId}|${feedback.bookId}`);

	return {
		readEdition: permalinkEdition ?? null,
		slug: feedback.slug,
		review: feedback.review,
		isSpoiler: feedback.isSpoiler,
		imageUrl: feedback.imageUrl,
		rating: feedback.rating,
		createdAt: feedback.createdAt,
		bookSlug: feedback.book.slug,
		bookTitle: feedback.book.title,
		author: feedback.author,
		likeCount: feedback._count.likes,
		likedByMe: likedFeedbackIds.has(feedback.id),
		commentCount: feedback._count.comments,
		sittingSlug: sitting?.slug ?? null,
	};
}

type UserFeedbackListRow = Prisma.FeedbackGetPayload<{
	select: typeof getUserFeedbackListFields;
}>;

const userFeedbackListCursorCodec = {
	decode(cursor: string): { id: string } {
		return { id: cursor };
	},
	encode(item: UserFeedbackListRow): string {
		return item.id;
	},
};

export async function getUserFeedbackList(
	input: GetUserFeedbackListInput,
	db: Database,
	viewer: Viewer,
): Promise<GetUserFeedbackListOutput> {
	const user = await db.user.findUnique({
		where: { username: input.username },
		select: { id: true },
	});

	if (!user) {
		throw new ORPCError("NOT_FOUND", {
			message: "User not found",
			data: { username: input.username },
		});
	}

	if (isBlockedFrom(viewer, user.id)) {
		throw new ORPCError("NOT_FOUND", {
			message: "User not found",
			data: { username: input.username },
		});
	}

	const viewerId = viewerUserId(viewer);
	if (input.mutualOnly && !viewerId) {
		throw new ORPCError("UNAUTHORIZED", {
			message: "Sign in to filter by mutual reviews.",
		});
	}

	const pagination = definePagination.cursor(
		input,
		userFeedbackListCursorCodec,
	);
	if (!(await canViewerSeeSection(db, viewer, user.id, "reviews"))) {
		const empty = pagination.paginate([]);
		return {
			items: [],
			metadata: { ...empty.metadata, total: 0 },
			hidden: true,
		};
	}
	const sorting = userFeedbackListSorting.from(input);
	const ranging = userFeedbackListRanging.from(input);
	const searching = userFeedbackListSearching.from(input);

	const where = mergeWhereFragments<Prisma.FeedbackWhereInput>(
		{ authorId: user.id },
		ranging.use(),
		searching.use(),
		userFeedbackReviewTypeWhere(input.reviewType),
		input.minRating != null || input.maxRating != null
			? {
					rating: {
						...(input.minRating != null ? { gte: input.minRating } : {}),
						...(input.maxRating != null ? { lte: input.maxRating } : {}),
					},
				}
			: {},
		input.spoilers === "only" ? { isSpoiler: true } : {},
		input.spoilers === "hide" ? { isSpoiler: false } : {},
		input.mutualOnly && viewerId
			? { book: { feedbacks: { some: { authorId: viewerId } } } }
			: {},
	);

	const isFirstPage = input.cursor == null;

	const [rows, total] = await Promise.all([
		db.feedback.findMany({
			...pagination.use(),
			where,
			orderBy: [sorting.use(), { id: sorting.sortDirection }],
			select: getUserFeedbackListFields,
		}),
		isFirstPage ? db.feedback.count({ where }) : Promise.resolve(undefined),
	]);

	const page = pagination.paginate(rows);
	const userEditionRefs = await loadReadEditionRefs(
		db,
		page.items.map((row) => ({ userId: user.id, bookId: row.bookId })),
	);

	return {
		items: page.items.map(({ _count, id: _id, bookId, ...item }) => ({
			...item,
			likeCount: _count.likes,
			commentCount: _count.comments,
			readEdition: userEditionRefs.get(`${user.id}|${bookId}`) ?? null,
		})),
		metadata: {
			...page.metadata,
			...(total != null ? { total } : {}),
		},
	};
}

export async function getBookFeedbackState(
	bookSlug: string,
	userId: string,
	db: Database,
): Promise<GetBookFeedbackStateOutput> {
	const book = await loadBookBySlug(bookSlug, db);

	const myFeedback = await db.feedback.findUnique({
		where: {
			authorId_bookId: {
				authorId: userId,
				bookId: book.id,
			},
		},
		select: {
			slug: true,
			rating: true,
			review: true,
			isSpoiler: true,
			imageUrl: true,
			createdAt: true,
		},
	});

	if (myFeedback) {
		return { canSubmit: false, myFeedback, hint: null };
	}

	const canSubmit = await canUserSubmitFeedback(userId, book.id, db);

	if (canSubmit) {
		return { canSubmit: true, myFeedback: null, hint: null };
	}

	const hint = await feedbackEligibilityHint(userId, book.id, db);

	return { canSubmit: false, myFeedback: null, hint };
}

async function recalculateBookAverageRating(
	bookId: string,
	tx: DatabaseTransaction,
): Promise<void> {
	const ratings = await tx.feedback.findMany({
		where: { bookId },
		select: { rating: true },
	});

	if (ratings.length === 0) {
		await tx.book.update({
			where: { id: bookId },
			data: { averageRating: null },
		});
		return;
	}

	const average =
		ratings.reduce((sum, row) => sum + row.rating, 0) / ratings.length;

	await tx.book.update({
		where: { id: bookId },
		data: { averageRating: Math.round(average * 10) / 10 },
	});
}

export async function createFeedback(
	input: CreateFeedbackInput,
	userId: string,
	db: Database,
): Promise<CreateFeedbackOutput> {
	const book = await loadBookBySlug(input.bookSlug, db);

	const existing = await db.feedback.findUnique({
		where: {
			authorId_bookId: {
				authorId: userId,
				bookId: book.id,
			},
		},
		select: { id: true },
	});

	if (existing) {
		throw new ORPCError("CONFLICT", {
			message: "You already left feedback for this book",
		});
	}

	const eligible = await canUserSubmitFeedback(userId, book.id, db);

	if (!eligible) {
		throw new ORPCError("FORBIDDEN", {
			message:
				"Mark the book completed on the sitting page before leaving feedback",
		});
	}

	const prepared = await prepareContentMentions(db, {
		content: normalizeFeedbackReview(input.review),
		authorId: userId,
		audience: { ownerId: userId, section: "reviews" },
	});
	const review = prepared.content;
	// Outside links get their preview ready now (bounded; never fails the save).
	await warmLinkPreviewsInContent(db, userId, review);

	return db
		.$transaction(async (tx) => {
			const feedbackSlug = await generateFeedbackSlug(review, tx);

			const feedback = await tx.feedback.create({
				data: {
					slug: feedbackSlug,
					authorId: userId,
					bookId: book.id,
					rating: input.rating,
					review,
					isSpoiler: input.isSpoiler ?? false,
				},
				select: { id: true, slug: true },
			});

			await recalculateBookAverageRating(book.id, tx);

			const xpAwarded = (await awardFeedbackXp(
				{ userId, feedbackId: feedback.id },
				tx,
			))
				? XP_AWARD.feedback
				: 0;

			const freshMentions = await syncContentMentions(tx, {
				ref: { kind: "review", id: feedback.id },
				authorId: userId,
				mentioned: prepared.mentioned,
			});

			return { slug: feedback.slug, xpAwarded, freshMentions };
		})
		.then(async (result) => {
			void notifyMentions(db, {
				authorId: userId,
				recipientIds: result.freshMentions,
				content: review,
				href: `/books/${input.bookSlug}/feedbacks/${result.slug}`,
			});
			// A member who is mentioned gets the mention, not also the "new review" notice.
			void notifyMemberFeedbackOnBook(
				db,
				input.bookSlug,
				userId,
				result.freshMentions,
			);
			return { slug: result.slug, xpAwarded: result.xpAwarded };
		});
}

export async function updateFeedback(
	input: UpdateFeedbackInput,
	userId: string,
	db: Database,
): Promise<UpdateFeedbackOutput> {
	const book = await loadBookBySlug(input.bookSlug, db);

	const existing = await db.feedback.findUnique({
		where: {
			authorId_bookId: {
				authorId: userId,
				bookId: book.id,
			},
		},
		select: { id: true, slug: true },
	});

	if (!existing) {
		throw new ORPCError("NOT_FOUND", {
			message: "You have not left feedback for this book",
			data: { bookSlug: input.bookSlug },
		});
	}

	const prepared = await prepareContentMentions(db, {
		content: normalizeFeedbackReview(input.review),
		authorId: userId,
		audience: { ownerId: userId, section: "reviews" },
		alreadyMentionedIds: await loadMentionedIds(db, {
			kind: "review",
			id: existing.id,
		}),
	});
	const review = prepared.content;
	// Outside links get their preview ready now (bounded; never fails the save).
	await warmLinkPreviewsInContent(db, userId, review);

	const freshMentions = await db.$transaction(async (tx) => {
		await tx.feedback.update({
			where: { id: existing.id },
			data: {
				rating: input.rating,
				review,
				isSpoiler: input.isSpoiler ?? false,
			},
		});
		await recalculateBookAverageRating(book.id, tx);
		return syncContentMentions(tx, {
			ref: { kind: "review", id: existing.id },
			authorId: userId,
			mentioned: prepared.mentioned,
		});
	});

	void notifyMentions(db, {
		authorId: userId,
		recipientIds: freshMentions,
		content: review,
		href: `/books/${input.bookSlug}/feedbacks/${existing.slug}`,
	});

	return { slug: existing.slug };
}

export async function deleteFeedback(
	input: DeleteFeedbackInput,
	userId: string,
	db: Database,
): Promise<DeleteFeedbackOutput> {
	const book = await loadBookBySlug(input, db);

	const feedback = await db.feedback.findUnique({
		where: {
			authorId_bookId: {
				authorId: userId,
				bookId: book.id,
			},
		},
		select: { id: true },
	});

	if (!feedback) {
		throw new ORPCError("NOT_FOUND", {
			message: "You have not left feedback for this book",
			data: { bookSlug: input },
		});
	}

	await db.$transaction(async (tx) => {
		await tx.feedback.delete({
			where: { id: feedback.id },
		});
		await recalculateBookAverageRating(book.id, tx);
	});

	return { deleted: true };
}
