"use client";

import type { SittingJoinState } from "@bbrc/api/modules/sitting/sitting-join.schema";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc, queryClient } from "@/utils/orpc";

type ListData = {
	pages: {
		items: {
			slug: string;
			viewerProgress: string | null;
			participantCount: number;
		}[];
	}[];
	pageParams: unknown[];
};

function isListData(value: unknown): value is ListData {
	return (
		typeof value === "object" &&
		value !== null &&
		Array.isArray((value as ListData).pages)
	);
}

/** Show someone as in (or out of) a sitting in every cached list, so cards update at once. */
function patchSittingInLists(slug: string, joined: boolean) {
	const key = orpc.sitting.getSittingList.key();
	const snapshots = queryClient.getQueriesData<unknown>({ queryKey: key });
	for (const [queryKey, data] of snapshots) {
		if (!isListData(data)) continue;
		queryClient.setQueryData<ListData>(queryKey, {
			...data,
			pages: data.pages.map((page) => ({
				...page,
				items: page.items.map((item) =>
					item.slug === slug
						? {
								...item,
								viewerProgress: joined ? "not_started" : null,
								participantCount: Math.max(
									0,
									item.participantCount + (joined ? 1 : -1),
								),
							}
						: item,
				),
			})),
		});
	}
	return snapshots;
}

function restore(snapshots: [readonly unknown[], unknown][]) {
	for (const [key, data] of snapshots) {
		queryClient.setQueryData(key, data);
	}
}

async function refresh(slug: string) {
	await Promise.all([
		queryClient.invalidateQueries({
			queryKey: orpc.sitting.join.state.key({ input: { sittingSlug: slug } }),
		}),
		queryClient.invalidateQueries({
			queryKey: orpc.sitting.getSittingList.key(),
		}),
		queryClient.invalidateQueries({
			queryKey: orpc.sitting.getMySittingState.key(),
		}),
		queryClient.invalidateQueries({
			queryKey: orpc.sitting.join.invitations.mine.key(),
		}),
	]);
}

/** The member as the join state will show them once they are in or out. */
function withMembership(
	state: SittingJoinState,
	joined: boolean,
): SittingJoinState {
	const count = Math.max(0, state.participantCount + (joined ? 1 : -1));
	return {
		...state,
		participantCount: count,
		viewer: {
			...state.viewer,
			isParticipant: joined,
			canJoin: !joined && state.viewer.canJoin,
			joinBlockedReason: joined ? "You are already in this sitting." : null,
			canLeave: joined && state.status === "voting" && count > 1,
			pendingInvitationId: joined ? null : state.viewer.pendingInvitationId,
		},
	};
}

/** Join, leave and answer an invitation. Each shows on screen first and rolls back if refused. */
export function useSittingJoinActions(sittingSlug: string) {
	const stateKey = orpc.sitting.join.state.queryKey({
		input: { sittingSlug },
	});

	function optimistic(joined: boolean) {
		return {
			onMutate: async () => {
				await queryClient.cancelQueries({ queryKey: stateKey });
				const previous = queryClient.getQueryData(stateKey);
				if (previous) {
					queryClient.setQueryData(stateKey, withMembership(previous, joined));
				}
				const lists = patchSittingInLists(sittingSlug, joined);
				return { previous, lists };
			},
			onError: (
				error: Error,
				_variables: unknown,
				context:
					| {
							previous: SittingJoinState | undefined;
							lists: [readonly unknown[], unknown][];
					  }
					| undefined,
			) => {
				if (context?.previous) {
					queryClient.setQueryData(stateKey, context.previous);
				}
				if (context) restore(context.lists);
				toast.error(error.message);
			},
			onSettled: () => void refresh(sittingSlug),
		};
	}

	const join = useMutation(
		orpc.sitting.join.join.mutationOptions(optimistic(true)),
	);
	const leave = useMutation(
		orpc.sitting.join.leave.mutationOptions({
			...optimistic(false),
			onSuccess: () => toast.success("You left the sitting."),
		}),
	);
	const respond = useMutation(
		orpc.sitting.join.invitations.respond.mutationOptions({
			onMutate: async (variables) => {
				await queryClient.cancelQueries({ queryKey: stateKey });
				const previous = queryClient.getQueryData(stateKey);
				if (previous) {
					queryClient.setQueryData(
						stateKey,
						variables.accept
							? withMembership(previous, true)
							: {
									...previous,
									viewer: { ...previous.viewer, pendingInvitationId: null },
								},
					);
				}
				const lists = variables.accept
					? patchSittingInLists(sittingSlug, true)
					: [];
				return { previous, lists };
			},
			onError: (error, _variables, context) => {
				if (context?.previous) {
					queryClient.setQueryData(stateKey, context.previous);
				}
				if (context) restore(context.lists);
				toast.error(error.message);
			},
			onSuccess: (result) =>
				toast.success(
					result.accepted ? "You joined the sitting." : "Invitation declined.",
				),
			onSettled: () => void refresh(sittingSlug),
		}),
	);

	return { join, leave, respond };
}
