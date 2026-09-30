import type { Database, DatabaseTransaction } from "@bbrc/db";
import { ORPCError } from "@orpc/server";
import { notifyMemberFeedbackOnBook } from "../notification/notification-triggers";
import { XP_AWARD } from "../xp/xp.schema";
import { awardFeedbackXp } from "../xp/xp.service";
import type {
	CreateFeedbackInput,
	CreateFeedbackOutput,
	GetBookFeedbackListOutput,
	GetBookFeedbackStateOutput,
} from "./feedback.schema";

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

/** Completed this book as the club read (reading or finished sitting). */
async function canUserSubmitFeedback(
	userId: string,
	bookId: string,
	db: Database,
): Promise<boolean> {
	const participation = await db.participation.findFirst({
		where: {
			userId,
			progress: "completed",
			sitting: {
				selectedBookId: bookId,
				status: { in: ["reading", "finished"] },
			},
		},
		select: { id: true },
	});

	return participation != null;
}

function feedbackEligibilityHint(
	userId: string,
	bookId: string,
	db: Database,
): Promise<string> {
	return db.participation
		.findFirst({
			where: {
				userId,
				sitting: {
					selectedBookId: bookId,
					status: { in: ["reading", "finished"] },
				},
			},
			select: { progress: true },
		})
		.then((participation) => {
			if (!participation) {
				return "Only participants of a sitting that chose this book can leave feedback.";
			}

			if (participation.progress !== "completed") {
				return "Mark yourself as completed on that sitting’s page, then you can submit feedback here.";
			}

			return "You cannot submit feedback for this book right now.";
		});
}

export async function getBookFeedbackList(
	bookSlug: string,
	db: Database,
): Promise<GetBookFeedbackListOutput> {
	const book = await loadBookBySlug(bookSlug, db);

	const feedbacks = await db.feedback.findMany({
		where: { bookId: book.id },
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
			const feedback = await tx.feedback.create({
				data: {
					authorId: userId,
					bookId: book.id,
					rating: input.rating,
					review: input.review.trim(),
				},
			});

			await recalculateBookAverageRating(book.id, tx);

			const xpAwarded = (await awardFeedbackXp(
				{ userId, feedbackId: feedback.id },
				tx,
			))
				? XP_AWARD.feedback
				: 0;

			return { id: feedback.id, xpAwarded };
		})
		.then(async (result) => {
			void notifyMemberFeedbackOnBook(db, input.bookSlug, userId);
			return result;
		});
}
