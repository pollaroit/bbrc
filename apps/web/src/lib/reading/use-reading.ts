"use client";

import type {
	ReadingBookState,
	ReadingItem,
} from "@bbrc/api/modules/reading/reading.schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc, queryClient } from "@/utils/orpc";

/*
 * Reading and wishlist state, shared by the book page, the book cards, the home
 * card, the profile and the finish dialog. Every action updates the screen first
 * and rolls back if the server refuses.
 *
 * Cache keys: `reading.mine` (my active readings), `reading.state({bookSlug})`
 * (what the book page buttons need), `reading.wishlist.get`.
 */

const mineKey = () => orpc.reading.mine.queryKey();
const stateKey = (bookSlug: string) =>
	orpc.reading.state.queryKey({ input: { bookSlug } });

type Mine = { items: ReadingItem[] };

/** Marks everything about reading, wishlist and reads as stale (after finishing a book, say). */
export function invalidateReadingQueries() {
	void queryClient.invalidateQueries({ queryKey: orpc.reading.key() });
}

export function useMyReadings(enabled = true) {
	return useQuery({
		...orpc.reading.mine.queryOptions(),
		enabled,
		staleTime: 30_000,
	});
}

export function useReadingState(bookSlug: string, enabled = true) {
	return useQuery({
		...orpc.reading.state.queryOptions({ input: { bookSlug } }),
		enabled,
		staleTime: 30_000,
	});
}

function patchEverywhere(
	id: string,
	patch: (item: ReadingItem) => ReadingItem,
): { rollback: () => void } {
	const previousMine = queryClient.getQueryData<Mine>(mineKey());
	const touched: {
		bookSlug: string;
		previous: ReadingBookState | undefined;
	}[] = [];

	if (previousMine) {
		queryClient.setQueryData<Mine>(mineKey(), {
			items: previousMine.items.map((item) =>
				item.id === id ? patch(item) : item,
			),
		});
		const item = previousMine.items.find((entry) => entry.id === id);
		if (item) {
			const key = stateKey(item.book.slug);
			const previous = queryClient.getQueryData<ReadingBookState>(key);
			if (previous?.reading?.id === id) {
				touched.push({ bookSlug: item.book.slug, previous });
				queryClient.setQueryData<ReadingBookState>(key, {
					...previous,
					reading: patch(previous.reading),
				});
			}
		}
	}

	return {
		rollback() {
			if (previousMine) queryClient.setQueryData(mineKey(), previousMine);
			for (const entry of touched) {
				queryClient.setQueryData(stateKey(entry.bookSlug), entry.previous);
			}
		},
	};
}

/** Moves the progress bar: by page or by percent. */
export function useUpdateReadingProgress() {
	return useMutation(
		orpc.reading.update.mutationOptions({
			onMutate: async (input) => {
				await queryClient.cancelQueries({ queryKey: mineKey() });
				return patchEverywhere(input.id, (item) => {
					let page = item.currentPage;
					let percent = item.percent;
					if (input.page != null && item.totalPages) {
						page = Math.min(input.page, item.totalPages);
						percent = Math.min(100, Math.round((page / item.totalPages) * 100));
					} else if (input.percent != null) {
						percent = input.percent;
						page = item.totalPages
							? Math.round((percent / 100) * item.totalPages)
							: null;
					}
					return { ...item, percent, currentPage: page };
				});
			},
			onError: (error, _input, context) => {
				context?.rollback();
				toast.error(error.message);
			},
			onSuccess: (saved) => {
				// The server's answer (it also carries the fresh pace).
				const previousMine = queryClient.getQueryData<Mine>(mineKey());
				if (previousMine) {
					queryClient.setQueryData<Mine>(mineKey(), {
						items: previousMine.items.map((item) =>
							item.id === saved.id ? saved : item,
						),
					});
				}
				const previousState = queryClient.getQueryData<ReadingBookState>(
					stateKey(saved.book.slug),
				);
				if (previousState?.reading?.id === saved.id) {
					queryClient.setQueryData<ReadingBookState>(
						stateKey(saved.book.slug),
						{ ...previousState, reading: saved },
					);
				}
			},
		}),
	);
}

/**
 * Starts reading a book. The state shows "reading" at once; the card appears
 * in `reading.mine` when the server answers.
 */
