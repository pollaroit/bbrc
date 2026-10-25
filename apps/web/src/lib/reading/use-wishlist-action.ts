"use client";

import type { GetViewerLibraryEngagementOutput } from "@bbrc/api/modules/favorite/favorite.schema";
import type { ReadingBookState } from "@bbrc/api/modules/reading/reading.schema";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc, queryClient } from "@/utils/orpc";

/*
 * Wishlist toggle used by the book page menu and the book cards. It flips the
 * book on every place that shows it: the per-book reading state and the
 * library engagement list (`wishlistSlugs`), then settles with the server.
 */

type Engagement = GetViewerLibraryEngagementOutput;

const stateKey = (bookSlug: string) =>
	orpc.reading.state.queryKey({ input: { bookSlug } });
const engagementKey = () => orpc.favorite.getViewerLibraryEngagement.queryKey();

function flip(bookSlug: string, inWishlist: boolean) {
	const state = queryClient.getQueryData<ReadingBookState>(stateKey(bookSlug));
	const engagement = queryClient.getQueryData<Engagement>(engagementKey());
	if (state) {
		queryClient.setQueryData<ReadingBookState>(stateKey(bookSlug), {
			...state,
			inWishlist,
		});
	}
	if (engagement) {
		const others = engagement.wishlistSlugs.filter((slug) => slug !== bookSlug);
		queryClient.setQueryData<Engagement>(engagementKey(), {
			...engagement,
			wishlistSlugs: inWishlist ? [...others, bookSlug] : others,
		});
	}
	return () => {
		if (state) queryClient.setQueryData(stateKey(bookSlug), state);
		if (engagement) queryClient.setQueryData(engagementKey(), engagement);
	};
}

export function useWishlistAction(bookSlug: string) {
	const settle = () => {
		void queryClient.invalidateQueries({
			queryKey: orpc.reading.wishlist.get.key(),
		});
		void queryClient.invalidateQueries({ queryKey: orpc.reading.counts.key() });
		void queryClient.invalidateQueries({ queryKey: engagementKey() });
		void queryClient.invalidateQueries({ queryKey: stateKey(bookSlug) });
	};

	const add = useMutation(
		orpc.reading.wishlist.add.mutationOptions({
			onMutate: async () => {
				await queryClient.cancelQueries({ queryKey: stateKey(bookSlug) });
				return { rollback: flip(bookSlug, true) };
			},
			onSuccess: () => toast.success("Added to your wishlist"),
			onError: (error, _input, context) => {
				context?.rollback();
				toast.error(error.message);
			},
			onSettled: settle,
		}),
	);
	const remove = useMutation(
		orpc.reading.wishlist.remove.mutationOptions({
			onMutate: async () => {
				await queryClient.cancelQueries({ queryKey: stateKey(bookSlug) });
				return { rollback: flip(bookSlug, false) };
			},
			onError: (error, _input, context) => {
				context?.rollback();
				toast.error(error.message);
			},
			onSettled: settle,
		}),
	);

	return {
		add: () => add.mutate({ bookSlug }),
		remove: () => remove.mutate({ bookSlug }),
		isPending: add.isPending || remove.isPending,
	};
}
