"use client";

import type { ReactNode } from "react";
import { BookAddToShelfDialog } from "@/components/blocks/book-add-to-shelf-dialog";
import type { BookListFavoriteEngagement } from "@/components/blocks/book-favorite-button";
import { BookFavoriteButton } from "@/components/blocks/book-favorite-button";
import { BookMarkReadButton } from "@/components/blocks/book-mark-read-button";
import { BookWriteFeedbackButton } from "@/components/blocks/book-write-feedback-button";
import { BookWishlistButton } from "@/components/blocks/reading/book-wishlist-button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type BookCardActionBarProps = {
	bookSlug: string;
	bookTitle: string;
	viewerHasRead?: boolean | null;
	listEngagement?: BookListFavoriteEngagement | null;
	feedbackBookSlugs?: Set<string> | null;
	layout?: "row" | "column";
};

const railIconClassName = "size-10 shrink-0";

function RailSlot({ children }: { children: ReactNode }) {
	return (
		<div className="flex h-10 w-full items-center justify-center">
			{children}
		</div>
	);
}

export function BookCardActionBar({
	bookSlug,
	bookTitle,
	viewerHasRead,
	listEngagement,
	feedbackBookSlugs,
	layout = "column",
}: BookCardActionBarProps) {
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const username = session?.user.username;
	const tooltipSide = layout === "column" ? "left" : "top";

	const hasFeedback = feedbackBookSlugs?.has(bookSlug) ?? false;
	const canWriteFeedback =
		viewerHasRead === true && feedbackBookSlugs != null && !hasFeedback;
	const canEditFeedback = hasFeedback && feedbackBookSlugs != null;

	if (sessionPending || !session?.user) {
		return null;
	}

	const engagementLoading =
		viewerHasRead === null ||
		listEngagement === null ||
		feedbackBookSlugs === null;

	if (layout === "column" && engagementLoading) {
		return null;
	}

	// A book you have read has no wishlist.
	const canWishlist = viewerHasRead === false;

	const showFavorite =
		listEngagement != null &&
		(listEngagement.isFavorite || listEngagement.canFavorite);

	const feedbackAction = canEditFeedback ? (
		<BookWriteFeedbackButton
			bookSlug={bookSlug}
			variant="icon"
			mode="edit"
			className={railIconClassName}
			tooltipSide={tooltipSide}
		/>
	) : canWriteFeedback ? (
		<BookWriteFeedbackButton
			bookSlug={bookSlug}
			variant="icon"
			mode="create"
			className={railIconClassName}
			tooltipSide={tooltipSide}
		/>
	) : null;

	const columnActions = (
		<>
			<RailSlot>
				<BookMarkReadButton
					bookSlug={bookSlug}
					bookTitle={bookTitle}
					variant="icon"
					listHasRead={viewerHasRead}
					className={railIconClassName}
					tooltipSide={tooltipSide}
				/>
			</RailSlot>
			{canWishlist ? (
				<RailSlot>
					<BookWishlistButton
						bookSlug={bookSlug}
						className={railIconClassName}
						tooltipSide={tooltipSide}
					/>
				</RailSlot>
			) : null}
			{username ? (
				<RailSlot>
					<BookAddToShelfDialog
						bookSlug={bookSlug}
						username={username}
						trigger="icon"
						className={railIconClassName}
						tooltipSide={tooltipSide}
					/>
				</RailSlot>
			) : null}
			{feedbackAction ? <RailSlot>{feedbackAction}</RailSlot> : null}
			{showFavorite ? (
				<RailSlot>
					<BookFavoriteButton
						bookSlug={bookSlug}
						bookTitle={bookTitle}
						variant="inline"
						listEngagement={listEngagement}
						className={railIconClassName}
						tooltipSide={tooltipSide}
					/>
				</RailSlot>
			) : null}
		</>
	);

	if (layout === "column") {
		return (
			<div
				className={cn(
					"flex h-full w-11 shrink-0 flex-col border-border border-l",
					"bg-muted/10 transition-colors group-hover:bg-muted/20",
				)}
			>
				<div
					role="toolbar"
					aria-label={`Actions for ${bookTitle}`}
					className="flex flex-col divide-y divide-border"
				>
					{columnActions}
				</div>
			</div>
		);
	}

	return (
		<div className="flex shrink-0 flex-wrap items-center gap-0.5">
			<BookMarkReadButton
				bookSlug={bookSlug}
				bookTitle={bookTitle}
				variant="icon"
				listHasRead={viewerHasRead}
			/>
			{canWishlist ? <BookWishlistButton bookSlug={bookSlug} /> : null}
			{username ? (
				<BookAddToShelfDialog
					bookSlug={bookSlug}
					username={username}
					trigger="icon"
				/>
			) : null}
			{feedbackAction}
			<BookFavoriteButton
				bookSlug={bookSlug}
				bookTitle={bookTitle}
				variant="inline"
				listEngagement={listEngagement}
			/>
		</div>
	);
}
