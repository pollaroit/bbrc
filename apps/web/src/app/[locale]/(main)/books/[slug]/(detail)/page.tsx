import type { Metadata, Route } from "next";
import { BookDiscoverySection } from "@/components/blocks/book-discovery-section";
import { BookExcerptMarkdown } from "@/components/blocks/book-excerpt-markdown";
import { FeedbackReviewList } from "@/components/blocks/feedback-review-list";
import { Link } from "@/i18n/navigation";
import { truncateBookExcerptMarkdown } from "@/lib/books/excerpt-markdown";
import {
	loadBookBySlugForIsr,
	loadBookCatalogDiscoveryForIsr,
	loadBookFeedbackListForIsr,
	loadBookShelvesForIsr,
} from "@/lib/isr-data";
import { bookJsonLd, JsonLd } from "@/lib/seo";
import {
	bookOverviewDescription,
	buildBookTabMetadata,
	buildNotFoundMetadata,
} from "@/lib/seo/book-page-metadata";

const OVERVIEW_EXCERPT_MAX = 480;

export async function generateMetadata({
	params,
}: PageProps<"/[locale]/books/[slug]">): Promise<Metadata> {
	const { slug } = await params;

	try {
		const book = await loadBookBySlugForIsr(slug);
		return buildBookTabMetadata(book, {
			title: "Overview",
			description: bookOverviewDescription(book),
			segment: "",
		});
	} catch {
		return buildNotFoundMetadata("Book");
	}
}

export default async function BookOverviewPage({
	params,
}: PageProps<"/[locale]/books/[slug]">) {
	const { slug } = await params;
	const [book, initialReviews, shelves, discovery] = await Promise.all([
		loadBookBySlugForIsr(slug),
		loadBookFeedbackListForIsr(slug),
		loadBookShelvesForIsr(slug),
		loadBookCatalogDiscoveryForIsr(slug),
	]);

	const excerpt = book.excerpt?.trim() ?? "";
	const { content: excerptPreview, isTruncated: excerptIsTruncated } =
		excerpt.length > 0
			? truncateBookExcerptMarkdown(excerpt, OVERVIEW_EXCERPT_MAX)
			: { content: "", isTruncated: false };
	const topReviews = initialReviews.slice(0, 3);
	const topShelves = shelves.items.slice(0, 5);

	return (
		<>
			<JsonLd data={bookJsonLd(book)} />
			<div className="flex flex-col gap-10">
				{excerptPreview ? (
					<section className="flex max-w-3xl flex-col gap-3">
						<h2 className="font-semibold text-lg">From the catalog</h2>
						<BookExcerptMarkdown excerpt={excerptPreview} />
						{excerptIsTruncated ? (
							<Link
								href={`/books/${slug}/about` as Route}
								className="w-fit text-primary text-sm underline-offset-4 hover:underline"
							>
								Read full excerpt
							</Link>
						) : null}
					</section>
				) : null}

				<section className="flex flex-col gap-4">
					<div className="flex flex-wrap items-baseline justify-between gap-2">
						<h2 className="font-semibold text-lg">Recent reviews</h2>
						{initialReviews.length > topReviews.length ? (
							<Link
								href={`/books/${slug}/reviews` as Route}
								className="text-primary text-sm underline-offset-4 hover:underline"
							>
								All reviews ({initialReviews.length})
							</Link>
						) : null}
					</div>
					{topReviews.length > 0 ? (
						<FeedbackReviewList
							bookSlug={slug}
							reviews={topReviews}
							emptyMessage=""
						/>
					) : (
						<p className="text-muted-foreground text-sm">
							No reviews yet. Be the first on the reviews tab.
						</p>
					)}
				</section>

				<section className="flex flex-col gap-4">
					<div className="flex flex-wrap items-baseline justify-between gap-2">
						<h2 className="font-semibold text-lg">On member shelves</h2>
						{shelves.items.length > topShelves.length ? (
							<Link
								href={`/books/${slug}/shelves` as Route}
								className="text-primary text-sm underline-offset-4 hover:underline"
							>
								All shelves ({shelves.items.length})
							</Link>
						) : null}
					</div>
					{topShelves.length > 0 ? (
						<ul className="flex flex-col gap-2 divide-y divide-border border border-border">
							{topShelves.map((shelf) => (
								<li key={shelf.id}>
									<Link
										href={
											`/users/${shelf.owner.username}/shelves/${shelf.slug}` as Route
										}
										className="flex flex-col gap-0.5 px-3 py-2 transition-colors hover:bg-muted/40"
									>
										<span className="font-medium text-sm">{shelf.title}</span>
										<span className="text-muted-foreground text-xs">
											@{shelf.owner.username}
										</span>
									</Link>
								</li>
							))}
						</ul>
					) : (
						<p className="text-muted-foreground text-sm">
							Not on any public shelves yet.
						</p>
					)}
				</section>

				<BookDiscoverySection
					section={discovery.similar}
					seeAllHref={`/books/${slug}/more` as Route}
				/>
			</div>
		</>
	);
}
