"use client";

import type { GetBookListOutput } from "@bbrc/api/modules/book/book.schema";
import { BookEditLink } from "@/components/blocks/book-edit-link";
import type { BookStatus } from "@/components/blocks/book-status-badge";

const statusStripClassName: Record<BookStatus, string> = {
	completed: "bg-success/10 text-success-ink",
	reading: "bg-info/10 text-info-ink",
	wishlist: "bg-violet/10 text-violet-ink",
};

import type { Route } from "next";
import { Link } from "@/i18n/navigation";
import type { BookSortMetric } from "@/lib/books/sort-metric";
import { useBookStatusLabels } from "@/lib/i18n/use-labels";
import { cn } from "@/lib/utils";

type BookCardStatusBook = Pick<
	GetBookListOutput["items"][number],
	"slug" | "status" | "clubSittingSlug"
>;

function sittingHrefForBook(book: BookCardStatusBook): Route | null {
	if (book.status !== "reading" && book.status !== "completed") {
		return null;
	}
	if (!book.clubSittingSlug) {
		return null;
	}
	return `/sittings/${book.clubSittingSlug}` as Route;
}

export function BookCardStatusStrip({
	book,
	metric,
}: {
	book: BookCardStatusBook;
	/** The figure the list is sorted by, when it is not already on the card. */
	metric?: BookSortMetric | null;
}) {
	const status = book.status as BookStatus;
	const sittingHref = sittingHrefForBook(book);
	const label = useBookStatusLabels().label[status];

	const stripClassName = cn(
		"pointer-events-auto relative z-2 flex items-center gap-2 border-border border-b px-3 py-1.5 font-medium text-xs",
		statusStripClassName[status],
	);

	return (
		<div className={stripClassName}>
			{sittingHref ? (
				<Link
					href={sittingHref}
					className="-mx-3 -my-1.5 flex min-w-0 flex-1 items-center truncate px-3 py-1.5 underline-offset-4 hover:underline"
					onClick={(event) => event.stopPropagation()}
				>
					{label}
				</Link>
			) : (
				<span className="min-w-0 flex-1 truncate">{label}</span>
			)}
			{metric ? (
				metric.href ? (
					<Link
						href={metric.href as Route}
						className="shrink-0 tabular-nums underline-offset-4 hover:underline"
						onClick={(event) => event.stopPropagation()}
					>
						<span className="font-normal opacity-80">{metric.label} </span>
						<span className="font-semibold">{metric.value}</span>
					</Link>
				) : (
					<span className="shrink-0 tabular-nums">
						<span className="font-normal opacity-80">{metric.label} </span>
						<span className="font-semibold">{metric.value}</span>
					</span>
				)
			) : null}
			<BookEditLink
				slug={book.slug}
				redirect="books"
				className="-mr-1 shrink-0"
			/>
		</div>
	);
}
