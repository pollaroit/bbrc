"use client";

import {
	normalizeShelfPermissions,
	presetIdFor,
	SHELF_PERMISSION_LABELS,
	SHELF_PERMISSION_PRESETS,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { ShelfCover } from "@/components/blocks/shelf-cover";
import { ShelfInvitationActions } from "@/components/blocks/shelf-invitation-actions";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { Link } from "@/i18n/navigation";
import { formatDateTime } from "@/lib/format-datetime";
import { orpc } from "@/utils/orpc";

const closedCopy = {
	accepted: "You already accepted this invitation.",
	rejected: "You declined this invitation.",
	cancelled: "This invitation was cancelled.",
	expired: "This invitation has expired. Ask for a new one.",
} as const;

export function ShelfInvitationPage({ token }: { token: string }) {
	const query = useQuery({
		...orpc.shelf.collab.getInvitation.queryOptions({ input: { token } }),
		retry: false,
	});

	if (query.isPending) {
		return <Skeleton className="h-64 w-full max-w-2xl" aria-hidden />;
	}

	if (query.isError || !query.data) {
		return (
			<div className="flex max-w-2xl flex-col items-start gap-3 border border-border p-6">
				<p className="font-heading font-semibold text-lg">
					This invitation is not for this account.
				</p>
				<p className="text-muted-foreground text-sm">
					Invitation links only work for the member they were made for. Sign in
					with the invited account, or ask for a new invitation.
				</p>
				<Button
					render={<Link href={"/" as Route} />}
					nativeButton={false}
					variant="outline"
					size="sm"
				>
					Go home
				</Button>
			</div>
		);
	}

	const invitation = query.data;
	const permissions = normalizeShelfPermissions(invitation.permissions);
	const presetId = presetIdFor(permissions);
	const preset = SHELF_PERMISSION_PRESETS.find(
		(entry) => entry.id === presetId,
	);
	const shelfHref =
		`/users/${invitation.owner.username}/shelves/${invitation.shelf.slug}` as Route;

	return (
		<div className="flex max-w-2xl flex-col gap-6">
			<header className="flex flex-col gap-1">
				<h1 className="font-semibold text-2xl tracking-tight">
					{invitation.invitedBy.name} invited you to a shelf
				</h1>
				<p className="text-muted-foreground text-sm">
					Collaborators help build the list together.
				</p>
			</header>

			<div className="flex gap-4 border border-border p-4">
				<ShelfCover
					coverIds={invitation.shelf.coverPreviewCoverIds}
					coverImageUrl={invitation.shelf.coverImageUrl}
					size="md"
					className="self-start"
				/>
				<div className="flex min-w-0 flex-1 flex-col gap-2">
					<h2 className="font-semibold text-lg leading-snug">
						{invitation.shelf.title}
					</h2>
					{invitation.shelf.description ? (
						<p className="line-clamp-3 text-muted-foreground text-sm">
							{invitation.shelf.description}
						</p>
					) : null}
					<p className="flex items-center gap-2 text-muted-foreground text-sm">
						<UserAvatar user={invitation.owner} className="size-5" />
						Owned by {invitation.owner.name} · {invitation.shelf.bookCount}{" "}
						{invitation.shelf.bookCount === 1 ? "book" : "books"}
					</p>
					<Link
						href={shelfHref}
						className="w-fit text-sm underline underline-offset-4 hover:text-foreground"
					>
						Take a look at the shelf
					</Link>
				</div>
			</div>

			<section className="flex flex-col gap-2">
				<h2 className="font-medium text-sm">
					What you could do
					{presetId !== "custom" && preset ? ` as ${preset.label}` : ""}
				</h2>
				<ul className="grid gap-1 text-sm sm:grid-cols-2">
					{permissions.map((permission) => (
						<li key={permission} className="text-muted-foreground">
							{SHELF_PERMISSION_LABELS[permission]}
						</li>
					))}
				</ul>
			</section>

			{invitation.status === "pending" ? (
				<div className="flex flex-col gap-3">
					<ShelfInvitationActions
						invitationId={invitation.id}
						declineHref={"/shelves" as Route}
					/>
					<p className="text-muted-foreground text-xs">
						Open until {formatDateTime(invitation.expiresAt)}.
					</p>
				</div>
			) : (
				<div className="flex flex-col items-start gap-3">
					<p className="text-sm">{closedCopy[invitation.status]}</p>
					{invitation.status === "accepted" ? (
						<Button
							render={<Link href={shelfHref} />}
							nativeButton={false}
							size="sm"
						>
							Open the shelf
						</Button>
					) : null}
				</div>
			)}
		</div>
	);
}
