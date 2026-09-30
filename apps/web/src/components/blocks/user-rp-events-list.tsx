"use client";

import type {
	GetRpEventListInput,
	GetRpEventListOutput,
} from "@bbrc/api/modules/rp/rp.schema";
import { Badge } from "@bbrc/ui/components/badge";
import { Card, CardContent } from "@bbrc/ui/components/card";
import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { formatDateTime } from "@/lib/format-datetime";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type UserRpEventsListProps = {
	username: GetRpEventListInput["username"];
	initialPage: GetRpEventListOutput;
};

function RpEventsSkeleton() {
	return (
		<div className="flex flex-col gap-3" aria-hidden>
			{Array.from({ length: 4 }, (_, index) => (
				<Skeleton key={index} className="h-28 w-full" />
			))}
		</div>
	);
}

export function UserRpEventsList({
	username,
	initialPage,
}: UserRpEventsListProps) {
	const query = useInfiniteQuery({
		...orpc.rp.getRpEventList.infiniteOptions({
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
				emptyTitle="No RP events yet"
				emptyDescription="Reading points appear when sittings finish."
				loadingContent={<RpEventsSkeleton />}
				endMessage="End of RP history."
			>
				<ul className="flex flex-col gap-3">
					{events.map((event) => {
						const sittingHref = `/sittings/${event.sittingSlug}` as Route;
						const deltaLabel =
							event.points > 0 ? `+${event.points}` : `${event.points}`;

						return (
							<li key={event.id}>
								<Card size="sm">
									<CardContent className="flex flex-col gap-3">
										<div className="flex flex-wrap items-start justify-between gap-2">
											<div className="flex flex-col gap-1">
												<p className="text-muted-foreground text-xs">
													{formatDateTime(event.createdAt)}
												</p>
												<Link
													href={sittingHref}
													className="font-medium text-sm hover:underline"
												>
													Sitting {event.sittingSlug}
												</Link>
												{event.sittingTitle ? (
													<p className="text-muted-foreground text-xs">
														{event.sittingTitle}
													</p>
												) : null}
											</div>
											<Badge
												variant={
													event.points >= 0 ? "secondary" : "destructive"
												}
											>
												{deltaLabel} RP
											</Badge>
										</div>
										<p className="text-muted-foreground text-xs tabular-nums">
											<span>{event.rpBefore} RP</span>
											<span aria-hidden="true"> → </span>
											<span className={cn("font-medium text-foreground")}>
												{event.rpAfter} RP
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
