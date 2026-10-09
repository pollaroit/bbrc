import type { ListUserReadsOutput } from "@bbrc/api/modules/read/read.schema";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { formatBookStatusLabel } from "@/components/blocks/book-status-badge";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { formatReadPeriod } from "@/lib/format-read-date";

type UserMemberReadCardProps = {
	item: ListUserReadsOutput["items"][number];
};

export function UserMemberReadCard({ item }: UserMemberReadCardProps) {
	const { book } = item;
	const href = `/books/${book.slug}` as Route;
	const coverSrc = bookCoverUrl(book.coverId, "M");

	return (
		<article className="flex flex-col gap-4 border border-border bg-card p-4 sm:flex-row sm:items-start">
			<Link
				href={href}
				className="relative aspect-2/3 w-full max-w-[5.5rem] shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10 sm:w-[5.5rem]"
			>
				{coverSrc ? (
					<Image
						src={coverSrc}
						alt=""
						fill
						className="object-cover"
						sizes="88px"
					/>
				) : (
					<div className="flex size-full items-center justify-center text-muted-foreground text-xs">
						No cover
					</div>
				)}
			</Link>

			<div className="flex min-w-0 flex-1 flex-col gap-2">
				<p className="text-muted-foreground text-xs">
					{formatBookStatusLabel(book.status)} · {book.pages} pages ·{" "}
					{book.publishedIn}
				</p>
				<h2 className="font-semibold text-lg leading-snug">
					<Link href={href} className="hover:underline">
						{book.title}
					</Link>
				</h2>
				<p className="text-muted-foreground text-sm">
					{formatBookAuthors(book.authors)}
				</p>
				<p className="text-muted-foreground text-sm">
					{formatReadPeriod(item.readStart, item.readEnd)}
				</p>
				{item.editionId ? (
					<p className="font-mono text-muted-foreground text-xs">
						Edition {item.editionId}
					</p>
				) : null}
			</div>
		</article>
	);
}
