import type { BookStatus } from "@/components/blocks/book-status-badge";
import { BookStatusStrip } from "@/components/blocks/book-status-badge";
import {
	bookCoverFrameClassName,
	bookCoverUrl,
	formatBookAuthors,
} from "@/lib/book-cover";
import { cn } from "@/lib/utils";

/*
 * How a book will look in the library, drawn from the form's current values.
 * Pure display (no hooks), so the add, request and edit pages can all use it.
 *
 * <BookPreviewCard
 *   title, authors
 *   coverId     an Open Library cover id, or a negative id for an uploaded cover
 *   coverUrl    wins over coverId: a freshly picked or cropped cover (blob/data/https)
 *   pages, publishedIn, status (defaults to "wishlist", what a new book starts as)
 *   seriesLabel e.g. "#2 The Expanse"
 *   excerpt     the description; only the first lines show
 * />
 */

type BookPreviewCardProps = {
	title: string;
	authors: string[];
	coverId?: number | null;
	coverUrl?: string | null;
	pages?: number | null;
	publishedIn?: number | null;
	status?: BookStatus;
	seriesLabel?: string | null;
	excerpt?: string | null;
	className?: string;
};

export function BookPreviewCard({
	title,
	authors,
	coverId,
	coverUrl,
	pages,
	publishedIn,
	status = "wishlist",
	seriesLabel,
	excerpt,
	className,
}: BookPreviewCardProps) {
	const src = coverUrl ?? bookCoverUrl(coverId, "L");
	const facts = [
		pages ? `${pages} pages` : null,
		publishedIn ? String(publishedIn) : null,
	].filter(Boolean);

	return (
		<figure
			className={cn(
				"m-0 flex flex-col border border-border bg-card",
				className,
			)}
			aria-label="Preview of the book card"
		>
			<BookStatusStrip status={status} />
			<div className="flex gap-4 p-4">
				<div
					className={cn(
						"relative aspect-2/3 w-24 shrink-0 sm:w-28 lg:w-24 xl:w-28",
						bookCoverFrameClassName,
					)}
				>
					{src ? (
						// A plain img: previews can be blob/data URLs that next/image cannot take.
						<img
							src={src}
							alt=""
							className="absolute inset-0 size-full object-cover"
						/>
					) : (
						<div className="flex size-full items-center justify-center bg-muted px-1 text-center text-2xs text-muted-foreground leading-tight">
							No cover
						</div>
					)}
				</div>
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<h3 className="line-clamp-3 font-semibold text-base leading-snug tracking-tight">
						{title.trim() || "Untitled book"}
					</h3>
					<p className="line-clamp-2 text-sm leading-snug">
						{authors.length > 0 ? formatBookAuthors(authors) : "Unknown author"}
					</p>
					{seriesLabel ? (
						<p className="line-clamp-1 text-muted-foreground text-xs">
							{seriesLabel}
						</p>
					) : null}
					{facts.length > 0 ? (
						<p className="mt-1 flex items-center gap-1.5 text-muted-foreground text-xs tabular-nums">
							{facts.map((fact, index) => (
								<span key={fact} className="flex items-center gap-1.5">
									{index > 0 ? <span aria-hidden>·</span> : null}
									{fact}
								</span>
							))}
						</p>
					) : null}
				</div>
			</div>
			{excerpt?.trim() ? (
				<figcaption className="line-clamp-4 border-border border-t px-4 py-3 text-muted-foreground text-xs leading-relaxed">
					{excerpt.trim()}
				</figcaption>
			) : null}
		</figure>
	);
}
