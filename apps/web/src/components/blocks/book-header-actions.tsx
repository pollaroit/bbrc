"use client";

import { BookAddToShelfDialog } from "@/components/blocks/book-add-to-shelf-dialog";
import { BookFavoriteButton } from "@/components/blocks/book-favorite-button";
import { BookHeaderWriteFeedback } from "@/components/blocks/book-header-write-feedback";
import { authClient } from "@/lib/auth-client";

type BookHeaderActionsProps = {
	bookSlug: string;
	bookTitle: string;
};

/**
 * The tinted, labelled buttons of the book page dock: shelf (blue), feedback
 * (violet) and favorite (pink). A fragment, so the dock lays them out.
 */
export function BookHeaderActions({
	bookSlug,
	bookTitle,
}: BookHeaderActionsProps) {
	const { data: session } = authClient.useSession();
	const username = session?.user.username;

	return (
		<>
			{username ? (
				<BookAddToShelfDialog
					bookSlug={bookSlug}
					username={username}
					trigger="deck"
				/>
			) : null}
			<BookHeaderWriteFeedback bookSlug={bookSlug} deck />
			<BookFavoriteButton
				bookSlug={bookSlug}
				bookTitle={bookTitle}
				variant="deck"
			/>
		</>
	);
}
