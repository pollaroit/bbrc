"use client";

import { ReadingCard } from "@/components/blocks/reading/reading-card";
import { authClient } from "@/lib/auth-client";
import { useReadingState } from "@/lib/reading/use-reading";

/*
 * The block on the book page that shows up once you are reading the book. It
 * is the same reading card as everywhere else, without the cover and title
 * (this is that book's page): progress, the page you are on, Reading Mode,
 * Change edition and Finished.
 *
 * <BookReadingStrip bookSlug />
 * Renders nothing when signed out or when you are not reading this book.
 */

type Props = {
	bookSlug: string;
	/** Kept for the callers; the card reads what it needs from the reading. */
	bookTitle?: string;
	bookPages?: number;
};

export function BookReadingStrip({ bookSlug }: Props) {
	const { data: session } = authClient.useSession();
	const state = useReadingState(bookSlug, Boolean(session?.user));
	const reading = state.data?.reading;
	if (!session?.user || !reading) return null;

	return <ReadingCard reading={reading} showBook={false} />;
}
