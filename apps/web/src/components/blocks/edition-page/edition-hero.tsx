import type {
	EditionCore,
	EditionPage,
} from "@bbrc/api/modules/edition/edition.schema";
import { Badge } from "@bbrc/ui/components/badge";
import { BadgeCheck, BookMarked, Globe2, Star } from "lucide-react";
import type { Route } from "next";
import { BookAuthorLinks } from "@/components/blocks/book-author-links";
import { CopyValueButton } from "@/components/blocks/edition-page/copy-value";
import { EditionCoverGallery } from "@/components/blocks/edition-page/edition-cover-gallery";
import { Link } from "@/i18n/navigation";
import { editionHeadline } from "@/lib/edition/format";
import { cn } from "@/lib/utils";

/** Where the data comes from, stamped on the record like a catalogue card. */
export function EditionSourceBadge({
	source,
	verified,
	className,
}: {
	source: EditionCore["source"];
	verified: boolean;
	className?: string;
}) {
	if (verified) {
		return (
			<Badge
				variant="secondary"
				className={cn("gap-1 bg-success/10 text-success-ink", className)}
			>
				<BadgeCheck className="size-3" aria-hidden />
				Verified
			</Badge>
		);
	}
	if (source === "member") {
		return (
			<Badge
				variant="secondary"
				className={cn("bg-info/10 text-info-ink", className)}
			>
				Member-added
			</Badge>
		);
	}
	return (
		<Badge variant="outline" className={className}>
			<Globe2 className="size-3" aria-hidden />
			Open Library
		</Badge>
	);
}

function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 py-2.5 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]">
			<dt className="text-muted-foreground">{label}</dt>
			<dd className="min-w-0 break-words">{children}</dd>
		</div>
	);
}

function Isbn({ value, label }: { value: string; label: string }) {
	return (
		<span className="inline-flex items-center gap-1">
			<span className="font-mono tabular-nums tracking-wide">{value}</span>
			<CopyValueButton value={value} label={label} />
		</span>
	);
}

/**
 * The top of the page: the cover and the edition's record, set out like a
 * library catalogue card (a ruled list of facts, the ISBN in monospace).
 */
export function EditionHero({
	page,
}: {
	page: Pick<EditionPage, "book" | "edition" | "isClubFavourite">;
}) {
	const { book, edition, isClubFavourite } = page;
	const headline = editionHeadline(book, edition);

	return (
		<header className="grid gap-6 border border-border bg-card p-4 sm:p-6 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] md:gap-8">
			<EditionCoverGallery
				covers={edition.covers}
				title={headline}
				fallbackCoverId={book.coverId}
			/>

			<div className="flex min-w-0 flex-col gap-4">
				<div className="flex flex-wrap items-center gap-2">
					<EditionSourceBadge
						source={edition.source}
						verified={edition.verified}
					/>
					{isClubFavourite ? (
						<Badge
							variant="secondary"
							className="gap-1 bg-warning/10 text-warning-ink"
						>
							<Star className="size-3" aria-hidden />
							Club favourite
						</Badge>
					) : null}
					{edition.fromSnapshot ? (
						<span
							className="text-muted-foreground text-xs"
							title="Open Library did not answer, so this is the copy we saved earlier."
						>
							From our saved copy
						</span>
					) : null}
				</div>

				<div className="flex flex-col gap-1.5">
					<p className="text-muted-foreground text-sm">
						<BookMarked
							className="me-1.5 inline size-3.5 align-[-2px]"
							aria-hidden
						/>
						Edition of{" "}
						<Link
							href={`/books/${book.slug}` as Route}
							className="font-medium text-foreground underline-offset-4 hover:underline"
						>
							{book.title}
						</Link>
						{book.authors.length > 0 ? (
							<>
								{" by "}
								<BookAuthorLinks
									authors={book.authors}
									refs={book.authorRefs}
									className="text-muted-foreground"
								/>
							</>
						) : null}
					</p>
					<h1 className="text-balance font-semibold text-2xl tracking-tight sm:text-3xl">
						{headline}
					</h1>
					{edition.editionName ? (
						<p className="text-muted-foreground">{edition.editionName}</p>
					) : null}
				</div>

				<ul className="flex flex-wrap gap-1.5 text-sm">
					{[
						edition.language,
						edition.format,
						edition.pages
							? `${edition.pages.toLocaleString("en-US")} pages`
							: null,
						edition.publishedYear ? String(edition.publishedYear) : null,
					]
						.filter((chip): chip is string => Boolean(chip))
						.map((chip) => (
							<li
								key={chip}
								className="border border-border bg-muted/40 px-2 py-0.5 tabular-nums"
							>
								{chip}
							</li>
						))}
				</ul>

				<dl className="divide-y divide-border border-border border-y">
					{edition.publishers.length > 0 ? (
						<Field label="Publisher">{edition.publishers.join(", ")}</Field>
					) : null}
					{edition.publishPlaces.length > 0 ? (
						<Field label="Place">{edition.publishPlaces.join(", ")}</Field>
					) : null}
					{edition.publishDate || edition.publishedYear ? (
						<Field label="Published">
							{edition.publishDate ?? String(edition.publishedYear)}
						</Field>
					) : null}
					{edition.translator ? (
						<Field label="Translator">{edition.translator}</Field>
					) : null}
					{edition.series ? (
						<Field label="Series">{edition.series}</Field>
					) : null}
					{edition.isbn13 ? (
						<Field label="ISBN-13">
							<Isbn value={edition.isbn13} label="ISBN-13" />
						</Field>
					) : null}
					{edition.isbn10 ? (
						<Field label="ISBN-10">
							<Isbn value={edition.isbn10} label="ISBN-10" />
						</Field>
					) : null}
					{edition.source === "member" && edition.createdBy ? (
						<Field label="Added by">
							<Link
								href={`/users/${edition.createdBy.username}` as Route}
								className="underline-offset-4 hover:underline"
							>
								{edition.createdBy.name}
							</Link>
						</Field>
					) : null}
				</dl>
			</div>
		</header>
	);
}
