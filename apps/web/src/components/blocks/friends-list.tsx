"use client";

import { Button } from "@bbrc/ui/components/button";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@bbrc/ui/components/empty";
import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { useId } from "react";
import { PeopleCard } from "@/components/blocks/people-card";
import { ListingSearch } from "@/components/listing/listing-search";
import { authClient } from "@/lib/auth-client";
import {
	toFriendsListCallInput,
	useFriendsListingSearchParams,
} from "@/lib/listing/friends-listing";
import { orpc } from "@/utils/orpc";

const gridClassName = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

function FriendsListSkeleton() {
	return (
		<div className={gridClassName} aria-hidden>
			{Array.from({ length: 6 }, (_, index) => (
				<Skeleton key={index} className="h-44 w-full" />
			))}
		</div>
	);
}

type FriendsListProps = {
	/** Whose friends; leave out for your own list. */
	username?: string;
	/** Their name, for the closed-list message. */
	name?: string;
	/** Your own list: "only mutual" means nothing there. */
	isOwn?: boolean;
};

/**
 * A member's friends as people cards, with a search and an "only mutual friends"
 * filter. The owner, their friends and admins see the list; everyone else sees the
 * count. Same cards and paging as the people list.
 */
export function FriendsList({
	username,
	name = "this member",
	isOwn = false,
}: FriendsListProps) {
	const mutualId = useId();
	const [params, setParams] = useFriendsListingSearchParams();
	const { data: session } = authClient.useSession();
	const listInput = toFriendsListCallInput(params, username);
	const narrowed = Boolean(params.search?.trim()) || params.mutual;

	const {
		data,
		error,
		fetchNextPage,
		hasNextPage,
		isError,
		isFetchingNextPage,
		isPending,
		refetch,
	} = useInfiniteQuery(
		orpc.friend.list.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (lastPage) => lastPage.metadata.nextCursor ?? undefined,
			input: (pageCursor) => ({
				...listInput,
				...(pageCursor != null ? { cursor: pageCursor } : {}),
			}),
		}),
	);

	const first = data?.pages[0];
	const people = data?.pages.flatMap((page) => page.items) ?? [];

	if (first && !first.visible) {
		return (
			<div className="flex flex-col items-center gap-2 border border-border border-dashed px-6 py-12 text-center">
				<Lock className="size-5 text-muted-foreground" aria-hidden />
				<p className="font-medium text-sm tabular-nums">
					{first.count} {first.count === 1 ? "friend" : "friends"}
				</p>
				<p className="max-w-sm text-muted-foreground text-sm">
					Only {name}'s friends can see who they are.
				</p>
			</div>
		);
	}

	const total = first?.total;
	const countLabel =
		total == null
			? null
			: total === 1
				? "1 friend"
				: `${total.toLocaleString()} friends`;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3 md:flex-row md:items-center">
				<ListingSearch
					value={params.search ?? ""}
					onChange={(search) => {
						void setParams({ search });
					}}
					placeholder="Search by name or username…"
				/>
				{!isOwn && session?.user ? (
					<label
						htmlFor={mutualId}
						className="flex h-9 shrink-0 cursor-pointer items-center gap-2 border border-border px-3 text-sm"
					>
						<Checkbox
							id={mutualId}
							checked={params.mutual}
							onCheckedChange={(checked) => {
								void setParams({ mutual: checked === true ? true : null });
							}}
						/>
						Only mutual friends
					</label>
				) : null}
			</div>

			<InfiniteScroll
				className="flex flex-col gap-3"
				hasNextPage={hasNextPage}
				isFetchingNextPage={isFetchingNextPage}
				fetchNextPage={() => {
					void fetchNextPage();
				}}
				isPending={isPending}
				isError={isError}
				error={error}
				onRetry={() => {
					void refetch();
				}}
				isEmpty={people.length === 0}
				emptyContent={
					<Empty>
						<EmptyHeader>
							<EmptyTitle>
								{narrowed ? "No friends match" : "No friends yet"}
							</EmptyTitle>
							<EmptyDescription>
								{narrowed
									? "Try another search, or turn off the mutual filter."
									: isOwn
										? "Open a member's profile and choose Add friend. They have to accept."
										: `${name} has no friends yet.`}
							</EmptyDescription>
						</EmptyHeader>
						{narrowed ? (
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									void setParams({ search: null, mutual: null });
								}}
							>
								Clear filters
							</Button>
						) : null}
					</Empty>
				}
				loadingContent={<FriendsListSkeleton />}
				endMessage="You have reached the end of the list."
			>
				{isPending && total == null ? (
					<Skeleton className="h-5 w-24" aria-hidden />
				) : countLabel ? (
					<p className="border-border border-b pb-2 font-medium text-muted-foreground text-sm tabular-nums">
						{countLabel}
					</p>
				) : null}
				<ul className={gridClassName}>
					{people.map((person) => (
						<li key={person.username} className="min-h-0">
							<PeopleCard
								person={person}
								isViewer={session?.user?.id === person.id}
							/>
						</li>
					))}
				</ul>
			</InfiniteScroll>
		</div>
	);
}
