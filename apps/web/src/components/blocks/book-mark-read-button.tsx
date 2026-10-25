"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@bbrc/ui/components/tooltip";
import { useQuery } from "@tanstack/react-query";
import { BookCheck } from "lucide-react";
import { type MouseEvent, useState } from "react";
import { BookMarkReadDialog } from "@/components/blocks/book-mark-read-dialog";
import { BookReadingMenu } from "@/components/blocks/reading/book-reading-menu";
import { authClient } from "@/lib/auth-client";
import { invalidateReadingQueries } from "@/lib/reading/use-reading";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type BookMarkReadButtonProps = {
	bookSlug: string;
	bookTitle: string;
	className?: string;
	tooltipSide?: "top" | "right" | "bottom" | "left";
	/** Full width on book detail; compact icon on library cards. */
	variant?: "full" | "icon";
	/**
	 * Library grid: pass read state from `getViewerLibraryEngagement`.
	 * `null` while loading (render nothing). Omit on book detail (per-book fetch).
	 */
	listHasRead?: boolean | null;
	/** Pages of the book, for the "currently reading" modal (book detail only). */
	bookPages?: number;
};

export function BookMarkReadButton({
	bookSlug,
	bookTitle,
	className,
	tooltipSide = "top",
	variant = "full",
	listHasRead,
	bookPages = 0,
}: BookMarkReadButtonProps) {
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const [open, setOpen] = useState(false);

	const useListMode = listHasRead !== undefined;

	const stateQuery = useQuery({
		...orpc.read.getBookReadState.queryOptions({
			input: { bookSlug },
		}),
		enabled: Boolean(session?.user) && !useListMode,
	});

	if (sessionPending || !session?.user) {
		return null;
	}

	if (useListMode && listHasRead === null) {
		return null;
	}

	// Only hide until the first fetch completes. Do not hide on background
	// refetches (e.g. when the dialog opens and also reads getBookReadState).
	if (!useListMode && stateQuery.isPending) {
		return null;
	}

	const hasRead = useListMode
		? (listHasRead ?? false)
		: (stateQuery.data?.hasRead ?? false);

	const label = hasRead ? "Edit read" : "Mark as read";

	// Marking a book read ends the reading and clears the wishlist: refresh both.
	const changeOpen = (next: boolean) => {
		setOpen(next);
		if (!next) invalidateReadingQueries();
	};

	const openDialog = (event: MouseEvent) => {
		event.preventDefault();
		event.stopPropagation();
		setOpen(true);
	};

	const iconButton = (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			className={cn(className)}
			onClick={openDialog}
			aria-pressed={hasRead}
			aria-label={label}
		>
			<BookCheck
				className={cn(
					"size-[1.125rem] transition-transform active:scale-95",
					hasRead && "text-success-ink",
				)}
			/>
		</Button>
	);

	return (
		<>
			{variant === "icon" ? (
				<Tooltip>
					<TooltipTrigger render={iconButton} />
					<TooltipContent side={tooltipSide}>{label}</TooltipContent>
				</Tooltip>
			) : (
				<div className={cn("flex w-full", className)}>
					<Button
						type="button"
						variant={hasRead ? "secondary" : "default"}
						className="min-w-0 flex-1 rounded-e-none"
						onClick={() => setOpen(true)}
					>
						<BookCheck data-icon="inline-start" />
						{hasRead ? "Edit read" : "Mark read"}
					</Button>
					{useListMode ? null : (
						<BookReadingMenu
							bookSlug={bookSlug}
							bookTitle={bookTitle}
							bookPages={bookPages}
							hasRead={hasRead}
							className="rounded-s-none"
						/>
					)}
				</div>
			)}
			<BookMarkReadDialog
				bookSlug={bookSlug}
				bookTitle={bookTitle}
				open={open}
				onOpenChange={changeOpen}
			/>
		</>
	);
}
