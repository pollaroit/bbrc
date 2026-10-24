"use client";

import type { ListCollaboratorsOutput } from "@bbrc/api/modules/shelf/shelf-collab.schema";
import {
	canManageCollaborators,
	missingGrants,
	outranks,
	presetIdFor,
	resolveShelfPermissions,
	SHELF_PERMISSION_PRESETS,
	type ShelfPermission,
} from "@bbrc/shared";
import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { Input } from "@bbrc/ui/components/input";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { Check, Copy, LogOut, Search, UserPlus, X } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { RelativeTime } from "@/components/blocks/relative-time";
import { SegmentedControl } from "@/components/blocks/segmented-control";
import { ShelfPermissionPicker } from "@/components/blocks/shelf-permission-picker";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { authClient } from "@/lib/auth-client";
import { describeShelfActivity } from "@/lib/shelf-activity";
import { orpc, queryClient } from "@/utils/orpc";

export type ShelfDialogTab = "people" | "invite" | "activity";

type ShelfCollaboratorsDialogProps = {
	ownerUsername: string;
	shelfSlug: string;
	shelfTitle: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialTab?: ShelfDialogTab;
};

const presetLabel = (permissions: readonly string[]) => {
	const id = presetIdFor(permissions);
	return id === "custom"
		? "Custom"
		: (SHELF_PERMISSION_PRESETS.find((preset) => preset.id === id)?.label ??
				"Custom");
};

function invitationUrl(token: string) {
	return `${window.location.origin}/shelf-invitations/${token}`;
}

async function copyInvitationLink(token: string) {
	try {
		await navigator.clipboard.writeText(invitationUrl(token));
		toast.success("Link copied. It only works for the invited member.");
	} catch {
		toast.error("Could not copy. Select the link and copy it by hand.");
	}
}

export function ShelfCollaboratorsDialog({
	ownerUsername,
	shelfSlug,
	shelfTitle,
	open,
	onOpenChange,
	initialTab = "people",
}: ShelfCollaboratorsDialogProps) {
	const [tab, setTab] = useState<ShelfDialogTab>(initialTab);
	const input = { ownerUsername, shelfSlug };

	const listQuery = useQuery({
		...orpc.shelf.collab.list.queryOptions({ input }),
		enabled: open,
	});

	const viewer = listQuery.data?.viewer;
	const permissions = useMemo(
		() =>
			resolveShelfPermissions(
				viewer?.role === "owner",
				viewer?.permissions ?? [],
			),
		[viewer],
	);
	const canInvite = permissions.has("add_collaborator");
	const canSeeActivity =
		viewer?.role === "owner" || canManageCollaborators(permissions);

	const tabs = [
		{ id: "people" as const, label: "People" },
		...(canInvite ? [{ id: "invite" as const, label: "Invite" }] : []),
		...(canSeeActivity ? [{ id: "activity" as const, label: "Activity" }] : []),
	];
	const activeTab = tabs.some((entry) => entry.id === tab) ? tab : "people";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[88vh] gap-5 overflow-y-auto sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Collaborators</DialogTitle>
					<DialogDescription>
						People who help edit “{shelfTitle}”.
					</DialogDescription>
				</DialogHeader>

				{tabs.length > 1 ? (
					<SegmentedControl
						label="Section"
						value={activeTab}
						onChange={setTab}
						options={tabs}
					/>
				) : null}

				{listQuery.isPending ? (
					<Skeleton className="h-40 w-full" aria-hidden />
				) : listQuery.isError || !listQuery.data ? (
					<p className="text-destructive text-sm" role="alert">
						{listQuery.error?.message ?? "Could not load collaborators."}
					</p>
				) : activeTab === "people" ? (
					<PeopleTab
						data={listQuery.data}
						permissions={permissions}
						ownerUsername={ownerUsername}
						shelfSlug={shelfSlug}
						shelfTitle={shelfTitle}
						onClose={() => onOpenChange(false)}
					/>
				) : activeTab === "invite" ? (
					<InviteTab
						ownerUsername={ownerUsername}
						shelfSlug={shelfSlug}
						permissions={permissions}
						onInvited={() => setTab("people")}
					/>
				) : (
					<ActivityTab ownerUsername={ownerUsername} shelfSlug={shelfSlug} />
				)}
			</DialogContent>
		</Dialog>
	);
}

