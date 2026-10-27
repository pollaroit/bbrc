"use client";

import { Button } from "@bbrc/ui/components/button";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation } from "@tanstack/react-query";
import type { Route } from "next";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { orpc, queryClient } from "@/utils/orpc";

type ShelfInvitationActionsProps = {
	invitationId: string;
	/** Where to go after declining. Accepting always opens the shelf. */
	declineHref?: Route;
	size?: "sm" | "default";
};

/** Accept or decline a shelf invitation. */
export function ShelfInvitationActions({
	invitationId,
	declineHref,
	size = "default",
}: ShelfInvitationActionsProps) {
	const router = useRouter();

	const respond = useMutation(
		orpc.shelf.collab.respond.mutationOptions({
			onSuccess: async (result) => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: orpc.shelf.collab.myInvitations.key(),
					}),
					queryClient.invalidateQueries({
						queryKey: orpc.shelf.getBySlug.key(),
					}),
					queryClient.invalidateQueries({
						queryKey: orpc.shelf.listByUsername.key(),
					}),
					queryClient.invalidateQueries({
						queryKey: orpc.notification.getUnreadCount.key(),
					}),
				]);
				if (result.accepted) {
					toast.success("You are now a collaborator.");
					router.push(
						`/users/${result.ownerUsername}/shelves/${result.shelfSlug}` as Route,
					);
				} else {
					toast.success("Invitation declined.");
					router.push(declineHref ?? ("/" as Route));
				}
				router.refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	return (
		<div className="flex flex-wrap gap-2">
			<LoadingButton
				type="button"
				size={size}
				loading={respond.isPending && respond.variables?.accept === true}
				disabled={respond.isPending}
				onClick={() => respond.mutate({ invitationId, accept: true })}
			>
				Accept
			</LoadingButton>
			<Button
				type="button"
				size={size}
				variant="outline"
				disabled={respond.isPending}
				onClick={() => respond.mutate({ invitationId, accept: false })}
			>
				Decline
			</Button>
		</div>
	);
}
