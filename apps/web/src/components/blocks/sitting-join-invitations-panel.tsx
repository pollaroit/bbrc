"use client";

import { Button } from "@bbrc/ui/components/button";
import { Input } from "@bbrc/ui/components/input";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Send, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { orpc, queryClient } from "@/utils/orpc";

const STATE_NOTES = {
	can_add: null,
	invite_only: "Prefers to be invited",
	closed: "Joining is closed",
	participant: "Already in",
	removed: "Was removed from this sitting",
	invited: "Already invited",
	banned: "Cannot be invited",
} as const;

export function SittingJoinInvitationsPanel({
	sittingSlug,
}: {
	sittingSlug: string;
}) {
	const [search, setSearch] = useState("");
	const query = useDebouncedValue(search.trim(), 250);

	const pendingOptions = orpc.sitting.join.invitations.forSitting.queryOptions({
		input: { sittingSlug },
	});
	const pending = useQuery(pendingOptions);
	const results = useQuery({
		...orpc.sitting.join.searchMembers.queryOptions({
			input: { sittingSlug, query },
		}),
		enabled: query.length >= 1,
	});

	const refresh = () =>
		Promise.all([
			queryClient.invalidateQueries({ queryKey: pendingOptions.queryKey }),
			queryClient.invalidateQueries({
				queryKey: orpc.sitting.join.searchMembers.key(),
			}),
		]);

	const invite = useMutation(
		orpc.sitting.join.invitations.create.mutationOptions({
			onSuccess: () => toast.success("Invitation sent"),
			onError: (error) => toast.error(error.message),
			onSettled: refresh,
		}),
	);
	const searchKey = orpc.sitting.join.searchMembers.queryKey({
		input: { sittingSlug, query },
	});
	const add = useMutation(
		orpc.sitting.addSittingParticipant.mutationOptions({
			onMutate: async ({ userId }) => {
				await queryClient.cancelQueries({ queryKey: searchKey });
				const previous = queryClient.getQueryData(searchKey);
				queryClient.setQueryData(searchKey, (current) =>
					current
						? {
								...current,
								items: current.items.map((member) =>
									member.userId === userId
										? { ...member, state: "participant" as const }
										: member,
								),
							}
						: current,
				);
				return { previous };
			},
			onSuccess: () => toast.success("Added to the sitting"),
			onError: (error, _variables, context) => {
				queryClient.setQueryData(searchKey, context?.previous);
				toast.error(error.message);
			},
			onSettled: () =>
				Promise.all([
					refresh(),
					queryClient.invalidateQueries({
						queryKey: orpc.sitting.getSittingBySlug.key(),
					}),
					queryClient.invalidateQueries({
						queryKey: orpc.sitting.join.state.key(),
					}),
				]),
		}),
	);
	const cancel = useMutation(
		orpc.sitting.join.invitations.cancel.mutationOptions({
			onMutate: async ({ invitationId }) => {
				await queryClient.cancelQueries({ queryKey: pendingOptions.queryKey });
				const previous = queryClient.getQueryData(pendingOptions.queryKey);
				if (previous) {
					queryClient.setQueryData(pendingOptions.queryKey, {
						items: previous.items.filter((item) => item.id !== invitationId),
					});
				}
				return { previous };
			},
			onError: (error, _vars, context) => {
				if (context?.previous) {
					queryClient.setQueryData(pendingOptions.queryKey, context.previous);
				}
				toast.error(error.message);
			},
			onSettled: refresh,
		}),
	);

	return (
		<div className="flex flex-col gap-5">
			<div className="flex flex-col gap-2">
				<p className="text-muted-foreground text-xs leading-relaxed">
					Invite a member by name. They get a notification and choose whether to
					join. To put someone in straight away, use the participants list.
				</p>
				<Input
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder="Search members by name or username"
					aria-label="Search members"
					autoComplete="off"
				/>
				{query.length >= 1 ? (
					results.isFetching && !results.data ? (
						<Skeleton className="h-16 w-full" aria-hidden />
					) : (results.data?.items.length ?? 0) === 0 ? (
						<p className="text-muted-foreground text-sm">
							No member matches “{query}”.
						</p>
					) : (
						<ul className="divide-y divide-border border border-border">
							{results.data?.items.map((member) => {
								const note = STATE_NOTES[member.state];
								const canInvite =
									member.state === "can_add" || member.state === "invite_only";
								return (
									<li
										key={member.username}
										className="flex items-center justify-between gap-3 p-2.5"
									>
										<span className="flex min-w-0 flex-col">
											<span className="truncate font-medium text-sm">
												{member.name}
											</span>
											<span className="truncate text-muted-foreground text-xs">
												@{member.username}
												{note ? ` · ${note}` : ""}
											</span>
										</span>
										<span className="flex shrink-0 gap-1.5">
											{member.state === "can_add" ? (
												<Button
													size="sm"
													disabled={add.isPending}
													onClick={() =>
														add.mutate({
															slug: sittingSlug,
															userId: member.userId,
														})
													}
												>
													<Plus data-icon="inline-start" aria-hidden />
													Add
												</Button>
											) : null}
											{canInvite ? (
												<Button
													size="sm"
													variant="outline"
													disabled={invite.isPending}
													onClick={() =>
														invite.mutate({
															sittingSlug,
															username: member.username,
														})
													}
												>
													<Send data-icon="inline-start" aria-hidden />
													Invite
												</Button>
											) : null}
										</span>
									</li>
								);
							})}
						</ul>
					)
				) : null}
			</div>

			<div className="flex flex-col gap-2">
				<p className="font-medium text-sm">Waiting for an answer</p>
				{pending.isPending ? (
					<Skeleton className="h-12 w-full" aria-hidden />
				) : (pending.data?.items.length ?? 0) === 0 ? (
					<p className="text-muted-foreground text-sm">No open invitations.</p>
				) : (
					<ul className="divide-y divide-border border border-border">
						{pending.data?.items.map((item) => (
							<li
								key={item.id}
								className="flex items-center justify-between gap-3 p-2.5"
							>
								<span className="flex min-w-0 flex-col">
									<span className="truncate font-medium text-sm">
										{item.invitee.name}
									</span>
									<span className="truncate text-muted-foreground text-xs">
										@{item.invitee.username}
										{item.invitedBy ? ` · by ${item.invitedBy.name}` : ""}
									</span>
								</span>
								<Button
									size="icon-sm"
									variant="ghost"
									aria-label={`Cancel invitation for ${item.invitee.name}`}
									onClick={() => cancel.mutate({ invitationId: item.id })}
								>
									<X aria-hidden />
								</Button>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
