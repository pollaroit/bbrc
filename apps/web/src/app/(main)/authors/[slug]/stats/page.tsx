import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthorPageStats } from "@/components/blocks/author/author-page-stats";
import { loadAuthorForIsr, loadAuthorStatsForIsr } from "@/lib/isr-data";
import { buildNotFoundMetadata } from "@/lib/seo";
import { buildAuthorPageMetadata } from "@/lib/seo/author-page-metadata";

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
	const stats = await loadAuthorStatsForIsr(slug).catch(() => null);
	if (!stats) {
		notFound();
	}
	return <AuthorPageStats stats={stats} />;
}
