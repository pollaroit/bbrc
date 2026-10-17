import type { GetUserFeedbackListOutput } from "@bbrc/api/modules/feedback/feedback.schema";
import { contentPlainText } from "@bbrc/shared";
import { Badge } from "@bbrc/ui/components/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { FeedbackEditIconButton } from "@/components/blocks/feedback-edit-icon-button";
import { ResourceShareMenu } from "@/components/blocks/resource-share-menu";
import { SocialContentBody } from "@/components/blocks/social-content-body";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { formatDateTime } from "@/lib/format-datetime";
import { shareSnippet } from "@/lib/share-snippet";

type UserFeedbackCardProps = {
	item: GetUserFeedbackListOutput["items"][number];
	showEdit?: boolean;
};

export function UserFeedbackCard({
	item,
	showEdit = false,
}: UserFeedbackCardProps) {
	const bookHref = `/books/${item.book.slug}` as Route;
	const feedbackHref =
		`/books/${item.book.slug}/feedbacks/${item.slug}` as Route;
	const coverSrc = bookCoverUrl(item.book.coverId);

	return (
		<Card size="sm">
			<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
				<CardTitle className="text-base">
					<Link href={bookHref} className="hover:underline">
						{item.book.title}
					</Link>
				</CardTitle>
				<Badge variant="secondary">{item.rating.toFixed(1)} / 5</Badge>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
				<Link
					href={bookHref}
					className="relative aspect-2/3 w-14 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10"
				>
					{coverSrc ? (
						<Image
							src={coverSrc}
							alt=""
							fill
							className="object-cover"
							sizes="56px"
						/>
					) : (
						<div className="flex size-full items-center justify-center text-muted-foreground text-xs">
							No cover
						</div>
					)}
				</Link>
				<div className="min-w-0 flex-1 space-y-2">
					<p className="text-muted-foreground text-sm">
						{formatBookAuthors(item.book.authors)}
					</p>
					<div className="relative">
						<Link
							href={feedbackHref}
							className="absolute inset-0 z-0"
							aria-label={`Open review for ${item.book.title}`}
						/>
						<div className="pointer-events-none relative z-[1] [&_*]:pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
							{contentPlainText(item.review).trim().length > 0 ? (
								<SocialContentBody
									content={item.review}
									isSpoiler={item.isSpoiler}
									kind="feedback"
									identifier={item.slug}
									interactiveLinks
								/>
							) : (
								<p className="text-muted-foreground text-sm italic">
									Rating only — no written review.
								</p>
							)}
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<p className="text-muted-foreground text-xs">
							{formatDateTime(item.createdAt)}
						</p>
						{showEdit ? (
							<FeedbackEditIconButton
								bookSlug={item.book.slug}
								rating={item.rating}
								review={item.review}
								isSpoiler={item.isSpoiler}
							/>
						) : null}
						<ResourceShareMenu
							path={`/books/${item.book.slug}/feedbacks/${item.slug}`}
							shareText={`${item.book.title} · ${shareSnippet(item.review)}`}
							label="Share review"
							shareInPost={{ kind: "feedback", slug: item.slug }}
						/>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
