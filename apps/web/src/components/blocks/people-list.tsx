"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@bbrc/ui/components/empty";
import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import { PeopleCard } from "@/components/blocks/people-card";
import { authClient } from "@/lib/auth-client";
import { useFormatters } from "@/lib/i18n/use-formatters";
import {
	clearPeopleSheetFilters,
	countPeopleSheetFilters,
	toPeopleListCallInput,
	usePeopleListingSearchParams,
} from "@/lib/listing/people-listing";
import { orpc } from "@/utils/orpc";

const peopleGridClassName =
	"grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

function PeopleListSkeleton() {
	return (
		<div className={peopleGridClassName} aria-hidden>
			{Array.from({ length: 6 }, (_, index) => (
				<Skeleton key={index} className="h-44 w-full" />
			))}
		</div>
	);
}

export function PeopleList() {
	const f = useFormatters();
	const [params, setParams] = usePeopleListingSearchParams();
	const { data: session } = authClient.useSession();
	const listInput = toPeopleListCallInput(params);
	const narrowed =
		countPeopleSheetFilters(params) > 0 || Boolean(params.search?.trim());

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
		orpc.people.list.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (lastPage) => lastPage.metadata.nextCursor ?? undefined,
			input: (pageCursor) => ({
				...listInput,
				...(pageCursor != null ? { cursor: pageCursor } : {}),
			}),
		}),
	);

	const people = data?.pages.flatMap((page) => page.items) ?? [];
	const total = data?.pages[0]?.total;
	const countLabel =
		total == null
			? null
			: total === 1
				? "1 person"
				: `${f.number(total)} people`;

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
			isEmpty={people.length === 0}
			emptyContent={
				<Empty>
					<EmptyHeader>
						<EmptyTitle>
							{narrowed ? "No one matches" : "No people yet"}
						</EmptyTitle>
						<EmptyDescription>
							{narrowed
								? "Try removing a filter or searching for something else."
								: "When people join the club, they will show up here."}
						</EmptyDescription>
					</EmptyHeader>
					{narrowed ? (
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								clearPeopleSheetFilters(setParams);
								void setParams({ search: null });
							}}
						>
							Clear filters
						</Button>
					) : null}
				</Empty>
			}
			loadingContent={<PeopleListSkeleton />}
			endMessage="You have reached the end of the list."
		>
			{isPending && total == null ? (
				<Skeleton className="h-5 w-24" aria-hidden />
			) : countLabel ? (
				<p className="border-border border-b pb-2 font-medium text-muted-foreground text-sm tabular-nums">
					{countLabel}
				</p>
			) : null}
			<ul className={peopleGridClassName}>
				{people.map((person) => (
					<li key={person.username} className="min-h-0">
						<PeopleCard
							person={person}
							isViewer={session?.user?.id === person.id}
							sortBy={params.sortBy}
						/>
					</li>
				))}
			</ul>
		</InfiniteScroll>
	);
}
