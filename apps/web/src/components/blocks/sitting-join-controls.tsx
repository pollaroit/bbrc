"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { useQuery } from "@tanstack/react-query";
import { LogOut, UserPlus } from "lucide-react";
import type { Route } from "next";
import { useState } from "react";
import { SittingReadingRisk } from "@/components/blocks/sitting-reading-risk";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { useSittingJoinActions } from "@/lib/sitting/join-cache";
import { orpc } from "@/utils/orpc";

type SittingJoinControlsProps = {
	sittingSlug: string;
	status: "voting" | "reading" | "finished";
	/** The reading deadline, shown in the warning when joining mid-reading. */
	deadline: Date | string;
};

/** Join, leave, invitations and the organiser's settings, for one sitting. */
export function SittingJoinControls({
	sittingSlug,
	status,
	deadline,
}: SittingJoinControlsProps) {
	const { data: session } = authClient.useSession();
	const query = useQuery(
		orpc.sitting.join.state.queryOptions({ input: { sittingSlug } }),
	);
	const actions = useSittingJoinActions(sittingSlug);
	const [riskOpen, setRiskOpen] = useState(false);
	const [riskAccepted, setRiskAccepted] = useState(false);
	const [leaveOpen, setLeaveOpen] = useState(false);

	const state = query.data;
	if (!state) {
		return null;
	}
	const { viewer } = state;
	const signedIn = Boolean(session?.user) || viewer.signedIn;

	const showJoin = viewer.canJoin;
	const showLeave = viewer.canLeave;
	const note =
		!signedIn && state.config.joinType === "public" && status !== "finished"
			? "Sign in to join this sitting."
			: viewer.joinBlockedReason &&
					!viewer.isParticipant &&
					viewer.joinBlockedReason !== "Sign in to join."
				? viewer.joinBlockedReason
				: null;

	if (
		!showJoin &&
		!showLeave &&
		!note &&
		!viewer.canManage &&
		!viewer.pendingInvitationId
	) {
		return null;
	}

	function join() {
		actions.join.mutate({ sittingSlug });
		setRiskOpen(false);
		setRiskAccepted(false);
	}

	return (
		<div className="flex flex-col gap-3">
			{viewer.pendingInvitationId ? (
				<div className="flex flex-col gap-3 border border-foreground p-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p className="font-medium text-sm">
							You were invited to this sitting
						</p>
						<p className="text-muted-foreground text-sm">
							{status === "reading"
								? "Check the deadline before you say yes."
								: "Say yes to take part, or decline."}
						</p>
					</div>
					<div className="flex gap-2">
						<Button
							size="sm"
							disabled={actions.respond.isPending}
							onClick={() =>
								actions.respond.mutate({
									invitationId: viewer.pendingInvitationId ?? "",
									accept: true,
								})
							}
						>
							Accept
						</Button>
						<Button
							size="sm"
							variant="outline"
							disabled={actions.respond.isPending}
							onClick={() =>
								actions.respond.mutate({
									invitationId: viewer.pendingInvitationId ?? "",
									accept: false,
								})
							}
						>
							Decline
						</Button>
					</div>
				</div>
			) : null}

			<div className="flex flex-wrap items-center gap-2">
				{showJoin ? (
					<Button
						size="sm"
						disabled={actions.join.isPending}
						onClick={() => (status === "reading" ? setRiskOpen(true) : join())}
					>
						<UserPlus data-icon="inline-start" aria-hidden />
						Join this sitting
					</Button>
				) : null}
				{showLeave ? (
					<Button
						size="sm"
						variant="outline"
						disabled={actions.leave.isPending}
						onClick={() => setLeaveOpen(true)}
					>
						<LogOut data-icon="inline-start" aria-hidden />
						Leave
					</Button>
				) : null}
				{note ? (
					<span className="text-muted-foreground text-xs">
						{note}{" "}
						{!signedIn ? (
							<Link
								href={"/sign-in" as Route}
								className="text-foreground underline underline-offset-4"
							>
								Sign in
							</Link>
						) : null}
					</span>
				) : null}
			</div>

			<Dialog
				open={riskOpen}
				onOpenChange={(next) => {
					setRiskOpen(next);
					if (!next) setRiskAccepted(false);
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Join while reading is under way?</DialogTitle>
						<DialogDescription>
							Everyone in the sitting is judged at the same deadline.
						</DialogDescription>
					</DialogHeader>
					<SittingReadingRisk
						deadline={deadline}
						checked={riskAccepted}
						onCheckedChange={setRiskAccepted}
					/>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setRiskOpen(false)}>
							Cancel
						</Button>
						<Button disabled={!riskAccepted} onClick={join}>
							Join sitting
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<DestructiveConfirmDialog
				open={leaveOpen}
				onOpenChange={setLeaveOpen}
				title="Leave this sitting?"
				description="Your votes are removed. You can join again while voting is open, unless an organiser has to add you back."
				confirmLabel="Leave sitting"
				onConfirm={() => {
					setLeaveOpen(false);
					actions.leave.mutate({ sittingSlug });
				}}
			/>
		</div>
	);
}
