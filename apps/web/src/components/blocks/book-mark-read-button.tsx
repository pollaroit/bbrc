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
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type BookMarkReadButtonProps = {
	bookSlug: string;
	bookTitle: string;
	className?: string;
	/** Full width on book detail; compact icon on library cards. */
	variant?: "full" | "icon";
	/**
	 * Library grid: pass read state from `getViewerLibraryEngagement`.
	 * `null` while loading (render nothing). Omit on book detail (per-book fetch).
	 */
	listHasRead?: boolean | null;
};

export function BookMarkReadButton({
	bookSlug,
	bookTitle,
	className,
	variant = "full",
	listHasRead,
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
					hasRead && "text-emerald-700 dark:text-emerald-400",
				)}
			/>
		</Button>
	);

	return (
		<>
			{variant === "icon" ? (
				<Tooltip>
					<TooltipTrigger render={iconButton} />
					<TooltipContent side="top">{label}</TooltipContent>
				</Tooltip>
			) : (
				<Button
					type="button"
					variant={hasRead ? "secondary" : "default"}
					className={cn("w-full", className)}
					onClick={() => setOpen(true)}
				>
					<BookCheck data-icon="inline-start" />
					{hasRead ? "Edit read" : "Mark read"}
				</Button>
			)}
			<BookMarkReadDialog
				bookSlug={bookSlug}
				bookTitle={bookTitle}
				open={open}
				onOpenChange={setOpen}
			/>
		</>
	);
}
