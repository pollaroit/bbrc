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
import { FavoriteReplaceDialog } from "@/components/blocks/favorite-replace-dialog";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

type BookFavoriteButtonProps = {
	bookSlug: string;
	bookTitle: string;
	/** Overlay on book cards; inline on detail header. */
	variant?: "overlay" | "inline";
	className?: string;
};

function invalidateFavoriteQueries(bookSlug: string) {
	return Promise.all([
		queryClient.invalidateQueries({
			queryKey: orpc.favorite.getBookFavoriteState.key(),
		}),
		queryClient.invalidateQueries({
			queryKey: orpc.favorite.listMine.key(),
		}),
		queryClient.invalidateQueries({
			queryKey: orpc.favorite.getUserFavorites.key(),
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
}: BookFavoriteButtonProps) {
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const [replaceOpen, setReplaceOpen] = useState(false);

	const stateQuery = useQuery({
		...orpc.favorite.getBookFavoriteState.queryOptions({
			input: bookSlug,
		}),
		enabled: Boolean(session?.user),
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
				await invalidateFavoriteQueries(bookSlug);
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const removeMutation = useMutation(
		orpc.favorite.remove.mutationOptions({
			onSuccess: async () => {
				toast.success("Removed from favorites.");
				await invalidateFavoriteQueries(bookSlug);
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	if (sessionPending || !session?.user) {
		return null;
	}

	const state = stateQuery.data;
	const loading =
		stateQuery.isPending || addMutation.isPending || removeMutation.isPending;

	const showHeart = state && (state.isFavorite || state.canFavorite);

	if (!showHeart && !stateQuery.isPending) {
		return null;
	}

	const isFavorite = state?.isFavorite ?? false;
	const hint = state?.hint;

	const handleToggle = () => {
		if (!state || loading) {
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
			size={variant === "overlay" ? "icon-sm" : "icon"}
			className={cn(
				variant === "overlay" && "bg-background/90 shadow-sm backdrop-blur-sm",
				className,
			)}
			disabled={loading || (!isFavorite && !state?.canFavorite)}
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
					"size-4 transition-transform active:scale-95",
					isFavorite && "fill-current text-rose-600 dark:text-rose-400",
				)}
			/>
		</Button>
	);

	return (
		<>
			{hint && !isFavorite && !state?.canFavorite ? (
				<Tooltip>
					<TooltipTrigger render={button} />
					<TooltipContent side="top" className="max-w-xs">
						{hint}
					</TooltipContent>
				</Tooltip>
			) : (
				button
			)}

			<FavoriteReplaceDialog
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
