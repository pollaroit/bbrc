import type { Database } from "../index.js";

export async function resetDatabase(db: Database): Promise<void> {
	await db.pollVote.deleteMany();
	await db.pollOption.deleteMany();
	await db.poll.deleteMany();
	await db.participation.deleteMany();
	await db.feedback.deleteMany();
	await db.rPEvent.deleteMany();
	await db.xPEvent.deleteMany();
	await db.like.deleteMany();
	await db.comment.deleteMany();
	await db.post.deleteMany();
	await db.favorite.deleteMany();
	await db.shelfBook.deleteMany();
	await db.shelf.deleteMany();
	await db.notification.deleteMany();
	await db.notificationPreference.deleteMany();
	await db.document.deleteMany();
	await db.bookRequest.deleteMany();
	await db.sitting.deleteMany();
	await db.book.deleteMany();
	await db.session.deleteMany();
	await db.account.deleteMany();
	await db.verification.deleteMany();
	await db.user.deleteMany();
}
