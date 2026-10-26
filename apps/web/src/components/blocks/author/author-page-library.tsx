import { Star } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { AuthorPageCover, authorBookAnchor } from "./author-page-bits";

export type LibraryBook = {
	slug: string;
	title: string;
	publishedIn: number;
	coverId: number | null;
	averageRating?: number | null;
	readCount: number;
	series: { title: string; position: number } | null;
};

/** The author's books as small cards: cover, year, series place, rating and reads. */
export function AuthorPageLibrary({ books }: { books: LibraryBook[] }) {
	return (
		<ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{books.map((book) => (
				<li key={book.slug}>
					<Link
						id={authorBookAnchor(book.slug)}
						href={`/books/${book.slug}` as Route}
						className="flex h-full gap-3 border border-border p-3 outline-none transition-colors hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring"
					>
						<div className="w-14 shrink-0">
							<AuthorPageCover
								coverId={book.coverId}
								title={book.title}
								sizes="56px"
							/>
						</div>
						<div className="flex min-w-0 flex-1 flex-col gap-1">
							<span className="line-clamp-2 font-medium text-sm leading-snug">
								{book.title}
							</span>
							<span className="text-muted-foreground text-xs tabular-nums">
								{book.publishedIn > 0 ? book.publishedIn : "Year unknown"}
							</span>
							{book.series ? (
								<span className="truncate text-muted-foreground text-xs">
									{book.series.title} #{book.series.position}
								</span>
							) : null}
							<span className="mt-auto flex items-center gap-3 pt-1 text-muted-foreground text-xs tabular-nums">
								{book.averageRating ? (
									<span className="inline-flex items-center gap-1">
										<Star className="size-3" aria-hidden />
										{book.averageRating.toFixed(1)}
									</span>
								) : null}
								<span>
									{book.readCount} {book.readCount === 1 ? "read" : "reads"}
								</span>
							</span>
						</div>
					</Link>
				</li>
			))}
		</ul>
	);
}
