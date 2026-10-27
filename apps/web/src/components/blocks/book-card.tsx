import type { GetBookListOutput } from "@bbrc/api/modules/book/book.schema";
import type { LucideIcon } from "lucide-react";
import {
	BookCheck,
	BookOpen,
	Eye,
	FileText,
	Heart,
	Library,
	MessageSquareText,
} from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { BookAuthorLinks } from "@/components/blocks/book-author-links";
import { BookCardActionBar } from "@/components/blocks/book-card-action-bar";
import { BookCardStatusStrip } from "@/components/blocks/book-card-status-strip";
import type { BookListFavoriteEngagement } from "@/components/blocks/book-favorite-button";
import { Link } from "@/i18n/navigation";
import { bookCardRatingDisplay } from "@/lib/book-card-rating";
import {
	bookCoverFrameClassName,
	bookCoverUrl,
	formatBookSeriesCardLabel,
} from "@/lib/book-cover";
import { bookSortMetric } from "@/lib/books/sort-metric";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { cn } from "@/lib/utils";
export type BookCardBook = GetBookListOutput["items"][number];

type BookCardProps = {
	book: BookCardBook;
	className?: string;
	/** `null` = engagement still loading; omit when logged out. */
	viewerHasRead?: boolean | null;
	listEngagement?: BookListFavoriteEngagement | null;
	feedbackBookSlugs?: Set<string> | null;
	/** Viewer’s club feedback rating when logged in and they reviewed this book. */
	viewerBookRating?: number;
	/** The list's current sort; a figure that is not on the card shows in the top strip. */
	sortBy?: string;
	/**
	 * On an author's page: leave this author out of the credit line. A book written by them
	 * alone shows no author line; a shared one shows "with" and the others.
	 */
	excludeAuthorSlug?: string;
};

function MetaStripStat({
	icon: Icon,
	count,
	title,
	href,
	compact = false,
}: {
	icon: LucideIcon;
	count: number;
	title: string;
	href?: Route;
	/** Shorten large numbers (1.2k) so the strip never outgrows the card. */
	compact?: boolean;
}) {
	const f = useFormatters();
	const body = (
		<>
			<Icon className="size-3.5 shrink-0" aria-hidden />
			<span>{compact ? f.compact(count) : count}</span>
		</>
	);

	const className =
		"inline-flex shrink-0 items-center gap-0.5 tabular-nums transition-colors";

	if (href) {
		return (
			<Link
				href={href}
				className={cn(className, "hover:text-foreground")}
				title={title}
				aria-label={title}
			>
				{body}
			</Link>
		);
	}

	return (
		<span className={className} title={title}>
			{body}
		</span>
	);
}

function BookCardMetaStrip({ book }: { book: BookCardBook }) {
	const t = useTranslations("books");
	const slug = book.slug;
	const readTitle = t("card.readTitle", { count: book.readCount });
	const reviewTitle = t("card.reviewTitle", { count: book.feedbackCount });
	const shelfTitle = t("card.shelfTitle", { count: book.shelfCount });
	const documentTitle = t("card.documentTitle", {
		count: book.approvedDocumentCount,
	});
	const favoriteTitle = t("card.favoriteTitle", { count: book.favoriteCount });
	const viewTitle = t("card.viewsTitle", { count: book.viewCount });

	return (
		<div className="relative z-2 flex w-full flex-nowrap items-center justify-between gap-1 border-border border-t bg-muted/10 px-3 py-1.5 text-muted-foreground text-xs tabular-nums">
			<MetaStripStat
				icon={BookCheck}
				count={book.readCount}
				title={readTitle}
				href={`/books/${slug}/reads` as Route}
			/>
			<MetaStripStat
				icon={MessageSquareText}
				count={book.feedbackCount}
				title={reviewTitle}
				href={`/books/${slug}/reviews` as Route}
			/>
			<MetaStripStat
				icon={Library}
				count={book.shelfCount}
				title={shelfTitle}
				href={`/books/${slug}/shelves` as Route}
			/>
			<MetaStripStat
				icon={FileText}
				count={book.approvedDocumentCount}
				title={documentTitle}
				href={`/books/${slug}/documents` as Route}
			/>
			<MetaStripStat
				icon={Heart}
				count={book.favoriteCount}
				title={favoriteTitle}
				href={`/books/${slug}/favorites` as Route}
			/>
			<MetaStripStat
				icon={Eye}
				count={book.viewCount}
				title={viewTitle}
				href={`/books/${slug}/insights` as Route}
				compact
			/>
		</div>
	);
}

function BookCardRatingRow({
	viewerBookRating,
	aggregateLabel,
	aggregateValue,
}: {
	viewerBookRating?: number;
	aggregateLabel: string;
	aggregateValue: string | null;
}) {
	const t = useTranslations("books");
	const f = useFormatters();
	if (viewerBookRating == null && aggregateValue == null) {
		return null;
	}

	return (
		<div className="mt-auto flex flex-wrap items-baseline gap-x-5 gap-y-1 pt-3">
			{viewerBookRating != null ? (
				<p className="m-0 tabular-nums">
					<span className="text-2xs text-muted-foreground uppercase tracking-wide">
						{t("card.you")}{" "}
					</span>
					<span className="font-semibold text-base text-foreground leading-none">
						{f.decimal(viewerBookRating, 1)}
					</span>
				</p>
			) : null}
			{aggregateValue != null ? (
				<p className="m-0 tabular-nums">
					<span className="text-2xs text-muted-foreground uppercase tracking-wide">
						{aggregateLabel}{" "}
					</span>
					<span className="font-semibold text-base text-foreground leading-none">
						{aggregateValue}
					</span>
				</p>
			) : null}
		</div>
	);
}

