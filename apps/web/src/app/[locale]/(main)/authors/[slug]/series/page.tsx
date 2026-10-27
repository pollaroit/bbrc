import type { Metadata } from "next";
import { AuthorPageSeries } from "@/components/blocks/author/author-page-series";
import { loadAuthorForIsr } from "@/lib/isr-data";
import { buildNotFoundMetadata } from "@/lib/seo";
import { buildAuthorPageMetadata } from "@/lib/seo/author-page-metadata";

export async function generateMetadata({
	params,
}: PageProps<"/[locale]/authors/[slug]/series">): Promise<Metadata> {
	const { slug } = await params;
	try {
		const author = await loadAuthorForIsr(slug);
		return buildAuthorPageMetadata(author, {
			title: "Series",
			description: `Reading series that include books by ${author.profile.name}.`,
			segment: "series",
		});
	} catch {
		return buildNotFoundMetadata("Author");
	}
}

export default async function AuthorSeriesPage({
	params,
}: PageProps<"/[locale]/authors/[slug]/series">) {
	const { slug } = await params;
	return <AuthorPageSeries slug={slug} />;
}
