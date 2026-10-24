"use client";

import type {
	PollOption,
	PostPollView,
} from "@bbrc/api/modules/post-poll/post-poll.schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { isPendingSlug } from "@/lib/optimistic/infinite-lists";
import { isPendingOption } from "@/lib/poll/format";
import {
	withAddedOption,
	withBallot,
	withClosed,
	withoutBallot,
	withoutOption,
} from "@/lib/poll/optimistic";
import { orpc, queryClient } from "@/utils/orpc";

type FeedPage = {
	items: { slug: string; poll: PostPollView | null }[];
};
type FeedData = { pages: FeedPage[]; pageParams: unknown[] };

function isFeedData(value: unknown): value is FeedData {
	return (
		typeof value === "object" &&
		value !== null &&
		Array.isArray((value as FeedData).pages)
	);
}

/** Keep every cached copy of a post's poll (feeds, detail, poll query) in step. */
export function syncPoll(postSlug: string, view: PostPollView) {
	queryClient.setQueryData(
		orpc.postPoll.get.queryKey({ input: { postSlug } }),
		view,
	);

	for (const [key, data] of queryClient.getQueriesData<unknown>({
		queryKey: orpc.post.getPostList.key(),
	})) {
		if (!isFeedData(data)) continue;
		queryClient.setQueryData<FeedData>(key, {
			...data,
			pages: data.pages.map((page) => ({
				...page,
				items: page.items.map((item) =>
					item.slug === postSlug ? { ...item, poll: view } : item,
				),
			})),
		});
	}

	const detailKey = orpc.post.getPostBySlug.queryKey({ input: postSlug });
	const detail = queryClient.getQueryData(detailKey);
	if (detail) {
		queryClient.setQueryData(detailKey, { ...detail, poll: view });
	}
}

/** The live poll of a post. The feed passes the copy it already loaded as a head start. */
export function useLivePoll(postSlug: string, initial?: PostPollView | null) {
	const pendingPost = isPendingSlug(postSlug);
	// A poll made on this device before the server confirmed it has placeholder
	// option ids, so it is only a head start for the post that is still pending.
	const usable =
		initial != null &&
		(pendingPost ||
			!initial.options.some((option) => isPendingOption(option.id)));

	return useQuery({
		...orpc.postPoll.get.queryOptions({ input: { postSlug } }),
		enabled: !pendingPost,
		...(usable ? { initialData: initial, staleTime: 30_000 } : {}),
	});
}

/**
 * Every poll action, applied to the screen first and confirmed (or rolled
 * back) when the server answers.
 */
export function usePollActions(postSlug: string) {
	const { data: session } = authClient.useSession();
	const key = orpc.postPoll.get.queryKey({ input: { postSlug } });
	const scope = { id: `poll-${postSlug}` };

	const me = session?.user
		? {
				username: session.user.username as string,
				name: session.user.name,
				image: session.user.image ?? null,
			}
		: null;

	function optimistic<TVars>(
		change: (poll: PostPollView, vars: TVars) => PostPollView,
	) {
		return {
			scope,
			onMutate: async (variables: TVars) => {
				await queryClient.cancelQueries({ queryKey: key });
				const previous = queryClient.getQueryData<PostPollView>(key);
				if (previous) {
					syncPoll(postSlug, change(previous, variables));
				}
				return { previous };
			},
			onError: (
				error: Error,
				_variables: TVars,
				context: { previous: PostPollView | undefined } | undefined,
			) => {
				if (context?.previous) {
					syncPoll(postSlug, context.previous);
				}
				toast.error(error.message);
			},
			onSuccess: (view: PostPollView) => syncPoll(postSlug, view),
		};
	}

	const vote = useMutation(
		orpc.postPoll.vote.mutationOptions(
			optimistic<{ postSlug: string; optionIds: string[] }>((poll, vars) =>
				withBallot(poll, vars.optionIds),
			),
		),
	);

	const retract = useMutation(
		orpc.postPoll.retract.mutationOptions(
			optimistic<{ postSlug: string }>((poll) => withoutBallot(poll)),
		),
	);

	// What the new option looks like, read when the mutation starts.
	const previewRef = useRef<Pick<
		PollOption,
		"kind" | "label" | "target"
	> | null>(null);
	const addOptionMutation = useMutation(
		orpc.postPoll.addOption.mutationOptions(
			optimistic<{ postSlug: string }>((poll) =>
				previewRef.current
					? withAddedOption(poll, previewRef.current, me)
					: poll,
			),
		),
	);
	const addOption = {
		...addOptionMutation,
		/** Shows `preview` at once while the server checks and stores the option. */
		add: (
			option: { text?: string; key?: string; label?: string },
			preview: Pick<PollOption, "kind" | "label" | "target">,
			callbacks?: { onSuccess?: () => void },
		) => {
			previewRef.current = preview;
			addOptionMutation.mutate(
				{ postSlug, option },
				{ onSuccess: callbacks?.onSuccess },
			);
		},
	};

	const removeOption = useMutation(
		orpc.postPoll.removeOption.mutationOptions(
			optimistic<{ postSlug: string; optionId: string }>((poll, vars) =>
				withoutOption(poll, vars.optionId),
			),
		),
	);

	const close = useMutation(
		orpc.postPoll.close.mutationOptions(
			optimistic<{ postSlug: string }>((poll) => withClosed(poll)),
		),
	);

	const updateSettings = useMutation(
		orpc.postPoll.updateSettings.mutationOptions(
			optimistic<{ postSlug: string; deadline?: unknown }>((poll, vars) => ({
				...poll,
				...(vars.deadline instanceof Date || vars.deadline === null
					? { deadline: vars.deadline }
					: {}),
			})),
		),
	);

	return { vote, retract, addOption, removeOption, close, updateSettings, me };
}
