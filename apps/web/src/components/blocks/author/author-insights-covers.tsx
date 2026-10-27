import type { Route } from "next";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { bookCoverUrl } from "@/lib/book-cover";
import { cn } from "@/lib/utils";

/** The 2:3 frame every book cover keeps. */
export const INSIGHTS_BOOK_SHAPE = "aspect-2/3";

type CoverBook = { slug: string; title: string; coverId: number | null };

/** A book cover at a fixed shape; the size comes from the width class you pass. */
export function InsightsBookCover({
	book,
	className,
	sizes = "48px",
	linked = false,
}: {
	book: CoverBook;
	className?: string;
	sizes?: string;
	/** Wrap the cover in a link to the book. */
	linked?: boolean;
}) {
	const src = bookCoverUrl(book.coverId, "M");
	const frame = (
		<span
			className={cn(
				"relative block shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10",
				INSIGHTS_BOOK_SHAPE,
				className,
			)}
		>
			{src ? (
				<Image
					src={src}
					alt={linked ? book.title : ""}
					fill
					className="object-cover"
					sizes={sizes}
				/>
			) : null}
		</span>
	);

	if (!linked) return frame;
	return (
		<Link href={`/books/${book.slug}` as Route} className="shrink-0">
			{frame}
		</Link>
	);
}
