import type { GetBookListOutput } from "@bbrc/api/modules/book/book.schema";
import { Card, CardContent } from "@bbrc/ui/components/card";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { BookEditLink } from "@/components/blocks/book-edit-link";
import { BookStatusBadge } from "@/components/blocks/book-status-badge";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { cn } from "@/lib/utils";

export type BookCardBook = GetBookListOutput["items"][number];

type BookCardProps = {
	book: BookCardBook;
	className?: string;
};

export function BookCard({ book, className }: BookCardProps) {
	const href = `/books/${book.slug}` as Route;
	const coverSrc = bookCoverUrl(book.coverId);

	return (
		<div className={cn("relative h-full", className)}>
			<BookEditLink
				slug={book.slug}
				className="absolute top-1.5 right-1.5 z-10"
			/>
			<Link href={href} className="block h-full">
				<Card size="sm" className="h-full transition-colors hover:bg-muted/40">
					<CardContent className="flex h-full items-stretch gap-3">
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
							<div className="space-y-0.5">
								<p className="line-clamp-2 font-medium text-sm leading-snug">
									{book.title}
								</p>
								<p className="truncate text-muted-foreground text-xs">
									{formatBookAuthors(book.authors)}
								</p>
							</div>

							<div className="mt-auto flex flex-wrap items-end justify-between gap-2">
								<BookStatusBadge status={book.status} />
								<dl className="flex shrink-0 flex-col items-end gap-0.5 text-muted-foreground text-xs tabular-nums">
									<div>
										<dt className="sr-only">Open Library rating</dt>
										<dd>
											{book.openLibraryRating != null
												? `${book.openLibraryRating.toFixed(1)} OL`
												: "—"}
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
			</Link>
		</div>
	);
}
