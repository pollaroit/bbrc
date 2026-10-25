"use client";

/**
 * `DiscoverPanel({ isAdmin, onPick, onRequest?, pendingOlids?, inCatalogOlids?, className? })`
 *
 * Suggestions in lanes, each saying why a book is suggested. Admins see
 * "Members want this", "Next in a series", "Authors the club rates highly",
 * "Fills a gap" and "Ask AI"; members see "Suggested for you" and "Ask AI".
 * Only the open lane is fetched (some ask Open Library on the server and can be
 * slow); the others load when their tab is opened. The AI lane runs only when
 * someone presses "Ask AI".
 *
 * - `onPick(item)`: admin pressed "Add" (open the add form for `item.olid`).
 * - `onRequest(item)`: member pressed "Request" (falls back to `onPick`).
 * - `pendingOlids`: Open Library ids that already have a pending request
 *   (a member sees "Requested" instead of the button).
 * - `inCatalogOlids`: ids already in the library; those items are hidden.
 */

import type {
	DiscoverItem,
	DiscoverLane,
	DiscoverLaneId,
} from "@bbrc/api/modules/book-discover/book-discover.schema";
import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { Plus, RefreshCw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import {
	formatAuthors,
	MeTooButton,
	RequestCover,
} from "@/components/blocks/book-requests/request-shared";
import { SegmentedControl } from "@/components/blocks/segmented-control";
import { cn } from "@/lib/utils";
import { client, orpc } from "@/utils/orpc";

type DiscoverPanelProps = {
	isAdmin: boolean;
	onPick: (item: DiscoverItem) => void;
	onRequest?: (item: DiscoverItem) => void;
	pendingOlids?: ReadonlySet<string>;
	inCatalogOlids?: ReadonlySet<string>;
	className?: string;
};

function LaneSkeleton() {
	return (
		<div className="flex flex-col gap-2" aria-hidden>
			{Array.from({ length: 3 }, (_, index) => (
				<Skeleton key={index} className="h-24 w-full" />
			))}
		</div>
	);
}

function ItemCard({
	item,
	laneId,
	isAdmin,
	requested,
	onPick,
	onRequest,
	meToo,
}: {
	item: DiscoverItem;
	laneId: DiscoverLaneId;
	isAdmin: boolean;
	requested: boolean;
	onPick: (item: DiscoverItem) => void;
	onRequest?: (item: DiscoverItem) => void;
	meToo: { active: boolean; mine: boolean } | null;
}) {
	return (
		<li className="flex gap-3 border border-border bg-card p-3">
			<RequestCover coverId={item.coverId} title={item.title} />
			<div className="flex min-w-0 flex-1 flex-col gap-2">
				<div className="flex flex-col gap-0.5">
					<p className="text-pretty text-sm leading-snug">{item.reason}</p>
					<p className="font-medium text-sm leading-snug">{item.title}</p>
					<p className="text-muted-foreground text-xs">
						{formatAuthors(item.authors)}
						{item.publishedIn ? ` · ${item.publishedIn}` : ""}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{laneId === "member_wants" && item.request && meToo && !meToo.mine ? (
						<MeTooButton
							requestId={item.request.id}
							active={meToo.active}
							count={item.request.upvoteCount}
						/>
					) : null}
					{isAdmin ? (
						<Button type="button" size="sm" onClick={() => onPick(item)}>
							<Plus data-icon="inline-start" aria-hidden />
							Add
						</Button>
					) : requested ? (
						<span className="border border-border px-2 py-1 text-muted-foreground text-xs">
							Requested
						</span>
					) : (
						<Button
							type="button"
							size="sm"
							onClick={() => (onRequest ?? onPick)(item)}
						>
							<Plus data-icon="inline-start" aria-hidden />
							Request
						</Button>
					)}
				</div>
			</div>
		</li>
	);
}

function LaneItems({
	lane,
	isAdmin,
	onPick,
	onRequest,
	pendingOlids,
	inCatalogOlids,
}: {
	lane: DiscoverLane;
} & Omit<DiscoverPanelProps, "className">) {
	// Only the "members want this" lane needs to know who already said "me too".
	const board = useQuery({
		...orpc.bookRequest.listOpen.queryOptions(),
		enabled: lane.id === "member_wants",
	});
	const byRequest = useMemo(
		() => new Map((board.data?.items ?? []).map((row) => [row.id, row])),
		[board.data],
	);

	const items = lane.items.filter((item) => !inCatalogOlids?.has(item.olid));
	if (items.length === 0) {
		return (
			<p className="border border-border border-dashed p-4 text-muted-foreground text-sm">
				{lane.empty ?? "Nothing to suggest right now."}
			</p>
		);
	}
	return (
		<ul className="flex flex-col gap-2">
			{items.map((item) => {
				const row = item.request ? byRequest.get(item.request.id) : undefined;
				return (
					<ItemCard
						key={item.olid}
						item={item}
						laneId={lane.id}
						isAdmin={isAdmin}
						requested={Boolean(pendingOlids?.has(item.olid))}
						onPick={onPick}
						onRequest={onRequest}
						meToo={row ? { active: row.viewerUpvoted, mine: row.isMine } : null}
					/>
				);
			})}
		</ul>
	);
}

function AiLane({ isAdmin, ...rest }: Omit<DiscoverPanelProps, "className">) {
	const [lane, setLane] = useState<DiscoverLane | null>(null);

	const ask = useMutation({
		mutationFn: (refresh: boolean) =>
			client.bookDiscover.lane({ id: "ai", refresh }),
		onSuccess: setLane,
	});

	const asksLeft = lane?.asksLeft ?? null;
	const limited = asksLeft != null && asksLeft <= 0;

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-col gap-2 border border-border bg-muted/20 p-3">
				<p className="flex items-center gap-2 font-medium text-sm">
					<Sparkles className="size-4" aria-hidden />
					Ask AI for a short list
				</p>
				<p className="text-muted-foreground text-xs leading-relaxed">
					We send a short summary of what {isAdmin ? "the club" : "you"} reads
					and rates (top authors, subjects, countries and a few best-loved
					titles), never the whole catalog. Every suggestion is checked against
					Open Library before you see it.
				</p>
				<div className="flex flex-wrap items-center gap-2">
					<Button
						type="button"
						size="sm"
						disabled={ask.isPending || limited}
						onClick={() => ask.mutate(lane != null)}
					>
						{lane ? (
							<RefreshCw data-icon="inline-start" aria-hidden />
						) : (
							<Sparkles data-icon="inline-start" aria-hidden />
						)}
						{lane ? "Ask again" : "Ask AI"}
					</Button>
					{asksLeft != null ? (
						<span className="text-muted-foreground text-xs tabular-nums">
							{asksLeft} {asksLeft === 1 ? "ask" : "asks"} left today
						</span>
					) : null}
				</div>
			</div>

			{ask.isPending ? (
				<div className="flex flex-col gap-2">
					<p className="text-muted-foreground text-sm" role="status">
						Checking suggestions against Open Library…
					</p>
					<LaneSkeleton />
				</div>
			) : ask.isError ? (
				<p className="border border-destructive/40 bg-destructive/5 p-3 text-destructive text-sm">
					{ask.error.message}
				</p>
			) : lane ? (
				<LaneItems lane={lane} isAdmin={isAdmin} {...rest} />
			) : null}
		</div>
	);
}

