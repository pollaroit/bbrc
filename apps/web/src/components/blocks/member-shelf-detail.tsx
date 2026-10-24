"use client";

import {
	canManageCollaborators,
	reorderPermissionFor,
	resolveShelfPermissions,
} from "@bbrc/shared";
import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import { Input } from "@bbrc/ui/components/input";
import { Label } from "@bbrc/ui/components/label";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
	History,
	ListOrdered,
	LogOut,
	MoreHorizontal,
	Pencil,
	Trash2,
	Users,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { RelativeTime } from "@/components/blocks/relative-time";
import { ResourceShareMenu } from "@/components/blocks/resource-share-menu";
import { ShelfAddBookSearch } from "@/components/blocks/shelf-add-book-search";
import {
	SHELF_DIALOG_TABS,
	ShelfCollaboratorsDialog,
	type ShelfDialogTab,
} from "@/components/blocks/shelf-collaborators-dialog";
import {
	resolveShelfCoverIds,
	ShelfCover,
} from "@/components/blocks/shelf-cover";
import { ShelfDetailBookRow } from "@/components/blocks/shelf-detail-book-row";
import { ShelfInvitationActions } from "@/components/blocks/shelf-invitation-actions";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

type MemberShelfDetailProps = {
	/** Username of the shelf's owner (the address of the shelf). */
	username: string;
	shelfSlug: string;
};

const AVATAR_STACK = 5;

