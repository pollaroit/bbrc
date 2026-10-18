"use client";

import type { GetBookListOutput } from "@bbrc/api/modules/book/book.schema";
import { BookEditLink } from "@/components/blocks/book-edit-link";
import {
	type BookStatus,
	formatBookStatusLabel,
} from "@/components/blocks/book-status-badge";

const statusStripClassName: Record<BookStatus, string> = {
	completed: "bg-emerald-600/10 text-emerald-900 dark:text-emerald-200",
	reading: "bg-sky-600/10 text-sky-950 dark:text-sky-200",
	wishlist: "bg-violet-600/10 text-violet-950 dark:text-violet-200",
};

import type { Route } from "next";
import Link from "next/link";
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

export function BookCardStatusStrip({ book }: { book: BookCardStatusBook }) {
	const status = book.status as BookStatus;
	const sittingHref = sittingHrefForBook(book);
	const label = formatBookStatusLabel(status);

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
			<BookEditLink
				slug={book.slug}
				redirect="books"
				className="-mr-1 shrink-0"
			/>
		</div>
	);
}
