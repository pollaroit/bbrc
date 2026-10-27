"use client";

import { Button } from "@bbrc/ui/components/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { toast } from "sonner";
import { SittingStatusBadge } from "@/components/blocks/sitting-status-badge";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

/** Sitting invitations waiting for an answer, at the top of the sittings list. */
export function SittingInvitationsNotice() {
	const router = useRouter();
	const { data: session } = authClient.useSession();
	const key = orpc.sitting.join.invitations.mine.queryKey();
	const query = useQuery({
		...orpc.sitting.join.invitations.mine.queryOptions(),
		enabled: Boolean(session?.user),
	});

	const respond = useMutation(
		orpc.sitting.join.invitations.respond.mutationOptions({
			onMutate: async (variables) => {
				await queryClient.cancelQueries({ queryKey: key });
				const previous = queryClient.getQueryData(key);
				queryClient.setQueryData(key, (current) =>
					current
						? {
								...current,
								items: current.items.filter(
									(item) => item.id !== variables.invitationId,
								),
							}
						: current,
				);
				return { previous };
			},
			onError: (error, _variables, context) => {
				if (context?.previous) {
					queryClient.setQueryData(key, context.previous);
				}
				toast.error(error.message);
			},
			onSuccess: async (result) => {
				if (result.accepted) {
					toast.success("You joined the sitting.");
					router.push(`/sittings/${result.sittingSlug}` as Route);
				} else {
					toast.success("Invitation declined.");
				}
			},
			onSettled: () => {
				void queryClient.invalidateQueries({ queryKey: key });
				void queryClient.invalidateQueries({
					queryKey: orpc.sitting.getSittingList.key(),
				});
				void queryClient.invalidateQueries({
					queryKey: orpc.sitting.join.state.key(),
				});
			},
		}),
	);

	const items = query.data?.items ?? [];
	if (items.length === 0) {
		return null;
	}

	return (
		<section
			aria-label="Sitting invitations"
			className="flex flex-col gap-2 border border-foreground p-4"
		>
			<h2 className="font-medium text-sm">
				{items.length === 1
					? "You have a sitting invitation"
					: `You have ${items.length} sitting invitations`}
			</h2>
			<ul className="divide-y divide-border">
				{items.map((item) => (
					<li
						key={item.id}
						className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
					>
						<span className="flex min-w-0 items-center gap-3">
							{item.invitedBy ? (
								<UserAvatar user={item.invitedBy} className="size-8" />
							) : null}
							<span className="min-w-0">
								<Link
									href={`/sittings/${item.sittingSlug}` as Route}
									className="flex items-center gap-2 font-medium text-sm underline-offset-4 hover:underline"
								>
									<span className="truncate">{item.displayName}</span>
									<SittingStatusBadge status={item.status} />
								</Link>
								<span className="block truncate text-muted-foreground text-xs">
									{item.invitedBy
										? `From ${item.invitedBy.name}`
										: "From an organiser"}
								</span>
							</span>
						</span>
						<span className="flex gap-2">
							<Button
								size="sm"
								disabled={respond.isPending}
								onClick={() =>
									respond.mutate({ invitationId: item.id, accept: true })
								}
							>
								Accept
							</Button>
							<Button
								size="sm"
								variant="outline"
								disabled={respond.isPending}
								onClick={() =>
									respond.mutate({ invitationId: item.id, accept: false })
								}
							>
								Decline
							</Button>
						</span>
					</li>
				))}
			</ul>
		</section>
	);
}
