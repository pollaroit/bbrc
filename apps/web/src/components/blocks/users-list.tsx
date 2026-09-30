"use client";

import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import { UserCard } from "@/components/blocks/user-card";
import {
	toUserListCallInput,
	useUserListingSearchParams,
} from "@/lib/listing/users-listing";
import { orpc } from "@/utils/orpc";

const usersGridClassName =
	"grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3";

function UsersListSkeleton() {
	return (
		<div className={usersGridClassName} aria-hidden>
			{Array.from({ length: 6 }, (_, index) => (
				<Skeleton key={index} className="h-36 w-full" />
			))}
		</div>
	);
}

export function UsersList() {
	const [params] = useUserListingSearchParams();
	const listInput = toUserListCallInput(params);

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
		orpc.user.getUserList.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (lastPage) => lastPage.metadata.nextCursor ?? undefined,
			input: (pageCursor) => ({
				...listInput,
				...(pageCursor != null ? { cursor: pageCursor } : {}),
			}),
		}),
	);

	const users = data?.pages.flatMap((page) => page.items) ?? [];

	return (
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
			isEmpty={users.length === 0}
			emptyTitle="No members yet"
			emptyDescription="When people join the club, they will show up here."
			loadingContent={<UsersListSkeleton />}
			endMessage="You have reached the end of the list."
		>
			<ul className={usersGridClassName}>
				{users.map((user) => (
					<li key={user.username} className="min-h-0">
						<UserCard user={user} />
					</li>
				))}
			</ul>
		</InfiniteScroll>
	);
}
