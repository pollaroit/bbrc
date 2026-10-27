import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthorPageEmpty } from "@/components/blocks/author/author-page-bits";
import { AuthorPageMoreGrid } from "@/components/blocks/author/author-page-more";
import { loadAuthorForIsr, loadAuthorMoreForIsr } from "@/lib/isr-data";
import { buildNotFoundMetadata } from "@/lib/seo";
import { buildAuthorPageMetadata } from "@/lib/seo/author-page-metadata";

export async function generateMetadata({
	params,
}: PageProps<"/[locale]/authors/[slug]/more">): Promise<Metadata> {
	const { slug } = await params;
	try {
		const author = await loadAuthorForIsr(slug);
		return buildAuthorPageMetadata(author, {
			title: "Similar authors",
			description: `Authors like ${author.profile.name}: same country, same era, or read by the same members.`,
			segment: "more",
		});
	} catch {
		return buildNotFoundMetadata("Author");
	}
}

export default async function AuthorMorePage({
	params,
}: PageProps<"/[locale]/authors/[slug]/more">) {
	const { slug } = await params;
	const more = await loadAuthorMoreForIsr(slug).catch(() => null);
	if (!more) {
		notFound();
	}

	return more.items.length === 0 ? (
		<AuthorPageEmpty>
			No similar authors yet. They appear as more authors join the library and
			members read across them.
		</AuthorPageEmpty>
	) : (
		<AuthorPageMoreGrid items={more.items} />
	);
}
