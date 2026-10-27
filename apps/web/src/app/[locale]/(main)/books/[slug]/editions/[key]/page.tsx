import { parseEditionKey } from "@bbrc/shared";
import type { Metadata, Route } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { EditionActions } from "@/components/blocks/edition-page/edition-actions";
import { EditionAdminTools } from "@/components/blocks/edition-page/edition-admin-tools";
import { EditionCompare } from "@/components/blocks/edition-page/edition-compare";
import { EditionDetails } from "@/components/blocks/edition-page/edition-details";
import { EditionHero } from "@/components/blocks/edition-page/edition-hero";
import { EditionLinks } from "@/components/blocks/edition-page/edition-links";
import { EditionOthers } from "@/components/blocks/edition-page/edition-others";
import { EditionReaders } from "@/components/blocks/edition-page/edition-readers";
import { EditionRemoved } from "@/components/blocks/edition-page/edition-removed";
import { EditionReviews } from "@/components/blocks/edition-page/edition-reviews";
import { EditionStats } from "@/components/blocks/edition-page/edition-stats";
import { Link } from "@/i18n/navigation";
import {
	editionHeadline,
	editionPath,
	editionSeoDescription,
	editionSeoTitle,
} from "@/lib/edition/format";
import { loadEditionLookupForIsr } from "@/lib/edition/load-edition";
import {
	breadcrumbJsonLd,
	buildNotFoundMetadata,
	buildPageMetadata,
	editionJsonLd,
	JsonLd,
	NO_INDEX_ROBOTS,
} from "@/lib/seo";

/** ISR: keep in sync with `DETAIL_PAGE_REVALIDATE_SECONDS` in `@/lib/seo`. */
export const revalidate = 3600;
/** Editions are looked up on demand (Open Library is never fetched at build time). */
export const dynamicParams = true;

export function generateStaticParams() {
	return [];
}

async function load(slug: string, key: string) {
	if (!parseEditionKey(key)) notFound();
	try {
		return await loadEditionLookupForIsr(slug, key);
	} catch {
		notFound();
	}
}

export async function generateMetadata({
	params,
}: PageProps<"/[locale]/books/[slug]/editions/[key]">): Promise<Metadata> {
	const { slug, key } = await params;
	if (!parseEditionKey(key)) return buildNotFoundMetadata("Edition");

	try {
		const lookup = await loadEditionLookupForIsr(slug, key);
		if (lookup.kind === "removed") {
			return buildPageMetadata({
				title: "Edition removed",
				description: "This edition was removed from the BBRC library.",
				robots: NO_INDEX_ROBOTS,
			});
		}
		if (lookup.kind === "redirect") {
			return buildPageMetadata({
				title: "Edition",
				robots: NO_INDEX_ROBOTS,
			});
		}
		const { page } = lookup;
		return buildPageMetadata({
			title: editionSeoTitle(page.book, page.edition),
			description: editionSeoDescription(page),
			path: editionPath(slug, page.edition.key),
			openGraph: { type: "book" },
		});
	} catch {
		return buildNotFoundMetadata("Edition");
	}
}

export default async function EditionPageRoute({
	params,
}: PageProps<"/[locale]/books/[slug]/editions/[key]">) {
	const { slug, key } = await params;
	const lookup = await load(slug, key);

	if (lookup.kind === "redirect") {
		permanentRedirect(editionPath(slug, lookup.key) as Route);
	}
	if (lookup.kind === "removed") {
		return (
			<EditionRemoved bookSlug={lookup.bookSlug} bookTitle={lookup.bookTitle} />
		);
	}

	const { page } = lookup;
	const { book, edition } = page;
	// Same edition under another spelling of its address (a lower-case id): one address only.
	if (edition.key !== key) {
		permanentRedirect(editionPath(slug, edition.key) as Route);
	}

	const path = editionPath(book.slug, edition.key);
	const headline = editionHeadline(book, edition);

	return (
		<div className="flex flex-col gap-8">
			<JsonLd
				data={[
					editionJsonLd({ book, edition, path }),
					breadcrumbJsonLd([
						{ name: "Home", path: "/" },
						{ name: "Books", path: "/books" },
						{ name: book.title, path: `/books/${book.slug}` },
						{ name: "Editions", path: `/books/${book.slug}/editions` },
						{ name: headline, path },
					]),
				]}
			/>

			<nav aria-label="Breadcrumb" className="text-muted-foreground text-sm">
				<ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
					<li>
						<Link
							href={"/books" as Route}
							className="underline-offset-4 hover:underline"
						>
							Books
						</Link>
					</li>
					<li aria-hidden>/</li>
					<li>
						<Link
							href={`/books/${book.slug}` as Route}
							className="underline-offset-4 hover:underline"
						>
							{book.title}
						</Link>
					</li>
					<li aria-hidden>/</li>
					<li>
						<Link
							href={`/books/${book.slug}/editions` as Route}
							className="underline-offset-4 hover:underline"
						>
							Editions
						</Link>
					</li>
					<li aria-hidden>/</li>
					<li aria-current="page" className="min-w-0 truncate text-foreground">
						{headline}
					</li>
				</ol>
			</nav>

			<EditionHero page={page} />
			<EditionActions book={book} edition={edition} />

			<div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-8">
				<div className="flex min-w-0 flex-col gap-10">
					<EditionReaders bookSlug={book.slug} editionKey={edition.key} />
					<EditionStats stats={page.stats} bookSlug={book.slug} />
					<EditionCompare page={page} />
					<EditionReviews bookSlug={book.slug} reviews={page.reviews} />
					<EditionDetails edition={edition} />
				</div>
				<aside className="flex min-w-0 flex-col gap-10 lg:sticky lg:top-24 lg:self-start">
					<EditionLinks links={page.links} />
					<EditionAdminTools book={book} edition={edition} />
				</aside>
			</div>

			<EditionOthers bookSlug={book.slug} items={page.others} />
		</div>
	);
}
