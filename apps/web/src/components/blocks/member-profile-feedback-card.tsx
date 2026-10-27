"use client";

import type { GetUserFeedbackListOutput } from "@bbrc/api/modules/feedback/feedback.schema";
import { contentPlainText, formatFeedbackRating } from "@bbrc/shared";
import { Heart, MessageCircle, Star } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import { EditionChip } from "@/components/blocks/edition-chip";
import { FeedbackEditIconButton } from "@/components/blocks/feedback-edit-icon-button";
import { PostAttachedImage } from "@/components/blocks/post-attached-image";
import { RelativeTime } from "@/components/blocks/relative-time";
import { ResourceShareMenu } from "@/components/blocks/resource-share-menu";
import { SocialContentBody } from "@/components/blocks/social-content-body";
import { useImpressionRef } from "@/components/blocks/track-impression";
import { Link } from "@/i18n/navigation";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { shareSnippet } from "@/lib/share-snippet";

type Item = GetUserFeedbackListOutput["items"][number];

type MemberProfileFeedbackCardProps = {
	item: Item;
	showEdit?: boolean;
};

export function MemberProfileFeedbackCard({
	item,
	showEdit = false,
}: MemberProfileFeedbackCardProps) {
	const bookHref = `/books/${item.book.slug}` as Route;
	const feedbackHref =
		`/books/${item.book.slug}/feedbacks/${item.slug}` as Route;
	const coverSrc = bookCoverUrl(item.book.coverId, "M");
	const hasReview = contentPlainText(item.review).trim().length > 0;
	const countImpression = useImpressionRef("review", item.slug, "profile");

	return (
		<article
			ref={countImpression}
			className="relative flex h-full gap-3 border border-border p-3 transition-colors hover:bg-muted/40"
		>
			<Link
				href={feedbackHref}
				className="absolute inset-0 z-0"
				aria-label={`Open review of ${item.book.title}`}
			/>

			<Link
				href={bookHref}
				className="relative z-10 block aspect-2/3 w-16 shrink-0 self-start overflow-hidden bg-muted ring-1 ring-foreground/10"
				tabIndex={-1}
				aria-hidden
			>
				{coverSrc ? (
					<Image
						src={coverSrc}
						alt=""
						fill
						className="object-cover"
						sizes="64px"
					/>
				) : null}
			</Link>

			<div className="flex min-w-0 flex-1 flex-col gap-2">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<h3 className="font-medium text-sm leading-snug">
							<Link href={bookHref} className="relative z-10 hover:underline">
								{item.book.title}
							</Link>
						</h3>
						<p className="text-muted-foreground text-sm">
							{formatBookAuthors(item.book.authors)}
						</p>
					</div>
					<span className="inline-flex shrink-0 items-center gap-1 border border-border px-1.5 py-0.5 font-medium text-xs tabular-nums">
						<Star className="size-3.5 fill-warning text-warning" aria-hidden />
						{formatFeedbackRating(item.rating)}
					</span>
				</div>

				{hasReview ? (
					<div className="pointer-events-none relative z-[1] line-clamp-5 text-sm [&_*]:pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
						<SocialContentBody
							content={item.review}
							isSpoiler={item.isSpoiler}
							kind="feedback"
							identifier={item.slug}
							interactiveLinks
						/>
					</div>
				) : (
					<p className="text-muted-foreground text-sm italic">
						Rating only — no written review.
					</p>
				)}

				{item.imageUrl ? (
					<Link
						href={`/books/${item.book.slug}/feedbacks/${item.slug}` as Route}
						className="relative z-10 block"
					>
						<PostAttachedImage
							src={item.imageUrl}
							alt=""
							compact
							className="mt-0"
						/>
					</Link>
				) : null}

				<EditionChip
					bookSlug={item.book.slug}
					edition={item.readEdition}
					className="self-start"
				/>

				<div className="relative z-10 mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-xs tabular-nums">
					<RelativeTime
						date={item.createdAt}
						className="text-muted-foreground text-xs"
					/>
					<span className="inline-flex items-center gap-1">
						<Heart className="size-3.5" aria-hidden />
						{item.likeCount}
					</span>
					<span className="inline-flex items-center gap-1">
						<MessageCircle className="size-3.5" aria-hidden />
						{item.commentCount}
					</span>
					<span className="ml-auto flex items-center gap-1">
						{showEdit ? (
							<FeedbackEditIconButton
								bookSlug={item.book.slug}
								rating={item.rating}
								review={item.review}
								isSpoiler={item.isSpoiler}
								imageUrl={item.imageUrl}
								feedbackSlug={item.slug}
							/>
						) : null}
						<ResourceShareMenu
							path={`/books/${item.book.slug}/feedbacks/${item.slug}`}
							shareText={`${item.book.title} · ${shareSnippet(item.review)}`}
							label="Share review"
							shareInPost={{ kind: "feedback", slug: item.slug }}
							iconOnly
							triggerClassName="size-7 px-0"
						/>
					</span>
				</div>
			</div>
		</article>
	);
}
