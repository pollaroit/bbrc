"use client";

import type { ListCollaboratorsOutput } from "@bbrc/api/modules/shelf/shelf-collab.schema";
import {
	canManageCollaborators,
	missingGrants,
	outranks,
	presetIdFor,
	resolveShelfPermissions,
	SHELF_PERMISSION_PRESETS,
	SHELF_PERMISSIONS,
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import { Input } from "@bbrc/ui/components/input";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@bbrc/ui/components/tabs";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import {
	Check,
	Copy,
	Crown,
	KeyRound,
	LogOut,
	MoreHorizontal,
	Search,
	UserMinus,
	UserPlus,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { RelativeTime } from "@/components/blocks/relative-time";
import { ShelfActivityLine } from "@/components/blocks/shelf-activity-line";
import { ShelfPermissionMeter } from "@/components/blocks/shelf-permission-meter";
import { ShelfPermissionPicker } from "@/components/blocks/shelf-permission-picker";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

export const SHELF_DIALOG_TABS = ["people", "invite", "activity"] as const;
export type ShelfDialogTab = (typeof SHELF_DIALOG_TABS)[number];

type ShelfCollaboratorsDialogProps = {
	ownerUsername: string;
	shelfSlug: string;
	shelfTitle: string;
	/** The open section, or null while the dialog is closed (kept in the address bar). */
	tab: ShelfDialogTab | null;
	onTabChange: (tab: ShelfDialogTab | null) => void;
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

export function ShelfCollaboratorsDialog({
	ownerUsername,
	shelfSlug,
	shelfTitle,
	tab,
	onTabChange,
}: ShelfCollaboratorsDialogProps) {
	const open = tab != null;
	const listQuery = useQuery({
		...orpc.shelf.collab.list.queryOptions({
			input: { ownerUsername, shelfSlug },
		}),
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

	const allowed: ShelfDialogTab[] = [
		"people",
		...(canInvite ? (["invite"] as const) : []),
		...(canSeeActivity ? (["activity"] as const) : []),
	];
	// Until the list loads we cannot know what is allowed, so trust the address.
	const active: ShelfDialogTab =
		tab && (listQuery.isPending || allowed.includes(tab)) ? tab : "people";

	const data = listQuery.data;

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => onTabChange(next ? active : null)}
		>
			<DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-3xl">
				<DialogHeader className="gap-1 border-border border-b px-5 pt-5 pb-4 sm:px-6">
					<DialogTitle className="text-lg">Collaborators</DialogTitle>
					<DialogDescription>
						{data ? (
							<>
								“{shelfTitle}” · 1 owner · {data.collaborators.length}{" "}
								{data.collaborators.length === 1
									? "collaborator"
									: "collaborators"}
								{data.invitations.length > 0
									? ` · ${data.invitations.length} waiting`
									: ""}
							</>
						) : (
							<>People who help edit “{shelfTitle}”.</>
						)}
					</DialogDescription>
				</DialogHeader>

				<Tabs
					value={active}
					onValueChange={(value) => onTabChange(value as ShelfDialogTab)}
					className="gap-0"
				>
					<TabsList
						variant="line"
						className="h-auto w-full justify-start border-border border-b px-3"
					>
						<TabsTrigger value="people" className="flex-none px-3 py-2.5">
							People
						</TabsTrigger>
						{canInvite ? (
							<TabsTrigger value="invite" className="flex-none px-3 py-2.5">
								Invite
							</TabsTrigger>
						) : null}
						{canSeeActivity ? (
							<TabsTrigger value="activity" className="flex-none px-3 py-2.5">
								Activity
							</TabsTrigger>
						) : null}
					</TabsList>
				</Tabs>

				<div className="px-5 py-5 sm:px-6">
					{listQuery.isPending ? (
						<Skeleton className="h-48 w-full" aria-hidden />
					) : listQuery.isError || !data ? (
						<p className="text-destructive text-sm" role="alert">
							{listQuery.error?.message ?? "Could not load collaborators."}
						</p>
					) : active === "people" ? (
						<PeopleTab
							data={data}
							permissions={permissions}
							ownerUsername={ownerUsername}
							shelfSlug={shelfSlug}
							shelfTitle={shelfTitle}
							onClose={() => onTabChange(null)}
						/>
					) : active === "invite" ? (
						<InviteTab
							ownerUsername={ownerUsername}
							shelfSlug={shelfSlug}
							permissions={permissions}
							onDone={() => onTabChange("people")}
						/>
					) : (
						<ActivityTab ownerUsername={ownerUsername} shelfSlug={shelfSlug} />
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

function PersonLink({
	person,
	className,
}: {
	person: { username: string; name: string };
	className?: string;
}) {
	return (
		<Link
			href={`/users/${person.username}` as Route}
			className={
				className ??
				"truncate font-medium text-sm underline-offset-4 hover:underline"
			}
		>
			{person.name}
		</Link>
	);
}

function PeopleTab({
	data,
	permissions,
	ownerUsername,
	shelfSlug,
	shelfTitle,
	onClose,
}: {
	data: ListCollaboratorsOutput;
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
		<div className="flex flex-col gap-7">
			<section className="flex items-center gap-4 border border-foreground bg-muted/30 p-4">
				<UserAvatar user={data.owner} className="size-12" />
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<div className="flex flex-wrap items-center gap-2">
						<PersonLink
							person={data.owner}
							className="truncate font-semibold underline-offset-4 hover:underline"
						/>
						<Badge variant="default" className="gap-1">
							<Crown aria-hidden />
							Owner
						</Badge>
					</div>
					<span className="truncate text-muted-foreground text-xs">
						@{data.owner.username} · full control of the shelf
					</span>
				</div>
				<ShelfPermissionMeter
					permissions={SHELF_PERMISSIONS}
					className="hidden sm:flex"
				/>
			</section>

			<section className="flex flex-col gap-3">
				<h3 className="font-medium text-sm">
					Collaborators
					<span className="ps-2 font-normal text-muted-foreground tabular-nums">
						{data.collaborators.length}
					</span>
				</h3>

				{data.collaborators.length === 0 ? (
					<p className="border border-border border-dashed p-5 text-center text-muted-foreground text-sm">
						Nobody yet. Invite someone to build this shelf together.
					</p>
				) : (
					<ul className="flex flex-col gap-2">
						{data.collaborators.map((person) => {
							const isMe = person.username === me;
							const visible = person.permissions.length > 0;
							const outranked =
								visible && !outranks(permissions, person.permissions);
							const rowEditing = editing === person.username;
							const canChange = canEdit && !isMe && visible && !outranked;
							const canTakeOut = canRemove && !isMe && visible && !outranked;
							const hasMenu = canChange || canTakeOut || isOwner;
							return (
								<li
									key={person.username}
									className="flex flex-col border border-border"
								>
									<div className="flex flex-wrap items-center gap-x-4 gap-y-3 p-3">
										<UserAvatar user={person} className="size-10" />
										<div className="flex min-w-0 flex-1 flex-col gap-0.5">
											<div className="flex flex-wrap items-center gap-2">
												<PersonLink person={person} />
												{isMe ? (
													<span className="text-muted-foreground text-xs">
														you
													</span>
												) : null}
												{visible ? (
													<Badge variant="outline">
														{presetLabel(person.permissions)}
													</Badge>
												) : null}
											</div>
											<span className="truncate text-muted-foreground text-xs">
												@{person.username} · joined{" "}
												<RelativeTime
													date={person.joinedAt}
													className="text-muted-foreground text-xs"
												/>
												{person.invitedBy
													? ` · invited by ${person.invitedBy.name}`
													: ""}
											</span>
										</div>
										{visible ? (
											<ShelfPermissionMeter permissions={person.permissions} />
										) : null}
										<div className="flex items-center gap-1">
											{isMe ? (
												<Button
													type="button"
													size="sm"
													variant="outline"
													onClick={() => setLeaving(true)}
												>
													<LogOut data-icon="inline-start" aria-hidden />
													Leave
												</Button>
											) : null}
											{hasMenu ? (
												<DropdownMenu>
													<DropdownMenuTrigger
														render={
															<Button
																type="button"
																variant="ghost"
																size="icon-sm"
																aria-label={`Actions for ${person.name}`}
															/>
														}
													>
														<MoreHorizontal className="size-4" aria-hidden />
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end" className="min-w-48">
														{canChange ? (
															<DropdownMenuItem
																onClick={() => {
																	setEditing(
																		rowEditing ? null : person.username,
																	);
																	setDraft(person.permissions);
																}}
															>
																<KeyRound aria-hidden />
																Change permissions
															</DropdownMenuItem>
														) : null}
														{isOwner ? (
															<DropdownMenuItem
																onClick={() => setTransferTo(person.username)}
															>
																<Crown aria-hidden />
																Make owner
															</DropdownMenuItem>
														) : null}
														{canTakeOut ? (
															<>
																<DropdownMenuSeparator />
																<DropdownMenuItem
																	variant="destructive"
																	onClick={() => setRemoving(person.username)}
																>
																	<UserMinus aria-hidden />
																	Remove from shelf
																</DropdownMenuItem>
															</>
														) : null}
													</DropdownMenuContent>
												</DropdownMenu>
											) : null}
										</div>
									</div>

									{rowEditing ? (
										<div className="flex flex-col gap-4 border-border border-t bg-muted/20 p-4">
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
					</ul>
				)}
			</section>

			{data.invitations.length > 0 ? (
				<section className="flex flex-col gap-3">
					<h3 className="font-medium text-sm">
						Waiting for an answer
						<span className="ps-2 font-normal text-muted-foreground tabular-nums">
							{data.invitations.length}
						</span>
					</h3>
					<ul className="flex flex-col gap-2">
						{data.invitations.map((invitation) => (
							<li
								key={invitation.id}
								className="flex flex-wrap items-center gap-x-4 gap-y-3 border border-border border-dashed p-3"
							>
								<UserAvatar user={invitation.invitee} className="size-9" />
								<div className="flex min-w-0 flex-1 flex-col gap-0.5">
									<div className="flex flex-wrap items-center gap-2">
										<PersonLink person={invitation.invitee} />
										<Badge variant="outline">
											{presetLabel(invitation.permissions)}
										</Badge>
									</div>
									<span className="truncate text-muted-foreground text-xs">
										Invited by {invitation.invitedBy.name} · expires{" "}
										<RelativeTime
											date={invitation.expiresAt}
											className="text-muted-foreground text-xs"
										/>
									</span>
								</div>
								<ShelfPermissionMeter permissions={invitation.permissions} />
								<div className="flex gap-1">
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
								</div>
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
	onDone,
}: {
	ownerUsername: string;
	shelfSlug: string;
	permissions: ReadonlySet<ShelfPermission>;
	onDone: () => void;
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
				<div className="flex flex-col gap-1 border border-foreground p-4">
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
					<Button type="button" variant="ghost" onClick={onDone}>
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
					<UserAvatar user={picked} className="size-10" />
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
									<UserAvatar user={person} className="size-9" />
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
						<span className="min-w-0 flex-1">
							<ShelfActivityLine item={item} />
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
