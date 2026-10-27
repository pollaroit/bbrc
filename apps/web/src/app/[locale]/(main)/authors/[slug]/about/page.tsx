import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthorPageAboutPanel } from "@/components/blocks/author/author-page-about";
import { AuthorPageAboutAdminNotes } from "@/components/blocks/author/author-page-about-admin";
import { loadAuthorAboutForIsr, loadAuthorForIsr } from "@/lib/isr-data";
import { buildNotFoundMetadata } from "@/lib/seo";
import { buildAuthorPageMetadata } from "@/lib/seo/author-page-metadata";

export async function generateMetadata({
	params,
}: PageProps<"/[locale]/authors/[slug]/about">): Promise<Metadata> {
	const { slug } = await params;
	try {
		const author = await loadAuthorForIsr(slug);
		return buildAuthorPageMetadata(author, {
			title: "About",
			description: `Biography, dates, places and sources for ${author.profile.name}.`,
			segment: "about",
		});
	} catch {
		return buildNotFoundMetadata("Author");
	}
}

export default async function AuthorAboutPage({
	params,
}: PageProps<"/[locale]/authors/[slug]/about">) {
	const { slug } = await params;
	const [author, about] = await Promise.all([
		loadAuthorForIsr(slug).catch(() => null),
		loadAuthorAboutForIsr(slug).catch(() => null),
	]);
	if (!author || !about) {
		notFound();
	}

	return (
		<AuthorPageAboutPanel profile={author.profile} about={about}>
			<AuthorPageAboutAdminNotes slug={author.profile.slug} />
		</AuthorPageAboutPanel>
	);
}
