import type { TGetBookBySlugOutputSchema } from "@bbrc/api/modules/book/book.schema";
import { authorNameToSlug, openLibraryWorkPageUrl } from "@bbrc/shared";
import { Badge } from "@bbrc/ui/components/badge";
import { Separator } from "@bbrc/ui/components/separator";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { BookDeleteButton } from "@/components/blocks/book-delete-button";
import { BookEditLink } from "@/components/blocks/book-edit-link";
import { BookFavoriteButton } from "@/components/blocks/book-favorite-button";
import { BookHeaderWriteFeedback } from "@/components/blocks/book-header-write-feedback";
import { BookMarkReadButton } from "@/components/blocks/book-mark-read-button";
import { BookReadAfterLinks } from "@/components/blocks/book-read-after-links";
import { BookRequestedByLine } from "@/components/blocks/book-requested-by";
import { BookStatusBanner } from "@/components/blocks/book-status-badge";
import { ResourceShareMenu } from "@/components/blocks/resource-share-menu";
import { bookCoverFrameClassName, bookCoverUrl } from "@/lib/book-cover";
import { cn } from "@/lib/utils";

type BookHeaderProps = {
	book: TGetBookBySlugOutputSchema;
};

function AuthorLinks({ authors }: { authors: string[] }) {
	if (authors.length === 0) {
		return <span className="text-muted-foreground">Unknown author</span>;
	}

	return (
		<p className="text-muted-foreground text-sm leading-relaxed">
			{authors.map((name, index) => {
				const slug = authorNameToSlug(name);
				const href = `/books?authors=${encodeURIComponent(slug)}` as Route;

				return (
					<span key={`${slug}-${index}`}>
						{index > 0 ? ", " : null}
						<Link
							href={href}
							className="text-foreground underline-offset-4 hover:underline"
						>
							{name}
						</Link>
					</span>
				);
			})}
		</p>
	);
}

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
					<BookMarkReadButton bookSlug={book.slug} bookTitle={book.title} />
				</div>

				<div className="flex min-w-0 flex-1 flex-col gap-5">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div className="flex min-w-0 flex-col gap-2">
							<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
								{book.title}
							</h1>
							<AuthorLinks authors={book.authors} />
							<BookReadAfterLinks readAfterBooks={book.readAfterBooks} />
							{book.requestedBy ? (
								<BookRequestedByLine requestedBy={book.requestedBy} />
							) : null}
						</div>
						<div className="flex shrink-0 flex-wrap items-center gap-1">
							<BookHeaderWriteFeedback bookSlug={book.slug} />
							<ResourceShareMenu
								path={`/books/${book.slug}`}
								shareText={book.title}
								label="Share book"
								storyBookSlug={book.slug}
								shareInPost={{ kind: "book", slug: book.slug }}
								size="md"
							/>
							<BookFavoriteButton
								bookSlug={book.slug}
								bookTitle={book.title}
								variant="inline"
							/>
							<BookEditLink slug={book.slug} />
							<BookDeleteButton slug={book.slug} title={book.title} />
						</div>
					</div>

					<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
