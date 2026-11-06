"use client";

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@bbrc/ui/components/tooltip";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";

export type CoverBook = {
	slug: string;
	title: string;
	authors: string[];
	coverId: number | null;
};

/**
 * A book as its cover, linking to the book. The tooltip lines up the title above the
 * authors (left-aligned), and `detail` adds one more line (a date, a rating).
 */
export function CoverLink({
	book,
	detail,
	caption,
	href,
}: {
	book: CoverBook;
	/** Where the cover goes; the book's page unless it is something about the book (a review). */
	href?: string;
	detail?: ReactNode;
	/** A line under the cover, for grids that show a number per book. */
	caption?: ReactNode;
}) {
	const src = bookCoverUrl(book.coverId, "M");
	return (
		<div className="flex min-w-0 flex-col gap-1">
			<Tooltip>
				<TooltipTrigger
					render={
						<Link
							href={(href ?? `/books/${book.slug}`) as Route}
							className="relative block aspect-2/3 overflow-hidden border border-border bg-muted outline-offset-2 transition-transform hover:z-10 hover:scale-[1.04] focus-visible:outline-2 focus-visible:outline-ring"
						/>
					}
				>
					{src ? (
						<Image
							src={src}
							alt={book.title}
							fill
							sizes="(max-width: 640px) 25vw, 96px"
							className="object-cover"
						/>
					) : (
						<span className="flex size-full items-center justify-center p-1 text-center text-2xs text-muted-foreground leading-tight">
							{book.title}
						</span>
					)}
				</TooltipTrigger>
				<TooltipContent className="flex max-w-60 flex-col items-start gap-0.5 text-start">
					<span className="font-medium leading-snug">{book.title}</span>
					<span className="text-xs opacity-80">
						{formatBookAuthors(book.authors)}
					</span>
					{detail ? (
						<span className="text-2xs opacity-70">{detail}</span>
					) : null}
				</TooltipContent>
			</Tooltip>
			{caption ? (
				<span className="text-center text-2xs text-muted-foreground tabular-nums">
					{caption}
				</span>
			) : null}
		</div>
	);
}
