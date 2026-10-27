import type { Metadata } from "next";

/** Member favorites change often; do not serve a stale ISR snapshot. */
export const dynamic = "force-dynamic";

import { BookFavoritesPanel } from "@/components/blocks/book-favorites-panel";
import { loadBookBySlugForIsr, loadBookFavoritesForIsr } from "@/lib/isr-data";
import {
	buildBookTabMetadata,
	buildNotFoundMetadata,
} from "@/lib/seo/book-page-metadata";

export async function generateMetadata({
	params,
}: PageProps<"/[locale]/books/[slug]">): Promise<Metadata> {
	const { slug } = await params;

	try {
		const book = await loadBookBySlugForIsr(slug);
		return buildBookTabMetadata(book, {
			title: "Favorites",
			description: `Members who added ${book.title} to their favorites.`,
			segment: "favorites",
		});
	} catch {
		return buildNotFoundMetadata("Book");
	}
}

export default async function BookFavoritesPage({
	params,
}: PageProps<"/[locale]/books/[slug]">) {
	const { slug } = await params;
	const favorites = await loadBookFavoritesForIsr(slug);

	return <BookFavoritesPanel bookSlug={slug} initialData={favorites} />;
}
