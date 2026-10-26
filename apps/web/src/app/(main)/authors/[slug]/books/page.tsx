import type { Metadata } from "next";
import { AuthorPageBooks } from "@/components/blocks/author/author-page-books";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { loadAuthorForIsr } from "@/lib/isr-data";
import { buildNotFoundMetadata } from "@/lib/seo";
import { buildAuthorPageMetadata } from "@/lib/seo/author-page-metadata";

export async function generateMetadata({
	params,
}: PageProps<"/authors/[slug]/books">): Promise<Metadata> {
	const { slug } = await params;
	try {
		const author = await loadAuthorForIsr(slug);
		return buildAuthorPageMetadata(author, {
			title: "Books",
			description: `Every book by ${author.profile.name} in the BBRC library, with series, ratings and reads.`,
			segment: "books",
		});
	} catch {
		return buildNotFoundMetadata("Author");
	}
}

export default async function AuthorBooksPage({
	params,
}: PageProps<"/authors/[slug]/books">) {
	const { slug } = await params;
	return (
		<ListingSearchParamsBoundary>
			<AuthorPageBooks slug={slug} />
		</ListingSearchParamsBoundary>
	);
}
