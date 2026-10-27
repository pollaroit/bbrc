"use client";

/**
 * Warns (never blocks) when a book that looks the same is already in the library,
 * even under a different Open Library id.
 *
 * Props: `{ title, authors, olid? }`. Renders nothing until there is a match.
 */

import { useQuery } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Link } from "@/i18n/navigation";
import {
	bookCoverFrameClassName,
	bookCoverUrl,
	formatBookAuthors,
} from "@/lib/book-cover";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export type SimilarBooksWarningProps = {
	title: string;
	authors: string[];
	olid?: string;
	className?: string;
};

export function SimilarBooksWarning({
	title,
	authors,
	olid,
	className,
}: SimilarBooksWarningProps) {
	const debouncedTitle = useDebouncedValue(title.trim(), 600);
	const authorKey = useDebouncedValue(authors.join("|"), 600);
	const { data } = useQuery({
		...orpc.book.findSimilar.queryOptions({
			input: {
				title: debouncedTitle,
				authors: authorKey ? authorKey.split("|") : [],
				olid,
			},
		}),
		enabled: debouncedTitle.length >= 2,
		staleTime: 60_000,
	});

	const items = (data?.items ?? []).slice(0, 3);
	if (items.length === 0) return null;

	return (
		<aside
			className={cn(
				"flex flex-col gap-3 border border-warning/40 bg-warning/10 p-3",
				className,
			)}
			aria-label="Possible duplicate"
		>
			<p className="flex items-start gap-2 font-medium text-sm text-warning-ink">
				<TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
				This looks like a book already in the library
			</p>
			<ul className="flex flex-col gap-2">
				{items.map((book) => {
					const cover = bookCoverUrl(book.coverId, "S");
					return (
						<li key={book.slug}>
							<Link
								href={`/books/${book.slug}` as Route}
								target="_blank"
								rel="noopener"
								className="flex items-center gap-3 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
							>
								<span
									className={cn(
										"relative block aspect-2/3 w-8 shrink-0",
										bookCoverFrameClassName,
									)}
								>
									{cover ? (
										<Image
											src={cover}
											alt=""
											fill
											className="object-cover"
											sizes="32px"
										/>
									) : null}
								</span>
								<span className="flex min-w-0 flex-1 flex-col">
									<span className="truncate font-medium text-sm">
										{book.title}
									</span>
									<span className="truncate text-muted-foreground text-xs">
										{formatBookAuthors(book.authors)}
									</span>
								</span>
								<span className="shrink-0 text-warning-ink text-xs tabular-nums">
									{book.similarity}% alike
								</span>
							</Link>
						</li>
					);
				})}
			</ul>
			<p className="text-muted-foreground text-xs">
				You can still add it, for example if it is a different book with a
				similar name.
			</p>
		</aside>
	);
}
