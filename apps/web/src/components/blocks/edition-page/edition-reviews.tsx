import type { EditionPage } from "@bbrc/api/modules/edition/edition.schema";
import { Button } from "@bbrc/ui/components/button";
import { Star } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { EditionSection } from "@/components/blocks/edition-page/section";
import { RelativeTime } from "@/components/blocks/relative-time";
import { UserAvatar } from "@/components/blocks/user-avatar";

/** Reviews of the BOOK, written by members who read this edition. */
export function EditionReviews({
	bookSlug,
	reviews,
}: {
	bookSlug: string;
	reviews: EditionPage["reviews"];
}) {
	return (
		<EditionSection
			id="edition-reviews"
			title="What its readers said"
			description="Reviews of the book by members who read this edition."
			aside={
				<Button
					variant="ghost"
					size="sm"
					nativeButton={false}
					render={<Link href={`/books/${bookSlug}/reviews` as Route} />}
				>
					All reviews of the book
				</Button>
			}
		>
			{reviews.items.length === 0 ? (
				<p className="border border-border border-dashed p-4 text-muted-foreground text-sm">
					Nobody who read this edition has written a review yet.
				</p>
			) : (
				<>
					<ul className="grid gap-3 sm:grid-cols-2">
						{reviews.items.map((review) => (
							<li
								key={review.slug}
								className="flex flex-col gap-3 border border-border p-4"
							>
								<div className="flex items-center gap-3">
									<UserAvatar user={review.author} className="size-9" />
									<div className="flex min-w-0 flex-1 flex-col">
										<Link
											href={`/users/${review.author.username}` as Route}
											className="truncate font-medium text-sm underline-offset-4 hover:underline"
										>
											{review.author.name}
										</Link>
										<span className="text-muted-foreground text-xs">
											<RelativeTime date={review.createdAt} />
										</span>
									</div>
									<span
										className="inline-flex items-center gap-1 font-semibold text-sm tabular-nums"
										role="img"
										aria-label={`Rated ${review.rating.toFixed(1)} out of 5`}
									>
										<Star
											className="size-4 fill-current text-warning-ink"
											aria-hidden
										/>
										{review.rating.toFixed(1)}
									</span>
								</div>
								{review.isSpoiler ? (
									<details className="text-sm">
										<summary className="cursor-pointer text-muted-foreground">
											Contains spoilers. Show the review
										</summary>
										<p className="mt-2 line-clamp-6 text-pretty leading-relaxed">
											{review.excerpt}
										</p>
									</details>
								) : review.excerpt ? (
									<p className="line-clamp-5 text-pretty text-sm leading-relaxed">
										{review.excerpt}
									</p>
								) : (
									<p className="text-muted-foreground text-sm">
										Rated, no written review.
									</p>
								)}
								<Link
									href={`/books/${bookSlug}/feedbacks/${review.slug}` as Route}
									className="mt-auto w-fit text-sm underline underline-offset-4"
								>
									Read the review
								</Link>
							</li>
						))}
					</ul>
					{reviews.total > reviews.items.length ? (
						<p className="text-muted-foreground text-xs">
							Showing {reviews.items.length} of {reviews.total}.
						</p>
					) : null}
				</>
			)}
		</EditionSection>
	);
}
