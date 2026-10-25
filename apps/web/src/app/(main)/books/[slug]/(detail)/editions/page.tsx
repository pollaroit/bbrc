import { fetchWorkEditionTotalCount } from "@bbrc/api/lib/open-library/work-editions";
import type { Metadata } from "next";
import { BookEditionsPanel } from "@/components/blocks/book-editions-panel";
import { BookEditionsToolbar } from "@/components/blocks/book-editions-toolbar";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { loadBookBySlugForIsr } from "@/lib/isr-data";
import { truncateDescription } from "@/lib/seo";
import {
	buildBookTabMetadata,
	buildNotFoundMetadata,
} from "@/lib/seo/book-page-metadata";

export async function generateMetadata({
	params,
}: PageProps<"/books/[slug]/editions">): Promise<Metadata> {
	const { slug } = await params;

	try {
		const book = await loadBookBySlugForIsr(slug);
		const editionCount = book.olid
			? await fetchWorkEditionTotalCount(book.olid)
			: null;

		const description =
			editionCount != null && editionCount > 0
				? `${editionCount.toLocaleString("en-US")} Open Library editions for ${book.title} — covers, publishers, languages, and publication dates.`
				: book.olid
					? `Open Library editions for ${book.title} — covers, publishers, and publication dates.`
					: `Edition list unavailable — ${book.title} is not linked to an Open Library work yet.`;

		return buildBookTabMetadata(book, {
			title: "Editions",
			description: truncateDescription(description),
			segment: "editions",
		});
	} catch {
		return buildNotFoundMetadata("Book");
	}
}

export default async function BookEditionsPage({
	params,
}: PageProps<"/books/[slug]/editions">) {
	const { slug } = await params;
	const book = await loadBookBySlugForIsr(slug);

	return (
		<div className="flex flex-col gap-6">
			<ListingSearchParamsBoundary>
				<BookEditionsToolbar />
				<BookEditionsPanel
					bookSlug={slug}
					bookTitle={book.title}
					workOlid={book.olid}
				/>
			</ListingSearchParamsBoundary>
		</div>
	);
}
