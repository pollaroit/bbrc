import type { TGetBookBySlugOutputSchema } from "@bbrc/api/modules/book/book.schema";
import type { GetBookFeedbackListOutput } from "@bbrc/api/modules/feedback/feedback.schema";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import { Separator } from "@bbrc/ui/components/separator";
import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { BookEditLink } from "@/components/blocks/book-edit-link";
import { BookFavoriteButton } from "@/components/blocks/book-favorite-button";
import { BookFeedbackSection } from "@/components/blocks/book-feedback-section";
import { BookStatusBadge } from "@/components/blocks/book-status-badge";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";

type BookDetailProps = {
	book: TGetBookBySlugOutputSchema;
	initialReviews: GetBookFeedbackListOutput;
};

export function BookDetail({ book, initialReviews }: BookDetailProps) {
	const coverSrc = bookCoverUrl(book.coverId, "L");

	return (
		<div className="flex flex-col gap-8">
			<Link
				href={"/books" as Route}
				className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
			>
				<ArrowLeft className="size-4" />
				All books
			</Link>

			<div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
				<div className="relative mx-auto aspect-2/3 w-full max-w-56 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10 lg:mx-0">
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

				<div className="min-w-0 flex-1 space-y-4">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div className="space-y-1.5">
							<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
								{book.title}
							</h1>
							<p className="text-muted-foreground">
								{formatBookAuthors(book.authors)}
							</p>
						</div>
						<div className="flex shrink-0 items-center gap-1">
							<BookFavoriteButton
								bookSlug={book.slug}
								bookTitle={book.title}
								variant="inline"
							/>
							<BookStatusBadge status={book.status} />
							<BookEditLink slug={book.slug} />
						</div>
					</div>

					<dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
						<div>
							<dt className="text-muted-foreground text-xs">Published</dt>
							<dd className="font-medium tabular-nums">{book.publishedIn}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground text-xs">Pages</dt>
							<dd className="font-medium tabular-nums">{book.pages}</dd>
						</div>
						<div>
							<dt className="text-muted-foreground text-xs">Open Library</dt>
							<dd className="font-medium tabular-nums">
								{book.openLibraryRating != null
									? `${book.openLibraryRating.toFixed(1)} / 5`
									: "—"}
							</dd>
						</div>
						<div>
							<dt className="text-muted-foreground text-xs">Club average</dt>
							<dd className="font-medium tabular-nums">
								{book.averageRating != null
									? `${book.averageRating.toFixed(1)} / 5`
									: "—"}
							</dd>
						</div>
					</dl>
				</div>
			</div>

			{book.excerpt ? (
				<>
					<Separator />
					<section aria-labelledby="book-excerpt-heading">
						<h2
							id="book-excerpt-heading"
							className="mb-3 font-semibold text-lg"
						>
							About this book
						</h2>
						<p className="max-w-3xl whitespace-pre-wrap text-muted-foreground text-sm leading-relaxed">
							{book.excerpt}
						</p>
					</section>
				</>
			) : null}

			<Separator />

			<BookFeedbackSection
				bookSlug={book.slug}
				initialReviews={initialReviews}
			/>

			<section aria-labelledby="book-meta-heading">
				<h2 id="book-meta-heading" className="sr-only">
					Library record
				</h2>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<Card size="sm">
						<CardHeader>
							<CardTitle>Added to BBRC</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="font-medium tabular-nums">
								{new Intl.DateTimeFormat(undefined, {
									dateStyle: "medium",
								}).format(book.createdAt)}
							</p>
						</CardContent>
					</Card>
					<Card size="sm">
						<CardHeader>
							<CardTitle>Catalog slug</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="font-mono text-sm">{book.slug}</p>
						</CardContent>
					</Card>
				</div>
			</section>
		</div>
	);
}
