"use client";

import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@bbrc/ui/components/tabs";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { MemberProfileShelfCard } from "@/components/blocks/member-profile-shelf-card";
import { SegmentedControl } from "@/components/blocks/segmented-control";
import { ShelfInvitationActions } from "@/components/blocks/shelf-invitation-actions";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { ListingCheckboxList } from "@/components/listing/listing-checkbox-list";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import { authClient } from "@/lib/auth-client";
import {
	filterAndSortShelves,
	hasActiveUserShelfFilters,
	type UserShelfRole,
	userShelfSortByLabels,
	userShelfSortFields,
	userShelfTypeLabels,
	userShelfTypes,
	useUserShelfListingParams,
} from "@/lib/listing/user-shelves-listing";
import { orpc } from "@/utils/orpc";

const ownerStatuses = ["active", "draft", "archived"] as const;

type OwnerStatus = (typeof ownerStatuses)[number];

const statusParser = parseAsStringLiteral(ownerStatuses).withDefault("active");

type UserShelvesListProps = {
	username: string;
};

function newShelfHref(username: string) {
	return `/users/${username}/shelves/new` as Route;
}

export function UserShelvesList({ username }: UserShelvesListProps) {
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const [status, setStatus] = useQueryState("status", statusParser);
	const [params, setParams] = useUserShelfListingParams();

	const isOwner = !sessionPending && session?.user.username === username;

	const invitationsQuery = useQuery({
		...orpc.shelf.collab.myInvitations.queryOptions(),
		enabled: isOwner,
	});

	const listQuery = useQuery(
		orpc.shelf.listByUsername.queryOptions({
			input: {
				username,
				status: isOwner ? status : undefined,
			},
		}),
	);

	if (listQuery.isPending) {
		return (
			<div className="grid gap-3 md:grid-cols-2" aria-hidden>
				{Array.from({ length: 4 }, (_, i) => (
					<Skeleton key={i} className="h-32 w-full" />
				))}
			</div>
		);
	}

	if (listQuery.isError) {
		return (
			<p className="text-destructive text-sm" role="alert">
				{listQuery.error.message ?? "Could not load shelves."}
			</p>
		);
	}

	const { items, isOwner: ownerFromApi } = listQuery.data;
	const showOwnerChrome = isOwner && ownerFromApi;
	const visible = filterAndSortShelves(items, params);
	const sharedCount = items.filter(
		(shelf) => shelf.role === "collaborator",
	).length;
	const invitations = showOwnerChrome
		? (invitationsQuery.data?.items ?? [])
		: [];
	const filtered = hasActiveUserShelfFilters(params);

	return (
		<div className="flex flex-col gap-5">
			{showOwnerChrome ? (
				<div className="flex items-center justify-between gap-3">
					<Tabs
						value={status}
						onValueChange={(value) => {
							void setStatus(value as OwnerStatus);
						}}
					>
						<TabsList variant="line" className="h-auto justify-start">
							<TabsTrigger value="active">Active</TabsTrigger>
							<TabsTrigger value="draft">Draft</TabsTrigger>
							<TabsTrigger value="archived">Archived</TabsTrigger>
						</TabsList>
					</Tabs>
					<Button
						render={<Link href={newShelfHref(username)} />}
						nativeButton={false}
						size="sm"
					>
						<Plus data-icon="inline-start" aria-hidden />
						New shelf
					</Button>
				</div>
			) : null}

			{invitations.length > 0 ? (
				<section
					aria-label="Shelf invitations"
					className="flex flex-col gap-2 border border-foreground p-4"
				>
					<h2 className="font-medium text-sm">
						{invitations.length === 1
							? "You have a shelf invitation"
							: `You have ${invitations.length} shelf invitations`}
					</h2>
					<ul className="divide-y divide-border">
						{invitations.map((invitation) => (
							<li
								key={invitation.id}
								className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
							>
								<span className="flex min-w-0 items-center gap-3">
									<UserAvatar user={invitation.invitedBy} className="size-8" />
									<span className="min-w-0">
										<Link
											href={`/shelf-invitations/${invitation.token}` as Route}
											className="block truncate font-medium text-sm underline-offset-4 hover:underline"
										>
											{invitation.shelfTitle}
										</Link>
										<span className="block truncate text-muted-foreground text-xs">
											From {invitation.invitedBy.name}
										</span>
									</span>
								</span>
								<ShelfInvitationActions
									invitationId={invitation.id}
									declineHref={`/users/${username}/shelves` as Route}
									size="sm"
								/>
							</li>
						))}
					</ul>
				</section>
			) : null}

			{sharedCount > 0 ? (
				<SegmentedControl<UserShelfRole>
					label="Whose shelves"
					value={params.role}
					onChange={(role) => {
						void setParams({ role: role === "all" ? null : role });
					}}
					options={[
						{ id: "all", label: "All", count: items.length },
						{
							id: "owned",
							label: isOwner ? "Mine" : "Created",
							count: items.length - sharedCount,
						},
						{ id: "shared", label: "Collaborating", count: sharedCount },
					]}
				/>
			) : null}

			{items.length > 0 ? (
				<div className="flex flex-col gap-3 md:flex-row md:items-center">
					<ListingSearch
						value={params.search ?? ""}
						onChange={(search) => {
							void setParams({ search });
						}}
						placeholder="Search shelves…"
					/>
					<div className="flex flex-wrap items-center gap-2 md:shrink-0">
						<ListingSort
							sortBy={params.sortBy}
							sortDirection={params.sortDirection}
							onSortByChange={(sortBy) => {
								void setParams({ sortBy });
							}}
							onSortDirectionChange={(sortDirection) => {
								void setParams({ sortDirection });
							}}
							sortByOptions={userShelfSortFields}
							sortByLabels={userShelfSortByLabels}
							appearance="library"
						/>
						<ListingFiltersSheet
							title="Shelf filters"
							description="Show only ranked shelves or plain lists."
							activeFilterCount={params.types?.length ? 1 : 0}
							onClear={() => {
								void setParams({ types: null, role: null });
							}}
							appearance="library"
						>
							<ListingCheckboxList
								legend="Shelf type"
								options={userShelfTypes.map((type) => ({
									id: type,
									label: userShelfTypeLabels[type],
									checked: params.types?.includes(type) ?? false,
									onCheckedChange: (checked) => {
										const current = params.types ?? [];
										const next = checked
											? [...new Set([...current, type])]
											: current.filter((value) => value !== type);
										void setParams({ types: next.length > 0 ? next : null });
									},
								}))}
							/>
						</ListingFiltersSheet>
					</div>
				</div>
			) : null}

			{items.length > 0 ? (
				<p className="text-muted-foreground text-sm tabular-nums">
					{visible.length} {visible.length === 1 ? "shelf" : "shelves"}
					{filtered ? " match your filters" : ""}
				</p>
			) : null}

			{items.length === 0 ? (
				<div className="border border-border border-dashed px-6 py-12 text-center">
					<p className="font-medium">No shelves here yet</p>
					<p className="mt-1 text-muted-foreground text-sm">
						{showOwnerChrome
							? "Create a shelf to group books you want to share or revisit."
							: "This member has not published any shelves."}
					</p>
					{showOwnerChrome ? (
						<Button
							className="mt-4"
							render={<Link href={newShelfHref(username)} />}
							nativeButton={false}
						>
							Create your first shelf
						</Button>
					) : null}
				</div>
			) : visible.length === 0 ? (
				<div className="border border-border border-dashed px-6 py-10 text-center">
					<p className="font-medium">No shelves match these filters</p>
					<p className="mt-1 text-muted-foreground text-sm">
						Try clearing filters or changing your search.
					</p>
				</div>
			) : (
				<ul className="grid gap-3 md:grid-cols-2">
					{visible.map((shelf) => (
						<li key={shelf.id}>
							<MemberProfileShelfCard
								shelf={shelf}
								showStatus={showOwnerChrome}
							/>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