export function useStartReading(bookSlug: string) {
	return useMutation(
		orpc.reading.start.mutationOptions({
			onMutate: async () => {
				await queryClient.cancelQueries({ queryKey: stateKey(bookSlug) });
				const previous = queryClient.getQueryData<ReadingBookState>(
					stateKey(bookSlug),
				);
				return { previous };
			},
			onSuccess: (saved) => {
				const state = queryClient.getQueryData<ReadingBookState>(
					stateKey(bookSlug),
				);
				queryClient.setQueryData<ReadingBookState>(stateKey(bookSlug), {
					hasRead: false,
					inWishlist: state?.inWishlist ?? false,
					reading: saved,
					activeCount: (state?.activeCount ?? 0) + (state?.reading ? 0 : 1),
				});
				const mine = queryClient.getQueryData<Mine>(mineKey());
				if (mine) {
					queryClient.setQueryData<Mine>(mineKey(), {
						items: [
							saved,
							...mine.items.filter((item) => item.id !== saved.id),
						],
					});
				}
				void queryClient.invalidateQueries({ queryKey: mineKey() });
				void queryClient.invalidateQueries({
					queryKey: orpc.reading.readers.key(),
				});
				void queryClient.invalidateQueries({
					queryKey: orpc.reading.counts.key(),
				});
			},
			onError: (error, _input, context) => {
				if (context?.previous) {
					queryClient.setQueryData(stateKey(bookSlug), context.previous);
				}
				toast.error(error.message);
			},
		}),
	);
}

/** Changes the edition (and pages) of a reading in place. */
export function useSetReadingEdition() {
	return useMutation(
		orpc.reading.setEdition.mutationOptions({
			onError: (error) => toast.error(error.message),
			onSuccess: (saved) => {
				const mine = queryClient.getQueryData<Mine>(mineKey());
				if (mine) {
					queryClient.setQueryData<Mine>(mineKey(), {
						items: mine.items.map((item) =>
							item.id === saved.id ? saved : item,
						),
					});
				}
				const key = stateKey(saved.book.slug);
				const state = queryClient.getQueryData<ReadingBookState>(key);
				if (state?.reading?.id === saved.id) {
					queryClient.setQueryData<ReadingBookState>(key, {
						...state,
						reading: saved,
					});
				}
			},
		}),
	);
}

/** Drops a reading: it disappears at once and comes back if the server refuses. */
export function useAbandonReading() {
	return useMutation(
		orpc.reading.abandon.mutationOptions({
			onMutate: async ({ id }) => {
				await queryClient.cancelQueries({ queryKey: mineKey() });
				const mine = queryClient.getQueryData<Mine>(mineKey());
				const dropped = mine?.items.find((item) => item.id === id);
				const state = dropped
					? queryClient.getQueryData<ReadingBookState>(
							stateKey(dropped.book.slug),
						)
					: undefined;
				if (mine) {
					queryClient.setQueryData<Mine>(mineKey(), {
						items: mine.items.filter((item) => item.id !== id),
					});
				}
				if (dropped && state) {
					queryClient.setQueryData<ReadingBookState>(
						stateKey(dropped.book.slug),
						{
							...state,
							reading: null,
							activeCount: Math.max(0, state.activeCount - 1),
						},
					);
				}
				return { mine, dropped, state };
			},
			onError: (error, _input, context) => {
				if (context?.mine) queryClient.setQueryData(mineKey(), context.mine);
				if (context?.dropped && context.state) {
					queryClient.setQueryData(
						stateKey(context.dropped.book.slug),
						context.state,
					);
				}
				toast.error(error.message);
			},
			onSettled: () => {
				void queryClient.invalidateQueries({ queryKey: mineKey() });
				void queryClient.invalidateQueries({
					queryKey: orpc.reading.readers.key(),
				});
				void queryClient.invalidateQueries({
					queryKey: orpc.reading.counts.key(),
				});
			},
		}),
	);
}

/** Adds or removes a book from the wishlist, optimistically. */
export function useWishlistToggle(bookSlug: string) {
	const add = useMutation(
		orpc.reading.wishlist.add.mutationOptions({
			onMutate: async () => setWishlistFlag(bookSlug, true),
			onError: (error, _input, context) => {
				context?.rollback();
				toast.error(error.message);
			},
			onSettled: () => settleWishlist(),
		}),
	);
	const remove = useMutation(
		orpc.reading.wishlist.remove.mutationOptions({
			onMutate: async () => setWishlistFlag(bookSlug, false),
			onError: (error, _input, context) => {
				context?.rollback();
				toast.error(error.message);
			},
			onSettled: () => settleWishlist(),
		}),
	);
	return {
		add: () => add.mutate({ bookSlug }),
		remove: () => remove.mutate({ bookSlug }),
		isPending: add.isPending || remove.isPending,
	};
}

async function setWishlistFlag(bookSlug: string, inWishlist: boolean) {
	await queryClient.cancelQueries({ queryKey: stateKey(bookSlug) });
	const previous = queryClient.getQueryData<ReadingBookState>(
		stateKey(bookSlug),
	);
	if (previous) {
		queryClient.setQueryData<ReadingBookState>(stateKey(bookSlug), {
			...previous,
			inWishlist,
		});
	}
	return {
		rollback: () => {
			if (previous) queryClient.setQueryData(stateKey(bookSlug), previous);
		},
	};
}

function settleWishlist() {
	void queryClient.invalidateQueries({
		queryKey: orpc.reading.wishlist.get.key(),
	});
	void queryClient.invalidateQueries({ queryKey: orpc.reading.counts.key() });
}
