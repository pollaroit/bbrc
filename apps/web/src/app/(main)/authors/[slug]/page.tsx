import type { GetAuthorPageOutput } from "@bbrc/api/modules/author/author.schema";
import { getAuthorPage } from "@bbrc/api/modules/author/author.service";
import { isAuthorSlug } from "@bbrc/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthorPageInsights } from "@/components/blocks/author-page-insights";
import { BooksList } from "@/components/blocks/books-list";
import { BooksListingToolbar } from "@/components/blocks/books-listing-toolbar";
import { ResourceShareMenu } from "@/components/blocks/resource-share-menu";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import {
	authorJsonLd,
	buildAuthorPageMetadata,
	buildNotFoundMetadata,
	JsonLd,
} from "@/lib/seo";
import { db } from "@/services";

export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: PageProps<"/authors/[slug]">): Promise<Metadata> {
	const { slug } = await params;

	if (!isAuthorSlug(slug)) {
		return buildNotFoundMetadata("Author");
	}

	try {
		const author = await getAuthorPage(slug, db);
		return buildAuthorPageMetadata(author);
	} catch {
		return buildNotFoundMetadata("Author");
	}
}

export default async function AuthorPage({
	params,
}: PageProps<"/authors/[slug]">) {
	const { slug } = await params;

	if (!isAuthorSlug(slug)) {
		notFound();
	}

	let author: GetAuthorPageOutput;
	try {
		author = await getAuthorPage(slug, db);
	} catch {
		notFound();
	}

	return (
		<div className="flex flex-col gap-8">
			<JsonLd
				data={authorJsonLd({
					name: author.name,
					slug: author.slug,
					bookCount: author.bookCount,
				})}
			/>
			<header className="flex max-w-3xl flex-col gap-2">
				<p className="text-muted-foreground text-sm">Author</p>
				<div className="flex items-start justify-between gap-3">
					<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
						{author.name}
					</h1>
					<ResourceShareMenu
						path={`/authors/${author.slug}`}
						shareText={author.name}
						label="Share author"
						shareInPost={{ kind: "author", slug: author.slug }}
						size="md"
						iconOnly
					/>
				</div>
				<p className="text-muted-foreground text-sm tabular-nums">
					{author.bookCount} book{author.bookCount === 1 ? "" : "s"} in the club
					catalog
				</p>
			</header>

			<AuthorPageInsights author={author} />

			<ListingSearchParamsBoundary>
				<div className="flex flex-col gap-6">
					<div className="border border-border bg-muted/15 p-4">
						<BooksListingToolbar variant="author" />
					</div>
					<BooksList fixedAuthorSlug={slug} />
				</div>
			</ListingSearchParamsBoundary>
		</div>
	);
}
