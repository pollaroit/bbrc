"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@bbrc/ui/components/tooltip";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useWishlistAction } from "@/lib/reading/use-wishlist-action";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

/*
 * The bookmark on a book card: on or off the wishlist, at once.
 *
 * <BookWishlistButton bookSlug tooltipSide className />
 * It reads the same "library engagement" query the book list already loads
 * (so there is no request per card) and shows nothing until that is known.
 * The caller decides whether the book is read (a read book has no wishlist).
 */

type Props = {
	bookSlug: string;
	className?: string;
	tooltipSide?: "top" | "right" | "bottom" | "left";
};

export function BookWishlistButton({
	bookSlug,
	className,
	tooltipSide = "top",
}: Props) {
	const engagement = useQuery({
		...orpc.favorite.getViewerLibraryEngagement.queryOptions(),
		staleTime: 60_000,
	});
	const wishlist = useWishlistAction(bookSlug);

	if (!engagement.data) return null;

	const inWishlist = engagement.data.wishlistSlugs.includes(bookSlug);
	const label = inWishlist ? "Remove from wishlist" : "Add to wishlist";
	const Icon = inWishlist ? BookmarkCheck : Bookmark;

	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className={cn(className)}
						aria-pressed={inWishlist}
						aria-label={label}
						disabled={wishlist.isPending}
						onClick={(event) => {
							event.preventDefault();
							event.stopPropagation();
							if (inWishlist) wishlist.remove();
							else wishlist.add();
						}}
					/>
				}
			>
				<Icon
					className={cn(
						"size-[1.125rem] transition-transform active:scale-95",
						inWishlist && "text-info-ink",
					)}
					aria-hidden
				/>
			</TooltipTrigger>
			<TooltipContent side={tooltipSide}>{label}</TooltipContent>
		</Tooltip>
	);
}
