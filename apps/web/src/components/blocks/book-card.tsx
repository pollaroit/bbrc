import type { GetBookListOutput } from "@bbrc/api/modules/book/book.schema";
import { Badge } from "@bbrc/ui/components/badge";
import { Card, CardContent } from "@bbrc/ui/components/card";
import { BookCheck } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { BookEditLink } from "@/components/blocks/book-edit-link";
import type { BookListFavoriteEngagement } from "@/components/blocks/book-favorite-button";
import { BookFavoriteButton } from "@/components/blocks/book-favorite-button";
import { BookStatusBadge } from "@/components/blocks/book-status-badge";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { cn } from "@/lib/utils";

export type BookCardBook = GetBookListOutput["items"][number];

type BookCardProps = {
	book: BookCardBook;
	className?: string;
	/** `null` = engagement still loading; omit when logged out. */
	viewerCompletedRead?: boolean | null;
	listEngagement?: BookListFavoriteEngagement | null;
};

export function BookCard({
	book,
	className,
	viewerCompletedRead,
	listEngagement,
}: BookCardProps) {
	const href = `/books/${book.slug}` as Route;
	const coverSrc = bookCoverUrl(book.coverId);
	const showClubReadBadge = viewerCompletedRead === true;

	return (
		<Card
			size="sm"
			className={cn(
				"relative h-full transition-colors hover:bg-muted/40",
				className,
			)}
		>
			<Link
				href={href}
				className="absolute inset-0 z-0 rounded-none"
				aria-label={`View ${book.title}`}
			/>
			<CardContent className="pointer-events-none relative z-1 flex h-full items-stretch gap-3">
				<div className="relative aspect-2/3 w-19 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10 sm:w-20">
					{coverSrc ? (
						<Image
							src={coverSrc}
							alt=""
							fill
							className="object-cover"
							sizes="(max-width: 640px) 76px, 80px"
						/>
					) : (
						<div className="flex size-full items-center justify-center text-muted-foreground text-xs">
							No cover
						</div>
					)}
				</div>

				<div className="flex min-w-0 flex-1 flex-col gap-2">
					<div className="flex items-start gap-2">
						<div className="min-w-0 flex-1 space-y-0.5">
							<p className="line-clamp-2 font-medium text-sm leading-snug">
								{book.title}
							</p>
							<p className="truncate text-muted-foreground text-xs">
								{formatBookAuthors(book.authors)}
							</p>
						</div>
						<div className="pointer-events-auto flex shrink-0 items-center gap-0.5">
							<BookEditLink slug={book.slug} />
							<BookFavoriteButton
								bookSlug={book.slug}
								bookTitle={book.title}
								variant="inline"
								listEngagement={listEngagement}
							/>
						</div>
					</div>

					<div className="mt-auto flex flex-wrap items-end justify-between gap-2">
						<div className="flex flex-wrap items-center gap-1.5">
							<BookStatusBadge status={book.status} />
							{showClubReadBadge ? (
								<Badge
									variant="outline"
									className="gap-0.5 border-emerald-600/35 px-1.5 text-emerald-800 dark:text-emerald-400"
									title="You finished this club read"
								>
									<BookCheck className="size-3.5 shrink-0" aria-hidden />
									<span className="sr-only">You finished this club read</span>
								</Badge>
							) : null}
						</div>
						<dl className="flex shrink-0 flex-col items-end gap-0.5 text-muted-foreground text-xs tabular-nums">
							<div>
								<dt className="sr-only">Open Library rating</dt>
								<dd>
									{book.openLibraryRating != null
										? `${book.openLibraryRating.toFixed(1)} OL`
										: "-"}
								</dd>
							</div>
							<div>
								<dt className="sr-only">Pages</dt>
								<dd>
									{book.pages} pp · {book.publishedIn}
								</dd>
							</div>
						</dl>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
