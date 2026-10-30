"use client";

import type { FriendState } from "@bbrc/api/modules/friend/friend.schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc, queryClient } from "@/utils/orpc";

/*
 * Friends, requests and blocks. Every action updates the friend button at once
 * and rolls back if the server refuses; the lists and the badge refresh after.
 */

type StateData = {
	state: FriendState;
	friendCount: number;
	autoAccepts: boolean;
};

const stateKey = (username: string) =>
	orpc.friend.state.queryKey({ input: { username } });

export function useFriendState(username: string, enabled = true) {
	return useQuery({
		...orpc.friend.state.queryOptions({ input: { username } }),
		enabled,
		staleTime: 30_000,
	});
}

/** The badge on the user menu: requests waiting for an answer. */
export function useFriendBadge(enabled: boolean) {
	return useQuery({
		...orpc.friend.badge.queryOptions(),
		enabled,
		staleTime: 60_000,
		refetchInterval: 5 * 60_000,
	});
}

function refreshFriendLists() {
	void queryClient.invalidateQueries({ queryKey: orpc.friend.requests.key() });
	void queryClient.invalidateQueries({ queryKey: orpc.friend.list.key() });
	void queryClient.invalidateQueries({ queryKey: orpc.friend.blocked.key() });
	void queryClient.invalidateQueries({ queryKey: orpc.friend.badge.key() });
}

function optimistic(username: string, next: FriendState, countDelta = 0) {
	const key = stateKey(username);
	const previous = queryClient.getQueryData<StateData>(key);
	if (previous) {
		queryClient.setQueryData<StateData>(key, {
			...previous,
			state: next,
			friendCount: Math.max(0, previous.friendCount + countDelta),
		});
	}
	return { previous, key };
}

type Context = { previous: StateData | undefined; key: readonly unknown[] };

function rollback(context: Context | undefined) {
	if (context?.previous)
		queryClient.setQueryData(context.key, context.previous);
}

/** Every action on one member, for the friend button and the lists. */
export function useFriendActions(username: string) {
	const settle = () => {
		void queryClient.invalidateQueries({ queryKey: stateKey(username) });
		refreshFriendLists();
	};
	const failed = (error: Error, _v: unknown, context: Context | undefined) => {
		rollback(context);
		toast.error(error.message);
	};

	const send = useMutation(
		orpc.friend.send.mutationOptions({
			onMutate: () => optimistic(username, "request_sent"),
			onSuccess: (result) => {
				const key = stateKey(username);
				const current = queryClient.getQueryData<StateData>(key);
				if (current && result.state === "friends") {
					queryClient.setQueryData<StateData>(key, {
						...current,
						state: "friends",
						friendCount: current.friendCount + 1,
					});
					toast.success("You are now friends.");
				} else {
					toast.success("Friend request sent.");
				}
			},
			onError: failed,
			onSettled: settle,
		}),
	);
	const cancel = useMutation(
		orpc.friend.cancel.mutationOptions({
			onMutate: () => optimistic(username, "none"),
			onError: failed,
			onSettled: settle,
		}),
	);
	const accept = useMutation(
		orpc.friend.accept.mutationOptions({
			onMutate: () => optimistic(username, "friends", 1),
			onSuccess: () => toast.success("You are now friends."),
			onError: failed,
			onSettled: settle,
		}),
	);
	const decline = useMutation(
		orpc.friend.decline.mutationOptions({
			onMutate: () => optimistic(username, "none"),
			onError: failed,
			onSettled: settle,
		}),
	);
	const remove = useMutation(
		orpc.friend.remove.mutationOptions({
			onMutate: () => optimistic(username, "none", -1),
			onSuccess: () => toast.success("Removed from your friends."),
			onError: failed,
			onSettled: settle,
		}),
	);
	const block = useMutation(
		orpc.friend.block.mutationOptions({
			onMutate: () => optimistic(username, "blocked"),
			onSuccess: () => toast.success("Blocked."),
			onError: failed,
			onSettled: settle,
		}),
	);
	const unblock = useMutation(
		orpc.friend.unblock.mutationOptions({
			onMutate: () => optimistic(username, "none"),
			onSuccess: () => toast.success("Unblocked."),
			onError: failed,
			onSettled: settle,
		}),
	);
	const input = { username };
	return {
		send: () => send.mutate(input),
		cancel: () => cancel.mutate(input),
		accept: () => accept.mutate(input),
		decline: () => decline.mutate(input),
		remove: () => remove.mutate(input),
		block: () => block.mutate(input),
		unblock: () => unblock.mutate(input),
		pending:
			send.isPending ||
			cancel.isPending ||
			accept.isPending ||
			decline.isPending ||
			remove.isPending ||
			block.isPending ||
			unblock.isPending,
	};
}
