import type { GetBookListOutput } from "@bbrc/api/modules/book/book.schema";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { BookCardActionBar } from "@/components/blocks/book-card-action-bar";
import type { BookListFavoriteEngagement } from "@/components/blocks/book-favorite-button";
import { BookReadCount } from "@/components/blocks/book-read-count";
import {
	formatBookStatusLabel,
	statusSpineClassName,
} from "@/components/blocks/book-status-badge";
import { bookCardRatingDisplay } from "@/lib/book-card-rating";
import {
	bookCoverFrameClassName,
	bookCoverUrl,
	formatBookAuthors,
} from "@/lib/book-cover";
import { cn } from "@/lib/utils";

export type BookCardBook = GetBookListOutput["items"][number];

type BookCardProps = {
	book: BookCardBook;
	className?: string;
	/** `null` = engagement still loading; omit when logged out. */
	viewerHasRead?: boolean | null;
	listEngagement?: BookListFavoriteEngagement | null;
	feedbackBookSlugs?: Set<string> | null;
};

export function BookCard({
	book,
	className,
	viewerHasRead,
	listEngagement,
	feedbackBookSlugs,
}: BookCardProps) {
	const href = `/books/${book.slug}` as Route;
	const coverSrc = bookCoverUrl(book.coverId, "M");
	const rating = bookCardRatingDisplay(book);

	return (
		<article
			className={cn(
				"group relative flex min-h-[9.5rem] overflow-hidden border border-border bg-card transition-colors hover:bg-muted/25",
				className,
			)}
		>
			<div
				className={cn("w-1 shrink-0", statusSpineClassName[book.status])}
				aria-hidden
			/>

			<Link
				href={href}
				className="absolute inset-0 z-0"
				aria-label={`View ${book.title}`}
			/>

			<div className="pointer-events-none relative z-1 flex min-w-0 flex-1">
				<div className="flex min-w-0 flex-1 gap-3 p-3 sm:gap-4 sm:p-4">
					<div
						className={cn(
							"relative aspect-2/3 w-[4rem] shrink-0 sm:w-[4.75rem]",
							bookCoverFrameClassName,
						)}
					>
						{coverSrc ? (
							<Image
								src={coverSrc}
								alt=""
								fill
								className="object-cover motion-reduce:transition-none"
								sizes="(max-width: 640px) 64px, 76px"
							/>
						) : (
							<div className="flex size-full items-center justify-center text-muted-foreground text-xs">
								No cover
							</div>
						)}
					</div>

					<div className="flex min-w-0 flex-1 flex-col gap-1">
						<p className="text-muted-foreground text-xs">
							{formatBookStatusLabel(book.status)}
						</p>
						{book.series ? (
							<p className="pointer-events-auto relative z-2 line-clamp-1 text-muted-foreground text-xs">
								<Link
									href={`/series/${book.series.slug}` as Route}
									className="underline-offset-4 hover:text-primary hover:underline"
									onClick={(event) => event.stopPropagation()}
								>
									{book.series.title} · #{book.series.position}
								</Link>
							</p>
						) : null}
						<h2 className="line-clamp-2 font-semibold text-sm leading-snug tracking-tight sm:text-base">
							{book.title}
						</h2>
						<p className="line-clamp-1 text-muted-foreground text-xs sm:text-sm">
							{formatBookAuthors(book.authors)}
						</p>

						<div className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-0.5 pt-2 text-muted-foreground text-xs tabular-nums">
							{rating ? (
								<span className="font-medium text-foreground">
									{rating.value}{" "}
									<span className="font-normal text-muted-foreground">
										{rating.suffix}
									</span>
								</span>
							) : null}
							<span>
								{book.pages} pp · {book.publishedIn}
							</span>
							<BookReadCount count={book.readCount} className="text-xs" />
						</div>
					</div>
				</div>

				<div className="pointer-events-auto relative z-2">
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
		</article>
	);
}
