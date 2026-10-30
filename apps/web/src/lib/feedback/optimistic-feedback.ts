import type { QueryKey } from "@tanstack/react-query";
import { orpc, queryClient } from "@/utils/orpc";

type Values = {
	rating: number;
	review: string;
	isSpoiler: boolean;
	visibility?: "public" | "friends" | "private";
};

type Author = {
	id: string;
	username: string;
	name: string;
	image: string | null;
};

/** Every cache that shows a review, so one snapshot can undo a failed change. */
function feedbackQueryKeys(): QueryKey[] {
	return [
		orpc.feedback.getBookFeedbackList.key(),
		orpc.feedback.getBookFeedbackState.key(),
		orpc.feedback.getFeedbackBySlug.key(),
		orpc.feedback.getUserFeedbackList.key(),
		orpc.favorite.getViewerLibraryEngagement.key(),
	];
}

export type FeedbackSnapshot = [QueryKey, unknown][];

/** Stops in-flight refetches from overwriting the change, and remembers the caches. */
export async function snapshotFeedbackQueries(): Promise<FeedbackSnapshot> {
	const keys = feedbackQueryKeys();
	await Promise.all(
		keys.map((queryKey) => queryClient.cancelQueries({ queryKey })),
	);
	return keys.flatMap((queryKey) => queryClient.getQueriesData({ queryKey }));
}

export function restoreFeedbackQueries(snapshot: FeedbackSnapshot | undefined) {
	for (const [key, data] of snapshot ?? []) {
		queryClient.setQueryData(key, data);
	}
}

type MappedList<T> = (items: T[]) => T[];

function mapBookLists(
	bookSlug: string,
	change: MappedList<{ slug: string; [key: string]: unknown }>,
) {
	queryClient.setQueriesData(
		{
			queryKey: orpc.feedback.getBookFeedbackList.key({ input: { bookSlug } }),
		},
		(old: unknown) =>
			Array.isArray(old)
				? change(old as { slug: string; [key: string]: unknown }[])
				: old,
	);
}

function patchLibraryEngagement(bookSlug: string, rating: number) {
	queryClient.setQueryData(
		orpc.favorite.getViewerLibraryEngagement.queryKey(),
		(old) =>
			old
				? {
						...old,
						feedbackBookSlugs: old.feedbackBookSlugs.includes(bookSlug)
							? old.feedbackBookSlugs
							: [...old.feedbackBookSlugs, bookSlug],
						feedbackRatings: [
							...old.feedbackRatings.filter((r) => r.bookSlug !== bookSlug),
							{ bookSlug, rating },
						],
					}
				: old,
	);
}

export function applyFeedbackCreate(args: {
	bookSlug: string;
	pendingSlug: string;
	author: Author;
	values: Values;
}) {
	const { bookSlug, pendingSlug, author, values } = args;

	mapBookLists(bookSlug, (list) => [
		{
			slug: pendingSlug,
			authorId: author.id,
			username: author.username,
			name: author.name,
			image: author.image,
			rating: values.rating,
			review: values.review,
			isSpoiler: values.isSpoiler,
			visibility: values.visibility ?? "public",
			createdAt: new Date(),
			likeCount: 0,
			likedByMe: false,
			commentCount: 0,
		},
		...list,
	]);

	queryClient.setQueryData(
		orpc.feedback.getBookFeedbackState.queryKey({ input: bookSlug }),
		(old) =>
			old
				? {
						...old,
						canSubmit: false,
						myFeedback: {
							slug: pendingSlug,
							rating: values.rating,
							review: values.review,
							isSpoiler: values.isSpoiler,
							visibility: values.visibility ?? "public",
							createdAt: new Date(),
						},
					}
				: old,
	);
	patchLibraryEngagement(bookSlug, values.rating);
}

export function confirmFeedbackCreate(
	bookSlug: string,
	pendingSlug: string,
	realSlug: string,
) {
	mapBookLists(bookSlug, (list) =>
		list.map((entry) =>
			entry.slug === pendingSlug ? { ...entry, slug: realSlug } : entry,
		),
	);
	queryClient.setQueryData(
		orpc.feedback.getBookFeedbackState.queryKey({ input: bookSlug }),
		(old) =>
			old?.myFeedback
				? { ...old, myFeedback: { ...old.myFeedback, slug: realSlug } }
				: old,
	);
}

export function removePendingFeedback(bookSlug: string, pendingSlug: string) {
	mapBookLists(bookSlug, (list) =>
		list.filter((entry) => entry.slug !== pendingSlug),
	);
}

/** The slug of the viewer's own review of this book, if the state is cached. */
export function myFeedbackSlug(bookSlug: string): string | undefined {
	return queryClient.getQueryData(
		orpc.feedback.getBookFeedbackState.queryKey({ input: bookSlug }),
	)?.myFeedback?.slug;
}

/** Edits a review in every list, detail view, profile list and library card. */
export function applyFeedbackUpdate(args: {
	bookSlug: string;
	feedbackSlug: string;
	values: Values;
}) {
	const { bookSlug, feedbackSlug, values } = args;

	mapBookLists(bookSlug, (list) =>
		list.map((entry) =>
			entry.slug === feedbackSlug ? { ...entry, ...values } : entry,
		),
	);

	queryClient.setQueryData(
		orpc.feedback.getFeedbackBySlug.queryKey({ input: feedbackSlug }),
		(old) => (old ? { ...old, ...values } : old),
	);

	queryClient.setQueriesData(
		{ queryKey: orpc.feedback.getUserFeedbackList.key() },
		(old: unknown) => {
			const data = old as
				| { pages: { items: { slug: string }[] }[]; pageParams: unknown[] }
				| undefined;
			if (!data || !Array.isArray(data.pages)) {
				return old;
			}
			return {
				...data,
				pages: data.pages.map((page) => ({
					...page,
					items: page.items.map((item) =>
						item.slug === feedbackSlug ? { ...item, ...values } : item,
					),
				})),
			};
		},
	);

	queryClient.setQueryData(
		orpc.feedback.getBookFeedbackState.queryKey({ input: bookSlug }),
		(old) =>
			old?.myFeedback
				? { ...old, myFeedback: { ...old.myFeedback, ...values } }
				: old,
	);
	patchLibraryEngagement(bookSlug, values.rating);
}
