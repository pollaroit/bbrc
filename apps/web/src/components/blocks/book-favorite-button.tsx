"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@bbrc/ui/components/tooltip";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FavoriteReplaceSheet } from "@/components/blocks/favorite-replace-sheet";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

export type BookListFavoriteEngagement = {
	isFavorite: boolean;
	canFavorite: boolean;
	slotsUsed: number;
	maxSlots: number;
};

type BookFavoriteButtonProps = {
	bookSlug: string;
	bookTitle: string;
	/** Overlay on book cards; inline on detail header. */
	variant?: "overlay" | "inline";
	className?: string;
	tooltipSide?: "top" | "right" | "bottom" | "left";
	/**
	 * Library grid: pass engagement from `getViewerLibraryEngagement`.
	 * `null` while loading (render nothing). Omit on book detail (per-book fetch).
	 */
	listEngagement?: BookListFavoriteEngagement | null;
};

function invalidateFavoriteQueries() {
	return Promise.all([
		queryClient.invalidateQueries({
			queryKey: orpc.favorite.getBookFavoriteState.key(),
		}),
		queryClient.invalidateQueries({
			queryKey: orpc.favorite.getViewerLibraryEngagement.key(),
		}),
		queryClient.invalidateQueries({
			queryKey: orpc.favorite.listMine.key(),
		}),
		queryClient.invalidateQueries({
			queryKey: orpc.favorite.getUserFavorites.key(),
		}),
		queryClient.invalidateQueries({
			queryKey: orpc.favorite.listForBook.key(),
		}),
	]).then(() =>
		queryClient.invalidateQueries({
			queryKey: orpc.book.getBookList.key(),
		}),
	);
}

export function BookFavoriteButton({
	bookSlug,
	bookTitle,
	variant = "inline",
	className,
	tooltipSide = "top",
	listEngagement,
}: BookFavoriteButtonProps) {
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const [replaceOpen, setReplaceOpen] = useState(false);

	const useListMode = listEngagement !== undefined;

	const stateQuery = useQuery({
		...orpc.favorite.getBookFavoriteState.queryOptions({
			input: bookSlug,
		}),
		enabled: Boolean(session?.user) && !useListMode,
	});

	const mineQuery = useQuery({
		...orpc.favorite.listMine.queryOptions(),
		enabled: Boolean(session?.user) && replaceOpen,
	});

	const addMutation = useMutation(
		orpc.favorite.add.mutationOptions({
			onSuccess: async () => {
				setReplaceOpen(false);
				toast.success("Added to favorites.");
				await invalidateFavoriteQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const removeMutation = useMutation(
		orpc.favorite.remove.mutationOptions({
			onSuccess: async () => {
				toast.success("Removed from favorites.");
				await invalidateFavoriteQueries();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	if (sessionPending || !session?.user) {
		return null;
	}

	if (useListMode) {
		if (listEngagement === null) {
			return null;
		}
	}

	const state = useListMode
		? listEngagement
			? {
					isFavorite: listEngagement.isFavorite,
					canFavorite: listEngagement.canFavorite,
					slotsUsed: listEngagement.slotsUsed,
					maxSlots: listEngagement.maxSlots,
					hint: null as string | null,
				}
			: null
		: stateQuery.data
			? {
					isFavorite: stateQuery.data.isFavorite,
					canFavorite: stateQuery.data.canFavorite,
					slotsUsed: stateQuery.data.slotsUsed,
					maxSlots: stateQuery.data.maxSlots,
					hint: stateQuery.data.hint,
				}
			: null;

	if (!useListMode && (stateQuery.isPending || stateQuery.isFetching)) {
		return null;
	}

	if (!state) {
		return null;
	}

	const loading =
		(!useListMode && stateQuery.isFetching) ||
		addMutation.isPending ||
		removeMutation.isPending;

	const showHeart = state.isFavorite || state.canFavorite;

	if (!showHeart) {
		return null;
	}

	const isFavorite = state.isFavorite;
	const hint = state.hint;

	const handleToggle = () => {
		if (loading) {
			return;
		}

		if (isFavorite) {
			removeMutation.mutate({ bookSlug });
			return;
		}

		if (!state.canFavorite) {
			return;
		}

		if (state.slotsUsed >= state.maxSlots) {
			setReplaceOpen(true);
			return;
		}

		addMutation.mutate({ bookSlug });
	};

	const label = isFavorite ? "Remove from favorites" : "Add to favorites";

	const button = (
		<Button
			type="button"
			variant={variant === "overlay" ? "secondary" : "ghost"}
			size="icon"
			className={cn(
				variant === "overlay" &&
					"size-8 bg-background/95 shadow-sm backdrop-blur-sm",
				className,
			)}
			disabled={loading || (!isFavorite && !state.canFavorite)}
			onClick={(event) => {
				event.preventDefault();
				event.stopPropagation();
				handleToggle();
			}}
			aria-pressed={isFavorite}
			aria-label={label}
		>
			<Heart
				className={cn(
					"size-[1.125rem] transition-transform active:scale-95",
					isFavorite && "fill-current text-rose-600 dark:text-rose-400",
				)}
			/>
		</Button>
	);

	return (
		<>
			{hint && !isFavorite && !state.canFavorite ? (
				<Tooltip>
					<TooltipTrigger render={button} />
					<TooltipContent side={tooltipSide} className="max-w-xs">
						{hint}
					</TooltipContent>
				</Tooltip>
			) : (
				button
			)}

			<FavoriteReplaceSheet
				open={replaceOpen}
				onOpenChange={setReplaceOpen}
				favorites={mineQuery.data ?? []}
				incomingTitle={bookTitle}
				loading={addMutation.isPending}
				onConfirm={(replaceFavoriteId) => {
					addMutation.mutate({ bookSlug, replaceFavoriteId });
				}}
			/>
		</>
	);
}
