"use client";

import type {
	GetXpEventListInput,
	GetXpEventListOutput,
} from "@bbrc/api/modules/xp/xp.schema";
import { Badge } from "@bbrc/ui/components/badge";
import { Card, CardContent } from "@bbrc/ui/components/card";
import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { formatDateTime } from "@/lib/format-datetime";
import { orpc } from "@/utils/orpc";

type UserXpEventsListProps = {
	username: GetXpEventListInput["username"];
	initialPage: GetXpEventListOutput;
};

function XpEventsSkeleton() {
	return (
		<div className="flex flex-col gap-3" aria-hidden>
			{Array.from({ length: 4 }, (_, index) => (
				<Skeleton key={index} className="h-28 w-full" />
			))}
		</div>
	);
}

export function UserXpEventsList({
	username,
	initialPage,
}: UserXpEventsListProps) {
	const query = useInfiniteQuery({
		...orpc.xp.getXpEventList.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (lastPage) => lastPage.metadata.nextCursor ?? undefined,
			input: (pageCursor) => ({
				username,
				limit: 20,
				...(pageCursor != null ? { cursor: pageCursor } : {}),
			}),
		}),
		initialData: {
			pages: [initialPage],
			pageParams: [undefined],
		},
	});

	const events = query.data?.pages.flatMap((page) => page.items) ?? [];

	return (
		<section className="flex flex-col gap-3">
			<h2 className="font-semibold text-lg">Events</h2>
			<InfiniteScroll
				className="flex flex-col gap-3"
				hasNextPage={query.hasNextPage}
				isFetchingNextPage={query.isFetchingNextPage}
				fetchNextPage={() => {
					void query.fetchNextPage();
				}}
				isPending={query.isPending}
				isError={query.isError}
				error={query.error}
				onRetry={() => {
					void query.refetch();
				}}
				isEmpty={events.length === 0}
				emptyTitle="No XP events yet"
				emptyDescription="Experience points appear when this member joins activities."
				loadingContent={<XpEventsSkeleton />}
				endMessage="End of XP history."
			>
				<ul className="flex flex-col gap-3">
					{events.map((event) => {
						const sourceHref = event.sourceHref as Route | null;

						return (
							<li key={event.id}>
								<Card size="sm">
									<CardContent className="flex flex-col gap-3">
										<div className="flex flex-wrap items-start justify-between gap-2">
											<div className="flex flex-col gap-1">
												<p className="text-muted-foreground text-xs">
													{formatDateTime(event.createdAt)}
												</p>
												<p className="font-medium text-sm">
													{event.reasonLabel}
												</p>
												{sourceHref ? (
													<Link
														href={sourceHref}
														className="text-muted-foreground text-xs hover:text-foreground hover:underline"
													>
														{event.sourceLabel}
													</Link>
												) : (
													<p className="text-muted-foreground text-xs">
														{event.sourceLabel}
													</p>
												)}
											</div>
											<Badge variant="secondary">+{event.points} XP</Badge>
										</div>
										<p className="text-muted-foreground text-xs tabular-nums">
											<span>{event.xpBefore} XP</span>
											<span aria-hidden="true"> → </span>
											<span className="font-medium text-foreground">
												{event.xpAfter} XP
											</span>
										</p>
									</CardContent>
								</Card>
							</li>
						);
					})}
				</ul>
			</InfiniteScroll>
		</section>
	);
}