export function DiscoverPanel({
	isAdmin,
	onPick,
	onRequest,
	pendingOlids,
	inCatalogOlids,
	className,
}: DiscoverPanelProps) {
	const lanesQuery = useQuery(orpc.bookDiscover.lanes.queryOptions());
	const lanes = lanesQuery.data?.lanes ?? [];
	const [chosen, setChosen] = useState<DiscoverLaneId | null>(null);

	const activeId =
		chosen && lanes.some((lane) => lane.id === chosen)
			? chosen
			: (lanes[0]?.id as DiscoverLaneId | undefined);

	// Only the lane being looked at is fetched. Several lanes ask Open Library
	// on the server and can be slow; loading them all at once would fill the
	// few connections a browser keeps open to the site and freeze the page
	// (header links, search and buttons would all wait behind them). Other lanes
	// load when their tab is opened, and show a count once they have been seen.
	const loaded = useQueries({
		queries: lanes
			.filter((lane) => !lane.onDemand)
			.map((lane) => ({
				...orpc.bookDiscover.lane.queryOptions({ input: { id: lane.id } }),
				enabled: lane.id === activeId,
				staleTime: 5 * 60_000,
				retry: false,
				refetchOnWindowFocus: false,
			})),
	});
	const byId = new Map(
		lanes
			.filter((lane) => !lane.onDemand)
			.map((lane, index) => [lane.id, loaded[index]] as const),
	);

	if (lanesQuery.isPending) {
		return (
			<div className={className}>
				<LaneSkeleton />
			</div>
		);
	}
	if (lanes.length === 0) return null;

	const active = lanes.find((lane) => lane.id === activeId);
	const activeQuery = activeId ? byId.get(activeId) : undefined;

	return (
		<section
			className={cn("flex flex-col gap-3", className)}
			aria-label="Book suggestions"
		>
			<div className="overflow-x-auto [scrollbar-width:none]">
				<SegmentedControl<DiscoverLaneId>
					label="Suggestion lanes"
					value={activeId as DiscoverLaneId}
					onChange={setChosen}
					options={lanes.map((lane) => {
						const lane_ = byId.get(lane.id)?.data;
						return {
							id: lane.id,
							label: lane.title,
							count: lane_ ? lane_.items.length : undefined,
						};
					})}
				/>
			</div>
			{active ? (
				<p className="text-muted-foreground text-xs">{active.description}</p>
			) : null}

			{activeId === "ai" ? (
				<AiLane
					isAdmin={isAdmin}
					onPick={onPick}
					onRequest={onRequest}
					pendingOlids={pendingOlids}
					inCatalogOlids={inCatalogOlids}
				/>
			) : activeQuery?.isPending ? (
				<LaneSkeleton />
			) : activeQuery?.isError ? (
				<p className="text-destructive text-sm">
					Could not load this lane. Try again in a moment.
				</p>
			) : activeQuery?.data ? (
				<LaneItems
					lane={activeQuery.data}
					isAdmin={isAdmin}
					onPick={onPick}
					onRequest={onRequest}
					pendingOlids={pendingOlids}
					inCatalogOlids={inCatalogOlids}
				/>
			) : null}
		</section>
	);
}
