"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import { Check, Clock, ShieldOff, UserCheck, UserPlus, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { authPageHref } from "@/lib/auth-callback-url";
import { authClient } from "@/lib/auth-client";
import { useFriendActions, useFriendState } from "@/lib/friends/use-friends";

type FriendButtonProps = {
	username: string;
	/** Smaller, for lists and headers. */
	size?: "sm" | "default";
	/** Hide everything but the action (no "Friends" menu text on tight rows). */
	className?: string;
};

/**
 * The one friend control: add, pending (cancel), accept or decline, friends
 * (unfriend or block), blocked (unblock). Updates at once and rolls back on error.
 * Renders nothing for yourself, for signed-out visitors it asks them to sign in.
 */
export function FriendButton({
	username,
	size = "sm",
	className,
}: FriendButtonProps) {
	const { data: session } = authClient.useSession();
	const signedIn = Boolean(session?.user);
	const isSelf = session?.user?.username === username;
	const query = useFriendState(username, signedIn && !isSelf);
	const actions = useFriendActions(username);
	const [confirm, setConfirm] = useState<"remove" | "block" | null>(null);

	if (isSelf) return null;

	if (!signedIn) {
		return (
			<Button
				size={size}
				variant="outline"
				className={className}
				nativeButton={false}
				render={
					<Link
						href={authPageHref("/sign-in", `/users/${username}`) as Route}
					/>
				}
			>
				<UserPlus data-icon="inline-start" aria-hidden />
				Add friend
			</Button>
		);
	}

	const state = query.data?.state;
	if (!state || state === "unavailable") return null;

	const dialogs = (
		<>
			<DestructiveConfirmDialog
				open={confirm === "remove"}
				onOpenChange={(open) => !open && setConfirm(null)}
				title="Remove this friend?"
				description="They will not be told. Their friends-only posts and shelves close to you, and yours to them."
				confirmLabel="Remove friend"
				onConfirm={() => {
					setConfirm(null);
					actions.remove();
				}}
			/>
			<DestructiveConfirmDialog
				open={confirm === "block"}
				onOpenChange={(open) => !open && setConfirm(null)}
				title="Block this member?"
				description="Neither of you will see the other in the app: search, lists, feeds and comments. You are not friends any more. They will not be told."
				confirmLabel="Block"
				onConfirm={() => {
					setConfirm(null);
					actions.block();
				}}
			/>
		</>
	);

	if (state === "none") {
		return (
			<>
				<Button
					size={size}
					variant="outline"
					className={className}
					disabled={actions.pending}
					onClick={actions.send}
				>
					<UserPlus data-icon="inline-start" aria-hidden />
					Add friend
				</Button>
				{dialogs}
			</>
		);
	}

	if (state === "request_sent") {
		return (
			<Button
				size={size}
				variant="secondary"
				className={className}
				disabled={actions.pending}
				onClick={actions.cancel}
				title="Tap to cancel the request"
			>
				<Clock data-icon="inline-start" aria-hidden />
				Request sent
			</Button>
		);
	}

	if (state === "request_received") {
		return (
			<div className="flex items-center gap-1.5">
				<Button
					size={size}
					className={className}
					disabled={actions.pending}
					onClick={actions.accept}
				>
					<Check data-icon="inline-start" aria-hidden />
					Accept
				</Button>
				<Button
					size={size}
					variant="outline"
					disabled={actions.pending}
					onClick={actions.decline}
				>
					<X data-icon="inline-start" aria-hidden />
					Decline
				</Button>
			</div>
		);
	}

	if (state === "blocked") {
		return (
			<Button
				size={size}
				variant="outline"
				className={className}
				disabled={actions.pending}
				onClick={actions.unblock}
			>
				<ShieldOff data-icon="inline-start" aria-hidden />
				Unblock
			</Button>
		);
	}

	// friends
	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button size={size} variant="secondary" className={className} />
					}
				>
					<UserCheck data-icon="inline-start" aria-hidden />
					Friends
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={() => setConfirm("remove")}>
						Remove friend
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						variant="destructive"
						onClick={() => setConfirm("block")}
					>
						Block
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			{dialogs}
		</>
	);
}
