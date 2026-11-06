import type { Database } from "@bbrc/db";
import { bookHideBlockedMessage } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";

/**
 * Hides a book from sittings, or offers it to them again. Hiding is refused while a
 * sitting has claimed the book (see `bookHideBlockers`); unhiding is always allowed.
 * Nothing else about the book changes.
 */
export async function setBookHidden(
	input: { slug: string; hidden: boolean },
	db: Database,
): Promise<{ slug: string; hidden: boolean }> {
	const book = await db.book.findUnique({
		where: { slug: input.slug },
		select: { id: true, status: true, hidden: true },
	});

	if (!book) {
		throw new ORPCError("NOT_FOUND", {
			message: "Book not found",
			data: { slug: input.slug },
		});
	}

	if (input.hidden && !book.hidden) {
		const [selectedForSitting, onVotingPoll] = await Promise.all([
			db.sitting.count({ where: { selectedBookId: book.id } }),
			db.sitting.count({
				where: {
					status: "voting",
					poll: { options: { some: { bookId: book.id } } },
				},
			}),
		]);
		const blocked = bookHideBlockedMessage({
			status: book.status,
			selectedForSitting: selectedForSitting > 0,
			onVotingPoll: onVotingPoll > 0,
		});
		if (blocked) {
			throw new ORPCError("CONFLICT", {
				message: blocked,
				data: { slug: input.slug },
			});
		}
	}

	if (book.hidden !== input.hidden) {
		await db.book.update({
			where: { id: book.id },
			data: { hidden: input.hidden },
		});
	}

	return { slug: input.slug, hidden: input.hidden };
}