export function MemberShelfDetail({
	username,
	shelfSlug,
}: MemberShelfDetailProps) {
	const router = useRouter();
	const { data: session } = authClient.useSession();
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [leaveOpen, setLeaveOpen] = useState(false);
	const [confirmTitle, setConfirmTitle] = useState("");
	// The open section lives in the address bar, so a reload brings it back.
	const [dialogTab, setDialogTab] = useQueryState(
		"collaborators",
		parseAsStringLiteral(SHELF_DIALOG_TABS),
	);
	const [addedByFilter, setAddedByFilter] = useState<string | null>(null);

	const shelfQuery = useQuery(
		orpc.shelf.getBySlug.queryOptions({
			input: { username, shelfSlug },
		}),
	);

	const deleteMutation = useMutation(
		orpc.shelf.delete.mutationOptions({
			onSuccess: async () => {
				toast.success("Shelf deleted.");
				setDeleteOpen(false);
				await queryClient.invalidateQueries({
					queryKey: orpc.shelf.listByUsername.key(),
				});
				router.push(
					`/users/${session?.user.username ?? username}/shelves` as Route,
				);
				router.refresh();
			},
			onError: (error) => {
				toast.error(error.message ?? "Could not delete shelf.");
			},
		}),
	);

	const leaveMutation = useMutation(
		orpc.shelf.collab.leave.mutationOptions({
			onSuccess: async () => {
				toast.success("You left the shelf.");
				setLeaveOpen(false);
				await queryClient.invalidateQueries({
					queryKey: orpc.shelf.listByUsername.key(),
				});
				router.push(
					`/users/${session?.user.username ?? username}/shelves` as Route,
				);
				router.refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const shelfBooks = shelfQuery.data?.books;
	const onShelfSlugs = useMemo(
		() => new Set(shelfBooks?.map((row) => row.book.slug) ?? []),
		[shelfBooks],
	);

	const contributors = useMemo(() => {
		const counts = new Map<
			string,
			{ username: string; name: string; count: number }
		>();
		for (const row of shelfBooks ?? []) {
			if (!row.addedBy) continue;
			const known = counts.get(row.addedBy.username);
			if (known) {
				known.count += 1;
			} else {
				counts.set(row.addedBy.username, {
					username: row.addedBy.username,
					name: row.addedBy.name,
					count: 1,
				});
			}
		}
		return [...counts.values()].sort((a, b) => b.count - a.count);
	}, [shelfBooks]);

	if (shelfQuery.isPending) {
		return (
			<div className="flex flex-col gap-6">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-24 w-full" />
			</div>
		);
	}

	if (shelfQuery.isError || !shelfQuery.data) {
		return (
			<p className="text-destructive text-sm" role="alert">
				{shelfQuery.error?.message ?? "Shelf not found."}
			</p>
		);
	}

	const shelf = shelfQuery.data;
	const { viewer, owner } = shelf;
	const permissions = resolveShelfPermissions(
		viewer.role === "owner",
		viewer.permissions,
	);
	const can = (permission: Parameters<typeof permissions.has>[0]) =>
		permissions.has(permission);

	const isOwner = viewer.role === "owner";
	const isCollaborator = viewer.role === "collaborator";
	const signedIn = Boolean(session?.user);

	const canEditDetails =
		can("edit_title") ||
		can("edit_description") ||
		can("edit_cover") ||
		can("edit_type") ||
		can("edit_status");
	const canReorder =
		can(reorderPermissionFor(shelf.type)) && shelf.books.length > 1;
	const canSeeActivity = isOwner || canManageCollaborators(permissions);
	const hasMenu =
		canEditDetails ||
		canReorder ||
		can("delete_shelf") ||
		isCollaborator ||
		canSeeActivity ||
		signedIn;

	const needsTitleConfirm = shelf.bookCount > 0;
	const coverIds = resolveShelfCoverIds(
		shelf.coverPreviewCoverIds,
		shelf.books,
	);
	const base = `/users/${username}/shelves/${shelfSlug}`;
	const showAddedBy = contributors.length > 1;
	const activeFilter = contributors.some(
		(person) => person.username === addedByFilter,
	)
		? addedByFilter
		: null;
	const visibleBooks = shelf.books.filter(
		(row) => activeFilter == null || row.addedBy?.username === activeFilter,
	);
	const people = [owner, ...shelf.collaborators];

	function openDialog(tab: ShelfDialogTab) {
		void setDialogTab(tab);
	}

	return (
		<div className="flex flex-col gap-6">
			{viewer.pendingInvitationId ? (
				<div className="flex flex-col gap-3 border border-foreground p-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p className="font-medium text-sm">
							{owner.name} invited you to help with this shelf
						</p>
						<p className="text-muted-foreground text-sm">
							Take a look around, then accept or decline.
						</p>
					</div>
					<ShelfInvitationActions
						invitationId={viewer.pendingInvitationId}
						declineHref={"/shelves" as Route}
						size="sm"
					/>
				</div>
			) : null}

			{isCollaborator ? (
				<p className="flex flex-wrap items-center gap-x-2 gap-y-1 border border-border border-dashed bg-muted/30 px-4 py-3 text-sm">
					<Users className="size-4 shrink-0" aria-hidden />
					<span>
						You collaborate on this shelf. It belongs to{" "}
						<Link
							href={`/users/${owner.username}` as Route}
							className="font-medium underline underline-offset-4"
						>
							{owner.name}
						</Link>
						.
					</span>
				</p>
			) : null}

			{(isOwner || isCollaborator) && shelf.status !== "active" ? (
				<p className="border border-border bg-muted/30 px-4 py-3 text-sm">
					{isOwner && shelf.collaborators.length === 0
						? `Only you can see this shelf while it is ${shelf.status}.`
						: `While it is ${shelf.status}, only the owner and collaborators allowed to see it can open this shelf.`}
				</p>
			) : null}

			<header className="flex items-start gap-4">
				<ShelfCover
					coverIds={coverIds}
					coverImageUrl={shelf.coverImageUrl}
					size="lg"
					className="self-start"
				/>
				<div className="flex min-w-0 flex-1 flex-col gap-2">
					<div className="flex items-start justify-between gap-3">
						<div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
							<h1 className="font-semibold text-xl tracking-tight sm:text-2xl">
								{shelf.title}
							</h1>
							<Badge
								variant={shelf.type === "ordered" ? "secondary" : "outline"}
							>
								{shelf.type === "ordered" ? "Ranked" : "List"}
							</Badge>
						</div>
						<div className="flex shrink-0 divide-x divide-border border border-border">
							{shelf.status === "active" ? (
								<ResourceShareMenu
									path={base}
									shareText={shelf.title}
									label="Share shelf"
									shareInPost={{
										kind: "shelf",
										ownerUsername: username,
										slug: shelfSlug,
									}}
									size="md"
									iconOnly
									triggerClassName="size-8 px-0 text-foreground"
								/>
							) : null}
							{hasMenu ? (
								<DropdownMenu>
									<DropdownMenuTrigger
										render={
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="size-8"
												aria-label="Manage shelf"
											/>
										}
									>
										<MoreHorizontal className="size-4" aria-hidden />
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="min-w-48">
										{canEditDetails ? (
											<DropdownMenuItem
												onClick={() => router.push(`${base}/edit` as Route)}
											>
												<Pencil aria-hidden />
												Edit shelf
											</DropdownMenuItem>
										) : null}
										{canReorder ? (
											<DropdownMenuItem
												onClick={() =>
													router.push(`${base}/edit/order` as Route)
												}
											>
												<ListOrdered aria-hidden />
												Reorder books
											</DropdownMenuItem>
										) : null}
										{signedIn ? (
											<DropdownMenuItem onClick={() => openDialog("people")}>
												<Users aria-hidden />
												Collaborators
											</DropdownMenuItem>
										) : null}
										{canSeeActivity ? (
											<DropdownMenuItem onClick={() => openDialog("activity")}>
												<History aria-hidden />
												Activity
											</DropdownMenuItem>
										) : null}
										{isCollaborator ? (
											<>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													variant="destructive"
													onClick={() => setLeaveOpen(true)}
												>
													<LogOut aria-hidden />
													Leave shelf
												</DropdownMenuItem>
											</>
										) : null}
										{can("delete_shelf") ? (
											<>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													variant="destructive"
													onClick={() => setDeleteOpen(true)}
												>
													<Trash2 aria-hidden />
													Delete shelf
												</DropdownMenuItem>
											</>
										) : null}
									</DropdownMenuContent>
								</DropdownMenu>
							) : null}
						</div>
					</div>
					{shelf.description ? (
						<p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
							{shelf.description}
						</p>
					) : null}

					<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
						<CollaboratorStrip
							people={people}
							ownerName={owner.name}
							collaboratorCount={shelf.collaborators.length}
							onOpen={signedIn ? () => openDialog("people") : undefined}
						/>
						{can("add_collaborator") ? (
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => openDialog("invite")}
							>
								Invite
							</Button>
						) : null}
					</div>

					<p className="text-muted-foreground text-xs tabular-nums">
						{shelf.bookCount} {shelf.bookCount === 1 ? "book" : "books"} ·
						updated{" "}
						<RelativeTime
							date={shelf.updatedAt}
							className="text-muted-foreground text-xs"
						/>
					</p>
				</div>
			</header>

			{can("add_book") ? (
				<ShelfAddBookSearch
					username={username}
					shelfSlug={shelfSlug}
					bookCount={shelf.bookCount}
					onShelfSlugs={onShelfSlugs}
				/>
			) : null}

			{showAddedBy ? (
				<fieldset className="flex flex-wrap items-center gap-2">
					<legend className="sr-only">Filter by who added the book</legend>
					<span className="text-muted-foreground text-sm" aria-hidden>
						Added by
					</span>
					{[
						{ username: null, name: "Everyone", count: shelf.books.length },
						...contributors,
					].map((person) => {
						const active = activeFilter === person.username;
						return (
							<button
								key={person.username ?? "all"}
								type="button"
								aria-pressed={active}
								onClick={() => setAddedByFilter(person.username)}
								className={cn(
									"border px-2.5 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring",
									active
										? "border-foreground bg-foreground text-background"
										: "border-border hover:bg-muted/50",
								)}
							>
								{person.name}
								<span className="ps-1.5 text-xs tabular-nums opacity-70">
									{person.count}
								</span>
							</button>
						);
					})}
				</fieldset>
			) : null}

			{shelf.books.length === 0 ? (
				<div className="border border-border border-dashed px-6 py-10 text-center">
					<p className="font-medium">This shelf is empty</p>
					<p className="mt-1 text-muted-foreground text-sm">
						{can("add_book")
							? "Use the search above to add books from the club library."
							: "No books on this list yet."}
					</p>
					{can("add_book") ? (
						<Button
							className="mt-4"
							render={<Link href={"/books" as Route} />}
							nativeButton={false}
							variant="outline"
						>
							Browse library
						</Button>
					) : null}
				</div>
			) : (
				<ol className="divide-y divide-border border border-border">
					{visibleBooks.map((row) => (
						<li key={row.book.slug}>
							<ShelfDetailBookRow
								username={username}
								shelfSlug={shelfSlug}
								rank={row.position + 1}
								showRank={shelf.type === "ordered"}
								canRemove={can("remove_book")}
								canEditNotes={can("edit_notes")}
								notes={row.notes}
								addedBy={row.addedBy}
								addedAt={row.addedAt}
								bordered={false}
								book={{
									...row.book,
									coverId: row.book.coverId ?? null,
								}}
							/>
						</li>
					))}
				</ol>
			)}

			{signedIn ? (
				<ShelfCollaboratorsDialog
					ownerUsername={username}
					shelfSlug={shelfSlug}
					shelfTitle={shelf.title}
					tab={dialogTab}
					onTabChange={(next) => void setDialogTab(next)}
				/>
			) : null}

			<DestructiveConfirmDialog
				open={leaveOpen}
				onOpenChange={setLeaveOpen}
				title="Leave this shelf?"
				description={`You will no longer be able to edit “${shelf.title}”. Books you added stay on it.`}
				confirmLabel="Leave shelf"
				loading={leaveMutation.isPending}
				onConfirm={() =>
					leaveMutation.mutate({ ownerUsername: username, shelfSlug })
				}
			/>

			<DestructiveConfirmDialog
				open={deleteOpen}
				onOpenChange={(open) => {
					setDeleteOpen(open);
					if (!open) setConfirmTitle("");
				}}
				title="Delete shelf?"
				description={
					needsTitleConfirm ? (
						<>
							This removes{" "}
							<strong className="font-medium text-foreground">
								{shelf.title}
							</strong>{" "}
							and all {shelf.bookCount} books on it
							{shelf.collaborators.length > 0
								? ", for everyone who collaborates on it"
								: ""}
							. Type the shelf title to confirm.
						</>
					) : (
						<>
							Delete{" "}
							<strong className="font-medium text-foreground">
								{shelf.title}
							</strong>
							? This cannot be undone.
						</>
					)
				}
				confirmLabel="Delete shelf"
				loading={deleteMutation.isPending}
				onConfirm={() => {
					if (needsTitleConfirm && confirmTitle.trim() !== shelf.title) {
						toast.error("Type the shelf title exactly to confirm.");
						return;
					}
					deleteMutation.mutate({
						ownerUsername: username,
						shelfSlug,
						confirmTitle: needsTitleConfirm ? confirmTitle : undefined,
					});
				}}
			>
				{needsTitleConfirm ? (
					<div className="grid gap-2 py-2">
						<Label htmlFor="confirm-shelf-title">Shelf title</Label>
						<Input
							id="confirm-shelf-title"
							value={confirmTitle}
							onChange={(e) => setConfirmTitle(e.target.value)}
							autoComplete="off"
						/>
					</div>
				) : null}
			</DestructiveConfirmDialog>
		</div>
	);
}

function CollaboratorStrip({
	people,
	ownerName,
	collaboratorCount,
	onOpen,
}: {
	people: { username: string; name: string; image: string | null }[];
	ownerName: string;
	collaboratorCount: number;
	onOpen?: () => void;
}) {
	const shown = people.slice(0, AVATAR_STACK);
	const extra = people.length - shown.length;
	const label =
		collaboratorCount === 0
			? `By ${ownerName}`
			: `${ownerName} and ${collaboratorCount} ${collaboratorCount === 1 ? "collaborator" : "collaborators"}`;

	const content = (
		<>
			<span className="flex -space-x-1.5" aria-hidden>
				{shown.map((person) => (
					<UserAvatar
						key={person.username}
						user={person}
						className="size-6 ring-2 ring-background"
					/>
				))}
				{extra > 0 ? (
					<span className="z-0 grid size-6 place-items-center bg-muted text-2xs ring-2 ring-background">
						+{extra}
					</span>
				) : null}
			</span>
			<span className="text-sm">{label}</span>
		</>
	);

	if (!onOpen) {
		return <span className="flex items-center gap-2">{content}</span>;
	}

	return (
		<button
			type="button"
			onClick={onOpen}
			className="flex items-center gap-2 text-start underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
			aria-label={`${label}. Open collaborators`}
		>
			{content}
		</button>
	);
}