export function BookCard({
	book,
	className,
	viewerHasRead,
	listEngagement,
	feedbackBookSlugs,
	viewerBookRating,
	sortBy,
	excludeAuthorSlug,
}: BookCardProps) {
	const t = useTranslations("books");
	const f = useFormatters();
	const href = `/books/${book.slug}` as Route;
	const coverSrc = bookCoverUrl(book.coverId, "M");
	const aggregateRating = bookCardRatingDisplay(book, f);

	const aggregateLabel =
		aggregateRating?.suffix === "CR" ? t("card.club") : t("card.openLib");
	const aggregateValue = aggregateRating?.value ?? null;

	const coAuthorRefs = excludeAuthorSlug
		? (book.authorRefs ?? []).filter((ref) => ref.slug !== excludeAuthorSlug)
		: null;

	const series = book.series;
	const seriesLabel =
		series?.slug && series.title?.trim()
			? formatBookSeriesCardLabel(series)
			: null;

	return (
		<article
			className={cn(
				"group relative flex flex-col overflow-hidden border border-border bg-card transition-colors",
				"hover:bg-muted/20",
				className,
			)}
		>
			<BookCardStatusStrip
				book={book}
				metric={bookSortMetric(book, sortBy, f, t)}
			/>

			<div className="relative flex min-h-[8.5rem] min-w-0">
				<Link
					href={href}
					className="absolute inset-0 z-0 outline-none focus:outline-none focus-visible:outline-none"
					aria-label={t("card.view", { title: book.title })}
				/>

				<div className="pointer-events-none relative z-1 flex min-w-0 flex-1">
					<div className="flex min-w-0 flex-1 gap-3 p-3 sm:gap-4 sm:p-4">
						<div
							className={cn(
								"relative aspect-2/3 w-[4.75rem] shrink-0 sm:w-[5.5rem]",
								bookCoverFrameClassName,
							)}
						>
							{coverSrc ? (
								<Image
									src={coverSrc}
									alt=""
									fill
									className="object-cover motion-reduce:transition-none"
									sizes="(max-width: 640px) 76px, 88px"
								/>
							) : (
								<div className="flex size-full items-center justify-center bg-muted px-1 text-center text-2xs text-muted-foreground leading-tight">
									{t("card.noCover")}
								</div>
							)}
						</div>

						<div className="flex min-w-0 flex-1 flex-col">
							<h2 className="line-clamp-2 font-semibold text-base leading-snug tracking-tight">
								{book.title}
							</h2>
							{coAuthorRefs && coAuthorRefs.length === 0 ? null : (
								<p className="mt-1 line-clamp-1 text-sm leading-snug">
									{coAuthorRefs ? (
										<span className="text-muted-foreground">
											{t("card.with")}{" "}
										</span>
									) : null}
									<BookAuthorLinks
										authors={book.authors}
										refs={coAuthorRefs ?? book.authorRefs}
									/>
								</p>
							)}
							{seriesLabel && series ? (
								<p className="pointer-events-auto relative z-2 mt-1.5 line-clamp-1 text-muted-foreground text-xs leading-snug">
									<Link
										href={`/series/${series.slug}` as Route}
										className="underline-offset-4 hover:text-primary hover:underline"
										onClick={(event) => event.stopPropagation()}
									>
										{seriesLabel}
									</Link>
								</p>
							) : null}

							<p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-muted-foreground text-xs tabular-nums">
								<span>{t("card.pages", { count: book.pages })}</span>
								<span aria-hidden>·</span>
								<span>{book.publishedIn}</span>
								{book.readingNowCount > 0 ? (
									<>
										<span aria-hidden>·</span>
										<span
											className="inline-flex items-center gap-1 text-info-ink"
											title={t("card.readingNowTitle", {
												count: book.readingNowCount,
											})}
										>
											<BookOpen className="size-3" aria-hidden />
											{t("card.readingNow", { count: book.readingNowCount })}
										</span>
									</>
								) : null}
							</p>

							<BookCardRatingRow
								viewerBookRating={viewerBookRating}
								aggregateLabel={aggregateLabel}
								aggregateValue={aggregateValue}
							/>
						</div>
					</div>

					<div className="pointer-events-auto relative z-2 shrink-0 self-stretch">
						<BookCardActionBar
							bookSlug={book.slug}
							bookTitle={book.title}
							viewerHasRead={viewerHasRead}
							listEngagement={listEngagement}
							feedbackBookSlugs={feedbackBookSlugs}
							layout="column"
						/>
					</div>
				</div>
			</div>

			<BookCardMetaStrip book={book} />
		</article>
	);
}
