import type { Session } from "@bbrc/auth";
import type { Database, DatabaseTransaction, Prisma } from "@bbrc/db";
import { LikeSourceSchema } from "@bbrc/schemas";
import { ORPCError } from "@orpc/server";
import { definePagination } from "../../utils/pagination";
import {
	clubReadEligibilityHint,
	userCompletedClubRead,
} from "../book/book-read-eligibility";
import { notifyMemberFeedbackOnBook } from "../notification/notification-triggers";
import {
	assertContentNotVisible,
	loadActorSocialGate,
	viewerFromSession,
	visibleOnSiteUserWhere,
} from "../user/user-visibility";
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
} from "./feedback.schema";
import {
	getFeedbackBySlugFields,
	getUserFeedbackListFields,
} from "./feedback.schema";
import { generateFeedbackSlug } from "./feedback-slug";

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

function viewerUserId(session: Session | null): string | null {
	return session?.user.id ?? null;
}

export async function getBookFeedbackList(
	input: { bookSlug: string; minRating?: number },
	db: Database,
	session: Session | null,
): Promise<GetBookFeedbackListOutput> {
	const book = await loadBookBySlug(input.bookSlug, db);
	const userId = viewerUserId(session);

	const feedbacks = await db.feedback.findMany({
		where: {
			bookId: book.id,
			author: visibleOnSiteUserWhere,
			...(input.minRating !== undefined
				? { rating: { gte: input.minRating } }
				: {}),
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
		userId,
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
	session: Session | null,
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

	const author = await db.user.findUnique({
		where: { id: feedback.authorId },
		select: { id: true, isHidden: true },
	});

	assertContentNotVisible(
		author ?? { id: feedback.authorId, isHidden: true },
		viewerFromSession(session),
		"Feedback not found",
		{ slug },
	);

	const userId = session?.user.id ?? null;
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

	return {
		slug: feedback.slug,
		review: feedback.review,
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

	const pagination = definePagination.cursor(
		input,
		userFeedbackListCursorCodec,
	);

	const rows = await db.feedback.findMany({
		...pagination.use(),
		where: { authorId: user.id },
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		select: getUserFeedbackListFields,
	});

	return pagination.paginate(rows);
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
	await loadActorSocialGate(userId, db);

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

	return db
		.$transaction(async (tx) => {
			const feedbackSlug = await generateFeedbackSlug(input.review, tx);

			const feedback = await tx.feedback.create({
				data: {
					slug: feedbackSlug,
					authorId: userId,
					bookId: book.id,
					rating: input.rating,
					review: input.review.trim(),
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

			return { slug: feedback.slug, xpAwarded };
		})
		.then(async (result) => {
			void notifyMemberFeedbackOnBook(db, input.bookSlug, userId);
			return result;
		});
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
