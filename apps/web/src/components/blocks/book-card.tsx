import type { GetBookListOutput } from "@bbrc/api/modules/book/book.schema";
import { Badge } from "@bbrc/ui/components/badge";
import { FileText } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import type { BookListFavoriteEngagement } from "@/components/blocks/book-favorite-button";
import { BookFavoriteButton } from "@/components/blocks/book-favorite-button";
import { BookMarkReadButton } from "@/components/blocks/book-mark-read-button";
import { BookReadCount } from "@/components/blocks/book-read-count";
import {
	formatBookStatusLabel,
	statusSpineClassName,
} from "@/components/blocks/book-status-badge";
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
};

export function BookCard({
	book,
	className,
	viewerHasRead,
	listEngagement,
}: BookCardProps) {
	const href = `/books/${book.slug}` as Route;
	const coverSrc = bookCoverUrl(book.coverId, "M");

	return (
		<article
			className={cn(
				"group relative flex min-h-[8.5rem] overflow-hidden border border-border bg-card transition-colors hover:bg-muted/25",
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

			<div className="pointer-events-none relative z-1 flex min-w-0 flex-1 gap-4 p-4">
				<div
					className={cn(
						"relative aspect-2/3 w-[4.5rem] shrink-0 sm:w-[5.25rem]",
						bookCoverFrameClassName,
					)}
				>
					{coverSrc ? (
						<Image
							src={coverSrc}
							alt=""
							fill
							className="object-cover motion-reduce:transition-none"
							sizes="(max-width: 640px) 72px, 84px"
						/>
					) : (
						<div className="flex size-full items-center justify-center text-muted-foreground text-xs">
							No cover
						</div>
					)}
				</div>

				<div className="flex min-w-0 flex-1 flex-col">
					<p className="text-muted-foreground text-xs">
						{formatBookStatusLabel(book.status)}
					</p>
					<h2 className="mt-0.5 line-clamp-2 font-semibold text-base leading-snug tracking-tight">
						{book.title}
					</h2>
					<p className="mt-1 line-clamp-1 text-muted-foreground text-sm">
						{formatBookAuthors(book.authors)}
					</p>

					<div className="mt-auto flex items-end justify-between gap-3 border-border border-t pt-3">
						<dl className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground text-xs tabular-nums">
							{book.openLibraryRating != null ? (
								<div>
									<dt className="sr-only">Open Library rating</dt>
									<dd>{book.openLibraryRating.toFixed(1)} OL</dd>
								</div>
							) : null}
							<div>
								<dt className="sr-only">Page count and year</dt>
								<dd>
									{book.pages} pp · {book.publishedIn}
								</dd>
							</div>
							<div>
								<dt className="sr-only">Members who read</dt>
								<dd>
									<BookReadCount count={book.readCount} className="text-xs" />
								</dd>
							</div>
						</dl>

						<div className="pointer-events-auto flex shrink-0 items-center gap-0.5">
							{book.approvedDocumentCount > 0 ? (
								<Badge
									variant="outline"
									className="gap-0.5 px-1.5 font-normal"
									title="Has club documents"
								>
									<FileText className="size-3.5 shrink-0" aria-hidden />
									<span className="hidden sm:inline">Docs</span>
								</Badge>
							) : null}
							<BookMarkReadButton
								bookSlug={book.slug}
								bookTitle={book.title}
								variant="icon"
								listHasRead={viewerHasRead}
							/>
							<BookFavoriteButton
								bookSlug={book.slug}
								bookTitle={book.title}
								variant="inline"
								listEngagement={listEngagement}
							/>
						</div>
					</div>
				</div>
			</div>
		</article>
	);
}