type ListData = ListCollaboratorsOutput;

function useRefreshShelf(ownerUsername: string, shelfSlug: string) {
	return async () => {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: orpc.shelf.collab.list.key(),
			}),
			queryClient.invalidateQueries({
				queryKey: orpc.shelf.getBySlug.key({
					input: { username: ownerUsername, shelfSlug },
				}),
			}),
			queryClient.invalidateQueries({
				queryKey: orpc.shelf.listByUsername.key(),
			}),
		]);
	};
}

function PeopleTab({
	data,
	permissions,
	ownerUsername,
	shelfSlug,
	shelfTitle,
	onClose,
}: {
	data: ListData;
	permissions: ReadonlySet<ShelfPermission>;
	ownerUsername: string;
	shelfSlug: string;
	shelfTitle: string;
	onClose: () => void;
}) {
	const router = useRouter();
	const { data: session } = authClient.useSession();
	const me = session?.user.username;
	const refresh = useRefreshShelf(ownerUsername, shelfSlug);
	const shelfRef = { ownerUsername, shelfSlug };

	const [editing, setEditing] = useState<string | null>(null);
	const [draft, setDraft] = useState<ShelfPermission[]>([]);
	const [removing, setRemoving] = useState<string | null>(null);
	const [transferTo, setTransferTo] = useState<string | null>(null);
	const [leaving, setLeaving] = useState(false);

	const isOwner = data.viewer.role === "owner";
	const canEdit = permissions.has("edit_permissions");
	const canRemove = permissions.has("remove_collaborator");

	const updateMutation = useMutation(
		orpc.shelf.collab.updatePermissions.mutationOptions({
			onSuccess: async () => {
				toast.success("Permissions updated.");
				setEditing(null);
				await refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const removeMutation = useMutation(
		orpc.shelf.collab.remove.mutationOptions({
			onSuccess: async () => {
				toast.success("Removed from the shelf.");
				setRemoving(null);
				await refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const leaveMutation = useMutation(
		orpc.shelf.collab.leave.mutationOptions({
			onSuccess: async () => {
				toast.success("You left the shelf.");
				setLeaving(false);
				onClose();
				await refresh();
				router.push(`/users/${me}/shelves` as Route);
				router.refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const transferMutation = useMutation(
		orpc.shelf.collab.transferOwnership.mutationOptions({
			onSuccess: async (result) => {
				toast.success("Ownership transferred.");
				setTransferTo(null);
				onClose();
				await refresh();
				router.push(
					`/users/${result.ownerUsername}/shelves/${result.shelfSlug}` as Route,
				);
				router.refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const cancelMutation = useMutation(
		orpc.shelf.collab.cancelInvitation.mutationOptions({
			onSuccess: async () => {
				toast.success("Invitation cancelled.");
				await refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	return (
		<div className="flex flex-col gap-6">
			<ul className="divide-y divide-border border border-border">
				<li className="flex items-center gap-3 p-3">
					<UserAvatar user={data.owner} className="size-9" />
					<span className="min-w-0 flex-1">
						<span className="block truncate font-medium text-sm">
							{data.owner.name}
						</span>
						<span className="block truncate text-muted-foreground text-xs">
							@{data.owner.username}
						</span>
					</span>
					<Badge variant="secondary">Owner</Badge>
				</li>

				{data.collaborators.map((person) => {
					const isMe = person.username === me;
					const visible = person.permissions.length > 0;
					const outranked =
						visible && !outranks(permissions, person.permissions);
					const rowEditing = editing === person.username;
					return (
						<li key={person.username} className="flex flex-col gap-3 p-3">
							<div className="flex flex-wrap items-center gap-3">
								<UserAvatar user={person} className="size-9" />
								<span className="min-w-0 flex-1">
									<span className="block truncate font-medium text-sm">
										{person.name}
										{isMe ? (
											<span className="ps-1.5 font-normal text-muted-foreground">
												(you)
											</span>
										) : null}
									</span>
									<span className="block truncate text-muted-foreground text-xs">
										@{person.username}
										{person.invitedBy
											? ` · invited by ${person.invitedBy.name}`
											: ""}
									</span>
								</span>
								{visible ? (
									<Badge variant="outline">
										{presetLabel(person.permissions)}
									</Badge>
								) : null}
								<span className="flex gap-1">
									{canEdit && !isMe && visible && !outranked ? (
										<Button
											type="button"
											size="sm"
											variant="outline"
											onClick={() => {
												setEditing(rowEditing ? null : person.username);
												setDraft(person.permissions);
											}}
										>
											{rowEditing ? "Close" : "Permissions"}
										</Button>
									) : null}
									{isOwner ? (
										<Button
											type="button"
											size="sm"
											variant="outline"
											onClick={() => setTransferTo(person.username)}
										>
											Make owner
										</Button>
									) : null}
									{canRemove && !isMe && visible && !outranked ? (
										<Button
											type="button"
											size="icon-sm"
											variant="ghost"
											aria-label={`Remove ${person.name}`}
											className="text-muted-foreground hover:text-destructive"
											onClick={() => setRemoving(person.username)}
										>
											<X className="size-4" aria-hidden />
										</Button>
									) : null}
									{isMe ? (
										<Button
											type="button"
											size="sm"
											variant="outline"
											onClick={() => setLeaving(true)}
										>
											<LogOut data-icon="inline-start" aria-hidden />
											Leave shelf
										</Button>
									) : null}
								</span>
							</div>

							{rowEditing ? (
								<div className="flex flex-col gap-4 border-border border-t pt-4">
									<ShelfPermissionPicker
										idPrefix={`edit-${person.username}`}
										value={draft}
										onChange={setDraft}
										grantable={permissions}
									/>
									<div className="flex gap-2">
										<LoadingButton
											type="button"
											size="sm"
											loading={updateMutation.isPending}
											disabled={
												draft.length === 0 ||
												missingGrants(permissions, draft).length > 0 ||
												draft.join() === person.permissions.join()
											}
											onClick={() =>
												updateMutation.mutate({
													...shelfRef,
													username: person.username,
													permissions: draft,
												})
											}
										>
											Save permissions
										</LoadingButton>
										<Button
											type="button"
											size="sm"
											variant="ghost"
											onClick={() => setEditing(null)}
										>
											Cancel
										</Button>
									</div>
								</div>
							) : null}
						</li>
					);
				})}

				{data.collaborators.length === 0 ? (
					<li className="p-4 text-muted-foreground text-sm">
						No collaborators yet.
					</li>
				) : null}
			</ul>

			{data.invitations.length > 0 ? (
				<section className="flex flex-col gap-2">
					<h3 className="font-medium text-sm">Waiting for an answer</h3>
					<ul className="divide-y divide-border border border-border">
						{data.invitations.map((invitation) => (
							<li
								key={invitation.id}
								className="flex flex-wrap items-center gap-3 p-3"
							>
								<UserAvatar user={invitation.invitee} className="size-8" />
								<span className="min-w-0 flex-1">
									<span className="block truncate font-medium text-sm">
										{invitation.invitee.name}
									</span>
									<span className="block truncate text-muted-foreground text-xs">
										{presetLabel(invitation.permissions)} · expires{" "}
										<RelativeTime
											date={invitation.expiresAt}
											className="text-muted-foreground text-xs"
										/>
									</span>
								</span>
								{invitation.token ? (
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={() =>
											void copyInvitationLink(invitation.token ?? "")
										}
									>
										<Copy data-icon="inline-start" aria-hidden />
										Copy link
									</Button>
								) : null}
								<Button
									type="button"
									size="sm"
									variant="ghost"
									disabled={cancelMutation.isPending}
									onClick={() =>
										cancelMutation.mutate({ invitationId: invitation.id })
									}
								>
									Cancel
								</Button>
							</li>
						))}
					</ul>
				</section>
			) : null}

			<DestructiveConfirmDialog
				open={removing != null}
				onOpenChange={(next) => !next && setRemoving(null)}
				title="Remove collaborator?"
				description="They lose access to this shelf. Books they added stay on it."
				confirmLabel="Remove"
				loading={removeMutation.isPending}
				onConfirm={() =>
					removing && removeMutation.mutate({ ...shelfRef, username: removing })
				}
			/>
			<DestructiveConfirmDialog
				open={leaving}
				onOpenChange={setLeaving}
				title="Leave this shelf?"
				description={`You will no longer be able to edit “${shelfTitle}”. Books you added stay on it.`}
				confirmLabel="Leave shelf"
				loading={leaveMutation.isPending}
				onConfirm={() => leaveMutation.mutate(shelfRef)}
			/>
			<DestructiveConfirmDialog
				open={transferTo != null}
				onOpenChange={(next) => !next && setTransferTo(null)}
				title="Make them the owner?"
				description="They will own the shelf and can delete it. You stay on as a manager. The shelf address changes to their profile."
				confirmLabel="Transfer ownership"
				loading={transferMutation.isPending}
				onConfirm={() =>
					transferTo &&
					transferMutation.mutate({ ...shelfRef, username: transferTo })
				}
			/>
		</div>
	);
}

function InviteTab({
	ownerUsername,
	shelfSlug,
	permissions,
	onInvited,
}: {
	ownerUsername: string;
	shelfSlug: string;
	permissions: ReadonlySet<ShelfPermission>;
	onInvited: () => void;
}) {
	const refresh = useRefreshShelf(ownerUsername, shelfSlug);
	const [search, setSearch] = useState("");
	const query = useDebouncedValue(search.trim(), 250);
	const [picked, setPicked] = useState<{
		username: string;
		name: string;
		image: string | null;
	} | null>(null);
	const contributor = SHELF_PERMISSION_PRESETS.find(
		(preset) => preset.id === "contributor",
	);
	const [draft, setDraft] = useState<ShelfPermission[]>([
		...(contributor?.permissions ?? []),
	]);
	const [sent, setSent] = useState<{ token: string; name: string } | null>(
		null,
	);

	const results = useQuery({
		...orpc.shelf.collab.searchInvitable.queryOptions({
			input: { ownerUsername, shelfSlug, query },
		}),
		enabled: query.length > 0 && picked == null,
	});

	const inviteMutation = useMutation(
		orpc.shelf.collab.invite.mutationOptions({
			onSuccess: async (result) => {
				setSent({ token: result.token, name: picked?.name ?? "them" });
				setPicked(null);
				setSearch("");
				await refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const stateLabel = {
		owner: "Owner",
		collaborator: "Already a collaborator",
		invited: "Invitation pending",
		invites_off: "Not accepting invitations",
	} as const;

	if (sent) {
		return (
			<div className="flex flex-col gap-4">
				<div className="flex flex-col gap-1 border border-border p-4">
					<p className="flex items-center gap-2 font-medium text-sm">
						<Check className="size-4" aria-hidden />
						Invitation sent to {sent.name}
					</p>
					<p className="text-muted-foreground text-sm">
						They get a notification and can answer from there or from the shelf
						page. You can also share the link below. It only works for them, and
						expires in 14 days.
					</p>
				</div>
				<div className="flex gap-2">
					<Input
						readOnly
						value={invitationUrl(sent.token)}
						aria-label="Invitation link"
						onFocus={(event) => event.currentTarget.select()}
					/>
					<Button
						type="button"
						variant="outline"
						onClick={() => void copyInvitationLink(sent.token)}
					>
						<Copy data-icon="inline-start" aria-hidden />
						Copy
					</Button>
				</div>
				<div className="flex gap-2">
					<Button type="button" onClick={() => setSent(null)}>
						<UserPlus data-icon="inline-start" aria-hidden />
						Invite someone else
					</Button>
					<Button type="button" variant="ghost" onClick={onInvited}>
						Back to people
					</Button>
				</div>
			</div>
		);
	}

	if (picked) {
		return (
			<div className="flex flex-col gap-5">
				<div className="flex items-center gap-3 border border-border p-3">
					<UserAvatar user={picked} className="size-9" />
					<span className="min-w-0 flex-1">
						<span className="block truncate font-medium text-sm">
							{picked.name}
						</span>
						<span className="block truncate text-muted-foreground text-xs">
							@{picked.username}
						</span>
					</span>
					<Button
						type="button"
						size="sm"
						variant="ghost"
						onClick={() => setPicked(null)}
					>
						Change
					</Button>
				</div>
				<ShelfPermissionPicker
					idPrefix="invite"
					value={draft}
					onChange={setDraft}
					grantable={permissions}
				/>
				<div className="flex gap-2">
					<LoadingButton
						type="button"
						loading={inviteMutation.isPending}
						disabled={
							draft.length === 0 || missingGrants(permissions, draft).length > 0
						}
						onClick={() =>
							inviteMutation.mutate({
								ownerUsername,
								shelfSlug,
								username: picked.username,
								permissions: draft,
							})
						}
					>
						Send invitation
					</LoadingButton>
					<Button type="button" variant="ghost" onClick={() => setPicked(null)}>
						Cancel
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="relative">
				<Search
					className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
					aria-hidden
				/>
				<Input
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder="Search members by name or username…"
					aria-label="Search members"
					className="ps-9"
					autoComplete="off"
				/>
			</div>

			{query.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Find a member, then choose what they can do on this shelf.
				</p>
			) : results.isPending ? (
				<Skeleton className="h-24 w-full" aria-hidden />
			) : (results.data?.items.length ?? 0) === 0 ? (
				<p className="text-muted-foreground text-sm">
					No members match “{query}”.
				</p>
			) : (
				<ul className="divide-y divide-border border border-border">
					{results.data?.items.map((person) => {
						const disabled = person.state !== "available";
						return (
							<li key={person.username}>
								<button
									type="button"
									disabled={disabled}
									onClick={() => setPicked(person)}
									className="flex w-full items-center gap-3 p-3 text-start transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
								>
									<UserAvatar user={person} className="size-8" />
									<span className="min-w-0 flex-1">
										<span className="block truncate font-medium text-sm">
											{person.name}
										</span>
										<span className="block truncate text-muted-foreground text-xs">
											@{person.username}
										</span>
									</span>
									{person.state !== "available" ? (
										<Badge variant="outline">{stateLabel[person.state]}</Badge>
									) : null}
								</button>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

function ActivityTab({
	ownerUsername,
	shelfSlug,
}: {
	ownerUsername: string;
	shelfSlug: string;
}) {
	const query = useInfiniteQuery(
		orpc.shelf.collab.activity.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (last) => last.nextCursor ?? undefined,
			input: (cursor: string | undefined) => ({
				ownerUsername,
				shelfSlug,
				limit: 30,
				...(cursor ? { cursor } : {}),
			}),
		}),
	);
	const items = query.data?.pages.flatMap((page) => page.items) ?? [];

	if (query.isPending) {
		return <Skeleton className="h-40 w-full" aria-hidden />;
	}
	if (query.isError) {
		return (
			<p className="text-destructive text-sm" role="alert">
				{query.error.message}
			</p>
		);
	}
	if (items.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">Nothing has happened yet.</p>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			<ul className="divide-y divide-border border border-border">
				{items.map((item) => (
					<li key={item.id} className="flex items-center gap-3 p-3">
						{item.actor ? (
							<UserAvatar user={item.actor} className="size-7" />
						) : null}
						<span className="min-w-0 flex-1 text-sm leading-snug">
							{describeShelfActivity(item)}
						</span>
						<RelativeTime
							date={item.createdAt}
							className="shrink-0 text-muted-foreground text-xs"
						/>
					</li>
				))}
			</ul>
			{query.hasNextPage ? (
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="w-fit"
					disabled={query.isFetchingNextPage}
					onClick={() => void query.fetchNextPage()}
				>
					{query.isFetchingNextPage ? "Loading…" : "Show more"}
				</Button>
			) : null}
		</div>
	);
}
