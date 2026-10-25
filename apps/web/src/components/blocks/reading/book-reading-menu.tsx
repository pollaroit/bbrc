"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import {
	BookCopy,
	BookmarkCheck,
	BookmarkPlus,
	BookOpen,
	ChevronDown,
	SlidersHorizontal,
	XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { ReadingProgressControl } from "@/components/blocks/reading/reading-progress-control";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { useAbandonReading, useReadingState } from "@/lib/reading/use-reading";
import { useWishlistAction } from "@/lib/reading/use-wishlist-action";
import { cn } from "@/lib/utils";

// The picker (and its search) only loads when the dialog opens.
const StartReadingDialog = dynamic(
	() =>
		import("@/components/blocks/reading/start-reading-dialog").then(
			(mod) => mod.StartReadingDialog,
		),
	{ ssr: false },
);

/*
 * The chevron next to "Mark as read": wishlist and "currently reading".
 *
 * <BookReadingMenu bookSlug bookTitle bookPages hasRead />
 * Renders nothing for a book that is already read (no wishlist or reading
 * buttons then), and while the state is still loading. Meant to sit inside the
 * grouped button, so the trigger carries its own left divider.
 */

type Props = {
	bookSlug: string;
	bookTitle: string;
	bookPages: number;
	/** The read state the parent already knows (hides the menu once read). */
	hasRead: boolean;
	className?: string;
};

export function BookReadingMenu({
	bookSlug,
	bookTitle,
	bookPages,
	hasRead,
	className,
}: Props) {
	const state = useReadingState(bookSlug);
	const wishlist = useWishlistAction(bookSlug);
	const abandon = useAbandonReading();
	const [startOpen, setStartOpen] = useState(false);
	const [editionOpen, setEditionOpen] = useState(false);
	const [progressOpen, setProgressOpen] = useState(false);
	const [stopOpen, setStopOpen] = useState(false);

	if (hasRead || !state.data || state.data.hasRead) return null;

	const { inWishlist, reading } = state.data;

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							type="button"
							size="icon"
							aria-label="Wishlist and reading options"
							className={cn(
								"shrink-0 border-primary-foreground/25 border-s",
								className,
							)}
						/>
					}
				>
					<ChevronDown aria-hidden />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="min-w-56">
					{inWishlist ? (
						<DropdownMenuItem
							onClick={() => wishlist.remove()}
							disabled={wishlist.isPending}
						>
							<BookmarkCheck aria-hidden />
							Remove from wishlist
						</DropdownMenuItem>
					) : (
						<DropdownMenuItem
							onClick={() => wishlist.add()}
							disabled={wishlist.isPending}
						>
							<BookmarkPlus aria-hidden />
							Add to wishlist
						</DropdownMenuItem>
					)}
					<DropdownMenuSeparator />
					{reading ? (
						<>
							<DropdownMenuItem onClick={() => setProgressOpen(true)}>
								<SlidersHorizontal aria-hidden />
								Update progress
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => setEditionOpen(true)}>
								<BookCopy aria-hidden />
								Change edition
							</DropdownMenuItem>
							<DropdownMenuItem
								variant="destructive"
								onClick={() => setStopOpen(true)}
							>
								<XCircle aria-hidden />
								Stop reading
							</DropdownMenuItem>
						</>
					) : (
						<DropdownMenuItem onClick={() => setStartOpen(true)}>
							<BookOpen aria-hidden />
							I'm currently reading
						</DropdownMenuItem>
					)}
				</DropdownMenuContent>
			</DropdownMenu>

			<StartReadingDialog
				bookSlug={bookSlug}
				bookTitle={bookTitle}
				bookPages={bookPages}
				open={startOpen}
				onOpenChange={setStartOpen}
			/>
			{reading ? (
				<StartReadingDialog
					bookSlug={bookSlug}
					bookTitle={bookTitle}
					bookPages={bookPages}
					open={editionOpen}
					onOpenChange={setEditionOpen}
					reading={reading}
				/>
			) : null}
			{reading ? (
				<Dialog open={progressOpen} onOpenChange={setProgressOpen}>
					<DialogContent className="gap-4 sm:max-w-md">
						<DialogHeader>
							<DialogTitle>Update your progress</DialogTitle>
							<DialogDescription>{bookTitle}</DialogDescription>
						</DialogHeader>
						<ReadingProgressControl reading={reading} />
					</DialogContent>
				</Dialog>
			) : null}
			{reading ? (
				<DestructiveConfirmDialog
					open={stopOpen}
					onOpenChange={setStopOpen}
					title="Stop reading this book?"
					description="Your progress on this book is removed. You can start again whenever you like."
					confirmLabel="Stop reading"
					onConfirm={() => {
						setStopOpen(false);
						abandon.mutate({ id: reading.id });
					}}
				/>
			) : null}
		</>
	);
}
