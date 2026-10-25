import type { ListUserReadsOutput } from "@bbrc/api/modules/read/read.schema";
import { BookCheck, BookOpen, CalendarDays, Star } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { EditionChip } from "@/components/blocks/edition-chip";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { formatReadFinishedMonthField } from "@/lib/format-read-date";

type Item = ListUserReadsOutput["items"][number];

export function MemberProfileReadCard({ item }: { item: Item }) {
	const { book } = item;
	const coverSrc = bookCoverUrl(book.coverId, "M");
	const finished =
		item.readEndYear != null && item.readEndMonth != null
			? formatReadFinishedMonthField(item.readEndYear, item.readEndMonth)
			: null;

	return (
		<article className="relative flex h-full gap-3 border border-border p-3 transition-colors hover:bg-muted/40">
			<span className="relative block aspect-2/3 w-16 shrink-0 self-start overflow-hidden bg-muted ring-1 ring-foreground/10">
				{coverSrc ? (
					<Image
						src={coverSrc}
						alt=""
						fill
						className="object-cover"
						sizes="64px"
					/>
				) : null}
			</span>

			<div className="flex min-w-0 flex-1 flex-col gap-2">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<h3 className="font-medium text-sm leading-snug">
							<Link
								href={`/books/${book.slug}` as Route}
								className="after:absolute after:inset-0"
							>
								{book.title}
							</Link>
						</h3>
						<p className="text-muted-foreground text-sm">
							{formatBookAuthors(book.authors)}
						</p>
					</div>
					{finished ? (
						<span className="shrink-0 text-muted-foreground text-xs">
							{finished}
						</span>
					) : null}
				</div>

				<EditionChip
					bookSlug={book.slug}
					edition={item.edition}
					prefix="Read the"
					className="self-start"
				/>

				<div className="mt-auto flex items-end justify-between gap-2">
					<p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs tabular-nums">
						<span className="inline-flex items-center gap-1.5">
							<BookOpen className="size-3.5" aria-hidden />
							{book.pages} pages
						</span>
						<span className="inline-flex items-center gap-1.5">
							<CalendarDays className="size-3.5" aria-hidden />
							{book.publishedIn}
						</span>
						<span
							className="inline-flex items-center gap-1.5"
							title={`${book.readCount} member${book.readCount === 1 ? "" : "s"} marked read`}
						>
							<BookCheck className="size-3.5" aria-hidden />
							{book.readCount}
						</span>
					</p>
					{item.rating != null ? (
						<span
							className="inline-flex shrink-0 items-center gap-1 border border-border px-1.5 py-0.5 font-medium text-xs tabular-nums"
							title="Their rating"
						>
							<Star
								className="size-3.5 fill-warning text-warning"
								aria-hidden
							/>
							{item.rating.toFixed(1)}
						</span>
					) : null}
				</div>
			</div>
		</article>
	);
}
