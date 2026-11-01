"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { Bookmark } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BookmarkMarkDialogList } from "@/components/blocks/bookmark-mark-dialog-list";
import { SignInLink, useSignInHref } from "@/components/blocks/sign-in-link";
import { authClient } from "@/lib/auth-client";
import { useSyncedBoolean } from "@/lib/optimistic/use-synced-boolean";
import {
	type BookmarkKind,
	setViewerBookmark,
	useBookmarkCount,
	useViewerBookmark,
} from "@/lib/optimistic/viewer-bookmarks";
import { cn } from "@/lib/utils";
import { client, orpc } from "@/utils/orpc";

type BookmarkButtonProps = {
	bookmarked: boolean;
	size?: "sm" | "md";
	onClick: () => void;
	label: string;
};

function BookmarkIconButton({
	bookmarked,
	size = "md",
	onClick,
	label,
}: BookmarkButtonProps) {
	const isSmall = size === "sm";
	const [popKey, setPopKey] = useState(0);
	const previous = useRef(bookmarked);

	useEffect(() => {
		if (bookmarked && !previous.current) {
			setPopKey((key) => key + 1);
		}
		previous.current = bookmarked;
	}, [bookmarked]);

	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			className={cn(
				"relative text-muted-foreground hover:bg-transparent hover:text-foreground aria-expanded:bg-transparent dark:hover:bg-transparent",
				isSmall && "size-7",
				bookmarked && "text-foreground",
			)}
			onClick={onClick}
			aria-label={label}
			aria-pressed={bookmarked}
		>
			<Bookmark
				key={`bookmark-${popKey}`}
				className={cn(
					isSmall ? "size-3" : "size-4",
					"transition-colors",
					bookmarked && "fill-current",
				)}
				aria-hidden
			/>
		</Button>
	);
}

type BookmarkEngagementProps = {
	kind: BookmarkKind;
	slug: string;
	noun: "post" | "comment";
	isOwner: boolean;
	size?: "sm" | "md";
	className?: string;
	renderBookmarkers?: (enabled: boolean) => ReactNode;
};

export function BookmarkEngagement({
	kind,
	slug,
	noun,
	isOwner,
	size = "md",
	className,
	renderBookmarkers,
}: BookmarkEngagementProps) {
	const { data: session } = authClient.useSession();
	const queryClient = useQueryClient();
	const signInHref = useSignInHref();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [baseCount, setBaseCount] = useState(0);

	const viewerBookmarked = useViewerBookmark(kind, slug);
	const serverBookmarked = viewerBookmarked ?? false;
	const loadedCount = useBookmarkCount(kind, slug, isOwner);

	useEffect(() => {
		if (loadedCount != null) setBaseCount(loadedCount);
	}, [loadedCount]);

	const sync = useSyncedBoolean({
		serverValue: serverBookmarked,
		send: (bookmarked) =>
			client.bookmark.set({ [`${kind}Slug`]: slug, bookmarked } as {
				postSlug?: string;
				commentSlug?: string;
				bookmarked: boolean;
			}),
		confirmedFrom: (result) => result.bookmarked,
		onConfirmed: (result) => {
			setViewerBookmark(kind, slug, result.bookmarked);
			if (isOwner) setBaseCount(result.bookmarkCount);
			void queryClient.invalidateQueries({
				queryKey: orpc.bookmark.listMarks.key(),
			});
			void queryClient.invalidateQueries({
				queryKey: orpc.bookmark.list.key(),
			});
		},
		onError: (error) => {
			toast.error(
				error instanceof Error
					? error.message
					: "Could not update your bookmark.",
			);
		},
	});

	const bookmarkCount = Math.max(
		0,
		baseCount + (sync.value ? 1 : 0) - (serverBookmarked ? 1 : 0),
	);

	function handleToggle() {
		if (!session?.user) {
			toast.error(`Sign in to bookmark ${noun}s.`, {
				action: {
					label: "Sign in",
					onClick: () => {
						window.location.href = signInHref;
					},
				},
			});
			return;
		}
		sync.toggle();
	}

	const isSmall = size === "sm";
	const bookmarkers = renderBookmarkers?.(dialogOpen) ?? (
		<BookmarkMarkDialogList
			{...(kind === "post" ? { postSlug: slug } : { commentSlug: slug })}
			enabled={dialogOpen}
		/>
	);

	return (
		<>
			<div
				className={cn(
					"inline-flex items-center gap-0.5 text-muted-foreground",
					isSmall ? "text-xs" : "text-sm",
					className,
				)}
			>
				<BookmarkIconButton
					bookmarked={sync.value}
					size={size}
					onClick={handleToggle}
					label={
						sync.value ? `Remove bookmark from ${noun}` : `Bookmark ${noun}`
					}
				/>
				{isOwner ? (
					<Button
						type="button"
						variant="link"
						className={cn(
							"h-auto px-1 py-0 text-inherit tabular-nums",
							isSmall && "text-xs",
						)}
						onClick={() => setDialogOpen(true)}
					>
						{bookmarkCount}
					</Button>
				) : null}
			</div>

			{isOwner ? (
				<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
					<DialogContent className="flex max-h-[min(90vh,560px)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
						<DialogHeader className="border-border border-b p-4">
							<DialogTitle>Bookmarks</DialogTitle>
							<DialogDescription>
								{bookmarkCount === 1
									? `1 member saved this ${noun}.`
									: `${bookmarkCount} members saved this ${noun}.`}
							</DialogDescription>
						</DialogHeader>
						<div className="min-h-0 flex-1 overflow-y-auto p-4">
							{bookmarkers}
						</div>
						{!session?.user ? (
							<p className="border-border border-t px-4 py-3 text-center text-muted-foreground text-sm">
								<SignInLink className="text-foreground underline">
									Sign in
								</SignInLink>{" "}
								to bookmark this {noun}.
							</p>
						) : null}
					</DialogContent>
				</Dialog>
			) : null}
		</>
	);
}
