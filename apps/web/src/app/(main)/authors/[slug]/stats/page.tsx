import type { Metadata, Route } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { AuthorTabStats } from "@/components/blocks/author/author-tab-stats";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { loadAuthorForIsr } from "@/lib/isr-data";
import { buildNotFoundMetadata } from "@/lib/seo";
import { buildAuthorPageMetadata } from "@/lib/seo/author-page-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: PageProps<"/authors/[slug]/stats">): Promise<Metadata> {
	const { slug } = await params;
	try {
		const author = await loadAuthorForIsr(slug);
		return buildAuthorPageMetadata(author, {
			title: "Stats",
			description: `Club ratings, readers and reading time for ${author.profile.name}.`,
			segment: "stats",
		});
	} catch {
		return buildNotFoundMetadata("Author");
	}
}

export default async function AuthorStatsPage({
	params,
}: PageProps<"/authors/[slug]/stats">) {
	const { slug } = await params;
	const author = await loadAuthorForIsr(slug).catch(() => null);
	if (!author) {
		notFound();
	}
	if (author.redirectTo) {
		permanentRedirect(`/authors/${author.redirectTo}/stats` as Route);
	}

	return (
		<ListingSearchParamsBoundary>
			<AuthorTabStats
				slug={author.profile.slug}
				authorName={author.profile.name}
			/>
		</ListingSearchParamsBoundary>
	);
}
