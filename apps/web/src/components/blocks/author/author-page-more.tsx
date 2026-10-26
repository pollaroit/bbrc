import type { RelatedAuthor } from "@bbrc/api/modules/author/author.schema";
import type { Route } from "next";
import Link from "next/link";
import { AuthorPageCover } from "./author-page-bits";
import { AuthorPhoto } from "./author-photo";

/** A small card for an author someone might like next; local to the author page. */
export function AuthorMiniCard({ author }: { author: RelatedAuthor }) {
	return (
		<Link
			href={`/authors/${author.slug}` as Route}
			className="group flex gap-3 border border-border p-3 transition-colors hover:bg-muted/40"
		>
			<AuthorPhoto name={author.name} photoUrl={author.photoUrl} size="lg" />
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<p className="truncate font-medium text-sm group-hover:underline">
					{author.name}
				</p>
				<p className="truncate text-muted-foreground text-xs tabular-nums">
					{[
						author.lifespan,
						`${author.bookCount} ${author.bookCount === 1 ? "book" : "books"}`,
					]
						.filter(Boolean)
						.join(" · ")}
				</p>
				{author.reasonText ? (
					<p className="line-clamp-2 text-muted-foreground text-xs">
						{author.reasonText}
					</p>
				) : null}
			</div>
			{author.coverIds[0] != null ? (
				<div className="hidden w-10 shrink-0 sm:block">
					<AuthorPageCover
						coverId={author.coverIds[0]}
						title={author.name}
						sizes="40px"
					/>
				</div>
			) : null}
		</Link>
	);
}

export function AuthorPageMoreGrid({ items }: { items: RelatedAuthor[] }) {
	return (
		<ul className="grid gap-3 sm:grid-cols-2">
			{items.map((author) => (
				<li key={author.slug}>
					<AuthorMiniCard author={author} />
				</li>
			))}
		</ul>
	);
}
