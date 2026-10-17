"use client";

import { BookAddToShelfDialog } from "@/components/blocks/book-add-to-shelf-dialog";
import { BookFavoriteButton } from "@/components/blocks/book-favorite-button";
import { BookHeaderWriteFeedback } from "@/components/blocks/book-header-write-feedback";
import { BookMarkReadButton } from "@/components/blocks/book-mark-read-button";
import { authClient } from "@/lib/auth-client";

type BookHeaderActionsProps = {
	bookSlug: string;
	bookTitle: string;
};

export function BookHeaderActions({
	bookSlug,
	bookTitle,
}: BookHeaderActionsProps) {
	const { data: session } = authClient.useSession();
	const username = session?.user.username;

	return (
		<div className="flex shrink-0 flex-wrap items-center gap-1">
			<BookMarkReadButton
				bookSlug={bookSlug}
				bookTitle={bookTitle}
				variant="icon"
			/>
			{username ? (
				<BookAddToShelfDialog
					bookSlug={bookSlug}
					username={username}
					trigger="icon"
				/>
			) : null}
			<BookHeaderWriteFeedback bookSlug={bookSlug} />
			<BookFavoriteButton
				bookSlug={bookSlug}
				bookTitle={bookTitle}
				variant="inline"
			/>
		</div>
	);
}
