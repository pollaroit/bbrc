"use client";

import { BookAdminMenu } from "@/components/blocks/book-admin-menu";
import { BookHeaderActions } from "@/components/blocks/book-header-actions";
import { BookQuizButton } from "@/components/blocks/book-quiz-button";
import { ResourceShareMenu } from "@/components/blocks/resource-share-menu";
import { deckButtonClass, deckLabelClass } from "@/lib/book-deck";
import { cn } from "@/lib/utils";

type BookActionDockProps = {
	slug: string;
	title: string;
	hidden: boolean;
};

/**
 * The tools around a book in one row: shelf, feedback, favorite, quiz and share
 * in a single bordered group on the left, the admin menu at the far right.
 * Colour is only in the icons. The primary action (mark as read) lives apart,
 * under the cover.
 */
export function BookActionDock({ slug, title, hidden }: BookActionDockProps) {
	return (
		<div className="flex items-center justify-between gap-2">
			<div className="flex min-w-0 flex-1 items-stretch divide-x divide-border overflow-hidden rounded-md border border-border md:flex-none">
				<BookHeaderActions bookSlug={slug} bookTitle={title} />
				<BookQuizButton bookSlug={slug} deck />
				<ResourceShareMenu
					path={`/books/${slug}`}
					shareText={title}
					label="Share book"
					storyBookSlug={slug}
					shareInPost={{ kind: "book", slug }}
					size="md"
					triggerClassName={cn(deckButtonClass, "text-foreground")}
					labelClassName={deckLabelClass}
				/>
			</div>
			<BookAdminMenu slug={slug} title={title} hidden={hidden} />
		</div>
	);
}
