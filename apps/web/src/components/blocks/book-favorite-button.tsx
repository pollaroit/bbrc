"use client";

import type { ListBookFavoritesOutput } from "@bbrc/api/modules/favorite/favorite.schema";
import { Button } from "@bbrc/ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@bbrc/ui/components/tooltip";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { FavoriteReplaceSheet } from "@/components/blocks/favorite-replace-sheet";
import { authClient } from "@/lib/auth-client";
import { useSyncedBoolean } from "@/lib/optimistic/use-synced-boolean";
import { cn } from "@/lib/utils";
import { client, orpc, queryClient } from "@/utils/orpc";

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

/** Refresh every view of favorites in the background; never blocks the heart. */
function refreshFavoriteQueries() {
	void Promise.all([
		queryClient.invalidateQueries({
			queryKey: orpc.favorite.getBookFavoriteState.key(),
		}),
		queryClient.invalidateQueries({
			queryKey: orpc.favorite.getViewerLibraryEngagement.key(),
		}),
		queryClient.invalidateQueries({ queryKey: orpc.favorite.listMine.key() }),
		queryClient.invalidateQueries({
			queryKey: orpc.favorite.getUserFavorites.key(),
		}),
		queryClient.invalidateQueries({
			queryKey: orpc.favorite.listForBook.key(),
		}),
		queryClient.invalidateQueries({ queryKey: orpc.book.getBookList.key() }),
	]);
}

type FavoriteState = {
	isFavorite: boolean;
	canFavorite: boolean;
	slotsUsed: number;
	maxSlots: number;
	hint: string | null;
};

export function BookFavoriteButton({
	bookSlug,
	bookTitle,
	variant = "inline",
	className,
	tooltipSide = "top",
	listEngagement,
}: BookFavoriteButtonProps) {
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const useListMode = listEngagement !== undefined;

	const stateQuery = useQuery({
		...orpc.favorite.getBookFavoriteState.queryOptions({
			input: bookSlug,
		}),
		enabled: Boolean(session?.user) && !useListMode,
	});

	if (sessionPending || !session?.user) {
		return null;
	}

	let state: FavoriteState | null = null;
	if (useListMode) {
		state = listEngagement ? { ...listEngagement, hint: null } : null;
	} else if (stateQuery.data) {
		state = {
			isFavorite: stateQuery.data.isFavorite,
			canFavorite: stateQuery.data.canFavorite,
			slotsUsed: stateQuery.data.slotsUsed,
			maxSlots: stateQuery.data.maxSlots,
			hint: stateQuery.data.hint,
		};
	}

	// Only the very first load hides the heart; refetches never do.
	if (!state) {
		return null;
	}

	if (!state.isFavorite && !state.canFavorite) {
		return null;
	}

	return (
		<FavoriteHeart
			bookSlug={bookSlug}
			bookTitle={bookTitle}
			variant={variant}
			className={className}
			tooltipSide={tooltipSide}
			state={state}
		/>
	);
}

function FavoriteHeart({
	bookSlug,
	bookTitle,
	variant,
	className,
	tooltipSide,
	state,
}: {
	bookSlug: string;
	bookTitle: string;
	variant: "overlay" | "inline";
	className?: string;
	tooltipSide: "top" | "right" | "bottom" | "left";
	state: FavoriteState;
}) {
	const t = useTranslations("books");
	const { data: session } = authClient.useSession();
	const [replaceOpen, setReplaceOpen] = useState(false);
	const replaceIdRef = useRef<string | undefined>(undefined);
	/** Which state the caches currently show, so each flip is applied once. */
	const shownRef = useRef(state.isFavorite);

	const mineQuery = useQuery({
		...orpc.favorite.listMine.queryOptions(),
		enabled: replaceOpen,
	});

	const sync = useSyncedBoolean({
		serverValue: state.isFavorite,
		send: async (desired) => {
			if (!desired) {
				await client.favorite.remove({ bookSlug });
				return { favorite: false };
			}
			const replaceFavoriteId = replaceIdRef.current;
			replaceIdRef.current = undefined;
			await client.favorite.add({
				bookSlug,
				...(replaceFavoriteId ? { replaceFavoriteId } : {}),
			});
			return { favorite: true };
		},
		confirmedFrom: (result) => result.favorite,
		onConfirmed: () => {
			refreshFavoriteQueries();
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : t("actions.favoriteFailed"),
			);
			refreshFavoriteQueries();
		},
	});

	/** Moves the heart, the Favorites tab count and the favoriters list at once. */
	function showFavorite(next: boolean) {
		sync.set(next);
		if (next === shownRef.current) {
			return;
		}
		shownRef.current = next;
		const delta = next ? 1 : -1;
		const user = session?.user;

		queryClient.setQueryData(
			orpc.favorite.getBookFavoriteState.queryKey({ input: bookSlug }),
			(old) =>
				old
					? {
							...old,
							isFavorite: next,
							canFavorite: next ? false : old.canFavorite,
							slotsUsed: Math.max(0, old.slotsUsed + delta),
						}
					: old,
		);
		queryClient.setQueryData(
			orpc.favorite.getViewerLibraryEngagement.queryKey(),
			(old) =>
				old
					? {
							...old,
							favoriteSlugs: next
								? [
										...old.favoriteSlugs.filter((slug) => slug !== bookSlug),
										bookSlug,
									]
								: old.favoriteSlugs.filter((slug) => slug !== bookSlug),
							slotsUsed: Math.max(0, old.slotsUsed + delta),
						}
					: old,
		);
		queryClient.setQueriesData(
			{ queryKey: orpc.favorite.listForBook.key({ input: { bookSlug } }) },
			(old: ListBookFavoritesOutput | undefined) => {
				if (!old) {
					return old;
				}
				const others = user
					? old.items.filter((item) => item.user.username !== user.username)
					: old.items;
				return {
					...old,
					total: Math.max(0, old.total + delta),
					items:
						next && user
							? [
									{
										favoritedAt: new Date(),
										slotsUsed: state.slotsUsed + 1,
										maxSlots: state.maxSlots,
										user: {
											username: user.username as string,
											name: user.name,
											image: user.image ?? null,
										},
									},
									...others,
								]
							: others,
				};
			},
		);
	}

	const isFavorite = sync.value;
	const hint = state.hint;

	const handleToggle = () => {
		if (isFavorite) {
			showFavorite(false);
			return;
		}

		if (!state.canFavorite) {
			return;
		}

		if (state.slotsUsed >= state.maxSlots) {
			setReplaceOpen(true);
			return;
		}

		showFavorite(true);
	};

	const label = isFavorite
		? t("actions.removeFavorite")
		: t("actions.addFavorite");

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
			disabled={!isFavorite && !state.canFavorite}
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
					isFavorite && "fill-current text-destructive",
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
				loading={false}
				onConfirm={(replaceFavoriteId) => {
					replaceIdRef.current = replaceFavoriteId;
					setReplaceOpen(false);
					showFavorite(true);
				}}
			/>
		</>
	);
}
