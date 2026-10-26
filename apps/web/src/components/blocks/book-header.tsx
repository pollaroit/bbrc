import type { TGetBookBySlugOutputSchema } from "@bbrc/api/modules/book/book.schema";
import { openLibraryWorkPageUrl } from "@bbrc/shared";
import { Badge } from "@bbrc/ui/components/badge";
import { Separator } from "@bbrc/ui/components/separator";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { BookAuthorLinks } from "@/components/blocks/book-author-links";
import { BookDeleteButton } from "@/components/blocks/book-delete-button";
import { BookEditLink } from "@/components/blocks/book-edit-link";
import { BookHeaderActions } from "@/components/blocks/book-header-actions";
import { BookMarkReadButton } from "@/components/blocks/book-mark-read-button";
import { BookQuizButton } from "@/components/blocks/book-quiz-button";
import { BookReadAfterLinks } from "@/components/blocks/book-read-after-links";
import { BookReadingStatCells } from "@/components/blocks/book-reading-stat-cells";
import { BookRequestedByLine } from "@/components/blocks/book-requested-by";
import { BookStatusBanner } from "@/components/blocks/book-status-badge";
import { LiveViewCount } from "@/components/blocks/live-view-count";
import { BookReadingStrip } from "@/components/blocks/reading/book-reading-strip";
import { ResourceShareMenu } from "@/components/blocks/resource-share-menu";
import { bookCoverFrameClassName, bookCoverUrl } from "@/lib/book-cover";
import { cn } from "@/lib/utils";

type BookHeaderProps = {
	book: TGetBookBySlugOutputSchema;
};

function StatCell({
	label,
	value,
	hint,
	href,
}: {
	label: string;
	value: React.ReactNode;
	hint?: string;
	href?: Route;
}) {
	const body = (
		<>
			<span className="text-muted-foreground text-xs">{label}</span>
			<span className="font-medium tabular-nums leading-tight">{value}</span>
			{hint ? (
				<span className="text-muted-foreground text-xs">{hint}</span>
			) : null}
		</>
	);

	if (href) {
		return (
			<Link
				href={href}
				className="flex min-w-0 flex-col gap-0.5 border border-border bg-card px-3 py-2 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
			>
				{body}
			</Link>
		);
	}

	return (
		<div className="flex min-w-0 flex-col gap-0.5 border border-border bg-card px-3 py-2">
			{body}
		</div>
	);
}

export function BookHeader({ book }: BookHeaderProps) {
	const coverSrc = bookCoverUrl(book.coverId, "L");
	const olWorkUrl = book.olid ? openLibraryWorkPageUrl(book.olid) : null;

	return (
		<header className="flex flex-col gap-6">
			<Link
				href={"/books" as Route}
				className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
			>
				<ArrowLeft className="size-4" />
				All books
			</Link>

			<BookStatusBanner status={book.status} />

			<div className="flex flex-col gap-8 lg:flex-row lg:items-start">
				<div className="mx-auto flex w-full max-w-56 shrink-0 flex-col gap-3 lg:mx-0">
					<div
						className={cn(
							"relative aspect-2/3 w-full",
							bookCoverFrameClassName,
						)}
					>
						{coverSrc ? (
							<Image
								src={coverSrc}
								alt=""
								fill
								className="object-cover"
								sizes="(max-width: 1024px) 100vw, 224px"
								priority
							/>
						) : (
							<div className="flex size-full items-center justify-center text-muted-foreground text-sm">
								No cover
							</div>
						)}
					</div>
					<BookMarkReadButton
						bookSlug={book.slug}
						bookTitle={book.title}
						bookPages={book.pages}
					/>
					<BookQuizButton bookSlug={book.slug} />
				</div>

				<div className="flex min-w-0 flex-1 flex-col gap-5">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div className="flex min-w-0 flex-col gap-2">
							<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
								{book.title}
							</h1>
							{book.series ? (
								<p className="text-muted-foreground text-sm">
									<span className="tabular-nums">#{book.series.position}</span>{" "}
									in{" "}
									<Link
										href={`/series/${book.series.slug}` as Route}
										className="text-foreground underline-offset-4 hover:underline"
									>
										{book.series.title}
									</Link>
								</p>
							) : null}
							<BookAuthorLinks
								authors={book.authors}
								refs={book.authorRefs}
								className="text-sm leading-relaxed"
							/>
							<BookReadAfterLinks readAfterBooks={book.readAfterBooks} />
							<LiveViewCount resource="book" itemRef={book.slug} />
							{book.requestedBy ? (
								<BookRequestedByLine requestedBy={book.requestedBy} />
							) : null}
						</div>
						<div className="flex shrink-0 flex-wrap items-center gap-1">
							<BookHeaderActions bookSlug={book.slug} bookTitle={book.title} />
							<ResourceShareMenu
								path={`/books/${book.slug}`}
								shareText={book.title}
								label="Share book"
								storyBookSlug={book.slug}
								shareInPost={{ kind: "book", slug: book.slug }}
								size="md"
							/>
							<BookEditLink slug={book.slug} />
							<BookDeleteButton slug={book.slug} title={book.title} />
						</div>
					</div>

					<BookReadingStrip
						bookSlug={book.slug}
						bookTitle={book.title}
						bookPages={book.pages}
					/>

					<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
						<StatCell
							label="Published"
							value={book.publishedIn ?? "—"}
							href={
								book.publishedIn != null
									? (`/books?minPublishedIn=${book.publishedIn}&maxPublishedIn=${book.publishedIn}` as Route)
									: undefined
							}
						/>
						<StatCell label="Pages" value={book.pages ?? "—"} />
						<StatCell
							label="Open Library"
							value={
								book.openLibraryRating != null
									? `${book.openLibraryRating.toFixed(1)} / 5`
									: "—"
							}
						/>
						<StatCell
							label="Club average"
							value={
								book.averageRating != null
									? `${book.averageRating.toFixed(1)} / 5`
									: "—"
							}
						/>
						<BookReadingStatCells bookSlug={book.slug} />
					</div>

					{olWorkUrl ? (
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline" className="font-normal">
								{book.olid}
							</Badge>
							<a
								href={olWorkUrl}
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-1 text-primary text-sm underline-offset-4 hover:underline"
							>
								Open Library work
								<ExternalLink className="size-3.5" />
							</a>
						</div>
					) : null}
				</div>
			</div>

			<Separator />
		</header>
	);
}
