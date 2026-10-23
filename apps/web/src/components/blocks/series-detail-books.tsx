import type { GetSeriesBySlugOutput } from "@bbrc/api/modules/series/series.schema";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { bookCoverFrameClassName, bookCoverUrl } from "@/lib/book-cover";
import { cn } from "@/lib/utils";

type SeriesDetailBooksProps = {
	books: GetSeriesBySlugOutput["books"];
	className?: string;
	compact?: boolean;
};

const positionCellClassName =
	"flex shrink-0 items-center justify-center border-border border-r bg-muted/35 font-medium tabular-nums text-muted-foreground";

export function SeriesDetailBooks({
	books,
	className,
	compact = false,
}: SeriesDetailBooksProps) {
	if (books.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				No books in this series yet.
			</p>
		);
	}

	return (
		<ol
			className={cn("flex list-none flex-col border border-border", className)}
		>
			{books.map((row) => {
				const href = `/books/${row.book.slug}` as Route;
				const coverSrc = bookCoverUrl(row.book.coverId, "M");

				return (
					<li
						key={row.book.slug}
						className="border-border border-b last:border-b-0"
					>
						<Link
							href={href}
							className={cn(
								"grid items-stretch bg-card transition-colors hover:bg-muted/20",
								compact
									? "grid-cols-[2.75rem_minmax(2.5rem,3rem)_minmax(0,1fr)]"
									: "grid-cols-[3.25rem_minmax(3rem,4rem)_minmax(0,1fr)]",
							)}
						>
							<span
								className={cn(
									positionCellClassName,
									compact ? "text-sm" : "text-base sm:text-lg",
								)}
							>
								{row.position}
							</span>
							<div
								className={cn(
									"flex items-center border-border border-r p-2 sm:p-3",
								)}
							>
								<div
									className={cn(
										"relative aspect-2/3 w-full",
										bookCoverFrameClassName,
									)}
								>
									{coverSrc ? (
										<Image
											src={coverSrc}
											alt=""
											fill
											className="object-cover"
											sizes={compact ? "44px" : "64px"}
										/>
									) : (
										<div className="flex size-full items-center justify-center text-3xs text-muted-foreground">
											No cover
										</div>
									)}
								</div>
							</div>
							<div
								className={cn(
									"flex min-w-0 flex-col justify-center gap-0.5",
									compact ? "px-3 py-2" : "px-4 py-3 sm:py-4",
								)}
							>
								<span
									className={cn(
										"font-semibold leading-snug",
										compact ? "text-sm" : "text-base",
									)}
								>
									{row.book.title}
								</span>
								<span className="line-clamp-2 text-muted-foreground text-sm">
									{row.book.authors.join(", ")}
								</span>
								<span className="text-muted-foreground text-xs tabular-nums">
									{row.book.publishedIn}
								</span>
							</div>
						</Link>
					</li>
				);
			})}
		</ol>
	);
}
