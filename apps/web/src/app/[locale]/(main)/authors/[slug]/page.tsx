import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { AuthorPageBio } from "@/components/blocks/author/author-page-about";
import {
	AuthorPageEmpty,
	AuthorPageSection,
} from "@/components/blocks/author/author-page-bits";
import { AuthorPageLibrary } from "@/components/blocks/author/author-page-library";
import { AuthorPageLifeline } from "@/components/blocks/author/author-page-lifeline";
import { AuthorPageMoreGrid } from "@/components/blocks/author/author-page-more";
import { AuthorPageProgress } from "@/components/blocks/author/author-page-progress";
import {
	loadAuthorForIsr,
	loadAuthorMoreForIsr,
	loadAuthorTopBooksForIsr,
} from "@/lib/isr-data";
import { buildNotFoundMetadata } from "@/lib/seo";
import { buildAuthorPageMetadata } from "@/lib/seo/author-page-metadata";

export async function generateMetadata({
	params,
}: PageProps<"/[locale]/authors/[slug]">): Promise<Metadata> {
	const { slug } = await params;
	try {
		return buildAuthorPageMetadata(await loadAuthorForIsr(slug));
	} catch {
		return buildNotFoundMetadata("Author");
	}
}

export default async function AuthorOverviewPage({
	params,
}: PageProps<"/[locale]/authors/[slug]">) {
	const { slug } = await params;
	const author = await loadAuthorForIsr(slug).catch(() => null);
	if (!author) {
		notFound();
	}

	const [books, more] = await Promise.all([
		loadAuthorTopBooksForIsr(slug),
		loadAuthorMoreForIsr(slug),
	]);
	const { profile, seriesSummary } = author;
	const base = `/authors/${profile.slug}`;

	// The most read books first; ties by title keep the strip steady.
	const topBooks = [...books.items]
		.sort((a, b) => b.readCount - a.readCount || a.title.localeCompare(b.title))
		.slice(0, 12);

	return (
		<div className="flex flex-col gap-8">
			<AuthorPageProgress slug={profile.slug} />

			{profile.bio ? (
				<AuthorPageSection
					title="About"
					href={`${base}/about` as Route}
					hrefLabel="Read more"
				>
					<AuthorPageBio profile={profile} excerpt />
				</AuthorPageSection>
			) : null}

			<AuthorPageLifeline
				birth={profile.birth}
				death={profile.death}
				books={books.items.map((book) => ({
					slug: book.slug,
					title: book.title,
					publishedIn: book.publishedIn,
					coverId: book.coverId ?? null,
					averageRating: book.averageRating,
					readCount: book.readCount,
				}))}
				currentYear={new Date().getFullYear()}
			/>

			<AuthorPageSection
				title="Books in the library"
				description={seriesSummary.line ?? undefined}
				href={`${base}/books` as Route}
			>
				{topBooks.length === 0 ? (
					<AuthorPageEmpty>
						No books by this author in the library yet.
					</AuthorPageEmpty>
				) : (
					<AuthorPageLibrary
						books={topBooks.map((book) => ({
							slug: book.slug,
							title: book.title,
							publishedIn: book.publishedIn,
							coverId: book.coverId ?? null,
							averageRating: book.averageRating,
							readCount: book.readCount,
							series: book.series
								? { title: book.series.title, position: book.series.position }
								: null,
						}))}
					/>
				)}
			</AuthorPageSection>

			{more.items.length > 0 ? (
				<AuthorPageSection
					title="Similar authors"
					href={`${base}/more` as Route}
				>
					<AuthorPageMoreGrid items={more.items.slice(0, 4)} />
				</AuthorPageSection>
			) : null}
		</div>
	);
}
