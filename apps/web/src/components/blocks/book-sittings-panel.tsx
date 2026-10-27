"use client";

import type {
	BookSittingItem,
	GetBookSittingsOutput,
	GetMyBookSittingMarksOutput,
} from "@bbrc/api/modules/book/book-sittings.schema";
import type { Formatters } from "@bbrc/i18n";
import { Button } from "@bbrc/ui/components/button";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@bbrc/ui/components/empty";
import { Label } from "@bbrc/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@bbrc/ui/components/select";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Image from "next/image";
import {
	parseAsArrayOf,
	parseAsBoolean,
	parseAsInteger,
	parseAsStringLiteral,
	useQueryStates,
} from "nuqs";
import { useEffect, useMemo, useState } from "react";
import { ClubDateTime } from "@/components/blocks/club-date-time";
import { SittingStatusBadge } from "@/components/blocks/sitting-status-badge";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import {
	BOOK_SITTING_OUTCOME_LABELS,
	BOOK_SITTING_OUTCOMES,
	BOOK_SITTING_SORT_LABELS,
	BOOK_SITTING_SORTS,
	BOOK_SITTING_STATUS_LABELS,
	BOOK_SITTING_STATUSES,
	filterAndSortBookSittings,
	ordinal,
} from "@/lib/book-sittings";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type BookSittingsPanelProps = {
	bookSlug: string;
	initialData: GetBookSittingsOutput;
};

type Mark = GetMyBookSittingMarksOutput[number] | undefined;
type Marks = Map<string, NonNullable<Mark>>;

/** The filter bar only earns its space once there is something to narrow down. */
const FILTER_BAR_MIN_ITEMS = 4;
const RANKING_PREVIEW = 3;

const progressLabels = {
	not_started: "Not started",
	in_progress: "Reading",
	completed: "Finished",
	dnf: "Did not finish",
} as const;

const progressBarClass = {
	completed: "bg-success",
	in_progress: "bg-primary",
	not_started: "bg-warning",
	dnf: "bg-destructive",
} as const;

const progressOrder = [
	"completed",
	"in_progress",
	"not_started",
	"dnf",
] as const;

function plural(count: number, one: string, many = `${one}s`): string {
	return `${count} ${count === 1 ? one : many}`;
}

function formatDate(f: Formatters, iso: string): string {
	return f.dateWith(iso, {
		month: "short",
		day: "numeric",
		year: "numeric",
		timeZone: "UTC",
	});
}

function SummaryStat({
	label,
	value,
	hint,
}: {
	label: string;
	value: string;
	hint?: string;
}) {
	return (
		<div className="flex flex-col gap-0.5 border border-border bg-muted/5 p-3">
			<span className="text-muted-foreground text-xs">{label}</span>
			<span className="font-semibold text-xl tabular-nums">{value}</span>
			{hint ? (
				<span className="text-muted-foreground text-xs">{hint}</span>
			) : null}
		</div>
	);
}

function Cover({
	coverId,
	title,
	className,
}: {
	coverId: number | null;
	title: string;
	className?: string;
}) {
	const src = bookCoverUrl(coverId, "S");
	return (
		<span
			className={cn(
				"relative block aspect-2/3 w-8 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10",
				className,
			)}
		>
			{src ? (
				<Image
					src={src}
					alt={title}
					fill
					className="object-cover"
					sizes="40px"
				/>
			) : null}
		</span>
	);
}

function ViewerMarks({ mark }: { mark: Mark }) {
	if (!mark) {
		return null;
	}
	const parts: string[] = [];
	if (mark.myPoints != null) {
		parts.push(`You gave it ${plural(mark.myPoints, "point")}`);
	} else if (mark.voted) {
		parts.push("You voted for other books");
	}
	if (mark.myProgress) {
		parts.push(`You: ${progressLabels[mark.myProgress].toLowerCase()}`);
	}
	if (parts.length === 0) {
		return null;
	}
	return (
		<span className="border border-primary/40 bg-primary/5 px-1.5 py-0.5 text-xs">
			{parts.join(" · ")}
		</span>
	);
}

function Ranking({ item }: { item: BookSittingItem }) {
	const [expanded, setExpanded] = useState(false);
	if (item.ranking.length === 0) {
		return null;
	}

	const top = item.ranking.slice(0, RANKING_PREVIEW);
	const own = item.ranking.find((row) => row.isThisBook);
	const preview =
		own && !top.some((row) => row.isThisBook) ? [...top, own] : top;
	const rows = expanded ? item.ranking : preview;

	return (
		<div className="flex flex-col gap-2">
			<ol className="flex flex-col border border-border">
				{rows.map((row) => (
					<li
						key={row.slug}
						className={cn(
							"flex items-center gap-3 border-border border-b p-2 last:border-b-0",
							row.isThisBook && "bg-muted/40",
						)}
					>
						<span className="w-8 shrink-0 text-center text-muted-foreground text-sm tabular-nums">
							{ordinal(row.place)}
						</span>
						<Cover coverId={row.coverId} title={row.title} />
						<span className="min-w-0 flex-1">
							<Link
								href={`/books/${row.slug}` as Route}
								className="block truncate font-medium text-sm hover:underline"
							>
								{row.title}
							</Link>
							<span className="block truncate text-muted-foreground text-xs">
								{formatBookAuthors(row.authors)}
							</span>
						</span>
						<span className="flex shrink-0 flex-col items-end gap-0.5 text-xs">
							<span className="tabular-nums">
								{plural(row.points, "point")}
							</span>
							{row.isPicked ? (
								<span className="text-success">Picked</span>
							) : row.isThisBook ? (
								<span className="text-muted-foreground">This book</span>
							) : null}
						</span>
					</li>
				))}
			</ol>
			{item.ranking.length > preview.length ? (
				<Button
					variant="ghost"
					size="sm"
					className="self-start"
					onClick={() => setExpanded((value) => !value)}
				>
					{expanded ? "Show fewer" : `Show all ${item.ranking.length}`}
				</Button>
			) : null}
		</div>
	);
}

function ReadingTimeline({ item }: { item: BookSittingItem }) {
	const f = useFormatters();
	// Elapsed time depends on "now", so compute it after mount to keep the
	// server-rendered markup and the first client render identical.
	const [now, setNow] = useState<number | null>(null);
	useEffect(() => setNow(Date.now()), []);

	const start = new Date(item.readingStartedAt ?? item.date).getTime();
	const end = item.readingDeadline
		? new Date(item.readingDeadline).getTime()
		: null;
	if (end == null || end <= start) {
		return null;
	}

	const finished = item.status === "finished";
	const percent = finished
		? 100
		: now == null
			? 0
			: Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));

	return (
		<div className="flex flex-col gap-1.5">
			<div
				className="h-1.5 border border-border bg-muted/30"
				role="progressbar"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(percent)}
				aria-label="Reading time elapsed"
			>
				<div className="h-full bg-primary" style={{ width: `${percent}%` }} />
			</div>
			<p className="text-muted-foreground text-xs">
				{formatDate(f, new Date(start).toISOString())} to{" "}
				{formatDate(f, new Date(end).toISOString())}
				{finished ? " · finished" : ""}
			</p>
		</div>
	);
}

function PickedCard({ item, mark }: { item: BookSittingItem; mark: Mark }) {
	const f = useFormatters();
	const [open, setOpen] = useState(false);
	const total = item.participantCount;

	return (
		<article className="flex flex-col gap-4 border border-border p-4">
			<header className="flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0 space-y-1">
					<h3 className="font-semibold text-base leading-snug">
						<Link
							href={`/sittings/${item.sittingSlug}` as Route}
							className="capitalize hover:underline"
						>
							{item.displayName.replace(/\s*\[.*\]$/, "")}
						</Link>
					</h3>
					<p className="text-muted-foreground text-sm">
						{item.pollDeadline
							? `Voted ${formatDate(f, item.pollDeadline)}`
							: `Started ${formatDate(f, item.date)}`}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<ViewerMarks mark={mark} />
					<SittingStatusBadge status={item.status} />
				</div>
			</header>

			{item.place != null ? (
				<p className="text-sm">
					<span className="font-medium">
						{ordinal(item.place)} of {item.optionCount}
					</span>{" "}
					<span className="text-muted-foreground">
						· {plural(item.points ?? 0, "point")} ·{" "}
						{plural(item.voters, "voter")}
						{item.note ? ` · ${item.note}` : ""}
					</span>
				</p>
			) : item.note ? (
				<p className="text-muted-foreground text-sm">{item.note}</p>
			) : null}

			<Ranking item={item} />

			<div className="flex flex-col gap-2">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<p className="text-sm">
						{total > 0 ? plural(total, "participant") : "No participants"}
					</p>
					{item.participants.length > 0 ? (
						<div className="flex">
							{item.participants.slice(0, 5).map((participant, index) => (
								<UserAvatar
									key={participant.username}
									user={participant}
									className={cn(
										"size-7 ring-2 ring-background",
										index > 0 && "-ms-2",
									)}
								/>
							))}
							{total > 5 ? (
								<span className="-ms-2 flex size-7 items-center justify-center bg-muted text-xs ring-2 ring-background">
									+{total - 5}
								</span>
							) : null}
						</div>
					) : null}
				</div>
				{total > 0 && item.status !== "voting" ? (
					<>
						<div
							className="flex h-2 overflow-hidden border border-border bg-muted/30"
							role="img"
							aria-label={`${item.progressCounts.completed} of ${total} readers finished`}
						>
							{progressOrder.map((key) =>
								item.progressCounts[key] > 0 ? (
									<div
										key={key}
										className={progressBarClass[key]}
										style={{
											width: `${(item.progressCounts[key] / total) * 100}%`,
										}}
									/>
								) : null,
							)}
						</div>
						<ul className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs tabular-nums">
							{progressOrder.map((key) =>
								item.progressCounts[key] > 0 ? (
									<li key={key} className="inline-flex items-center gap-1.5">
										<span
											className={cn("size-2", progressBarClass[key])}
											aria-hidden
										/>
										{item.progressCounts[key]}{" "}
										{progressLabels[key].toLowerCase()}
									</li>
								) : null,
							)}
						</ul>
					</>
				) : null}
			</div>

			{open ? (
				<div className="flex flex-col gap-4 border-border border-t pt-4">
					<ReadingTimeline item={item} />
					{item.participants.length > 0 ? (
						<ul className="grid gap-2 sm:grid-cols-2">
							{item.participants.map((participant) => (
								<li
									key={participant.username}
									className="flex items-center gap-2 border border-border p-2"
								>
									<UserAvatar user={participant} className="size-7" />
									<Link
										href={`/users/${participant.username}` as Route}
										className="min-w-0 flex-1 truncate text-sm hover:underline"
									>
										{participant.name}
									</Link>
									<span className="flex shrink-0 items-center gap-1.5 text-muted-foreground text-xs">
										<span
											className={cn(
												"size-2",
												progressBarClass[participant.progress],
											)}
											aria-hidden
										/>
										{progressLabels[participant.progress]}
									</span>
								</li>
							))}
						</ul>
					) : null}
				</div>
			) : null}

			<div className="flex flex-wrap items-center justify-between gap-2">
				<Button
					variant="ghost"
					size="sm"
					aria-expanded={open}
					onClick={() => setOpen((value) => !value)}
				>
					{open ? "Hide details" : "Show details"}
				</Button>
				<Link
					href={`/sittings/${item.sittingSlug}` as Route}
					className="text-muted-foreground text-sm hover:text-foreground"
				>
					Open sitting
				</Link>
			</div>
		</article>
	);
}

function PollRow({ item, mark }: { item: BookSittingItem; mark: Mark }) {
	const f = useFormatters();
	const open = item.outcome === "in_poll";

	return (
		<li className="flex flex-col gap-3 border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
			<div className="min-w-0 space-y-1">
				<div className="flex flex-wrap items-center gap-2">
					<Link
						href={`/sittings/${item.sittingSlug}` as Route}
						className="font-medium text-sm capitalize hover:underline"
					>
						{item.displayName.replace(/\s*\[.*\]$/, "")}
					</Link>
					<SittingStatusBadge status={item.status} />
					<ViewerMarks mark={mark} />
				</div>
				{open ? (
					<p className="text-muted-foreground text-sm">
						Voting is open. {plural(item.voters, "member")} voted so far
						{item.pollDeadline ? (
							<>
								, closes <ClubDateTime value={item.pollDeadline} />
							</>
						) : null}
						. Results show once it closes.
					</p>
				) : (
					<p className="text-sm">
						<span className="font-medium">
							{item.place != null
								? `${ordinal(item.place)} of ${item.optionCount}`
								: "No result"}
						</span>{" "}
						<span className="text-muted-foreground">
							· {plural(item.points ?? 0, "point")} ·{" "}
							{plural(item.voters, "voter")} · {formatDate(f, item.date)}
						</span>
					</p>
				)}
				{item.note && !open ? (
					<span className="inline-block border border-border bg-muted/30 px-1.5 py-0.5 text-xs">
						{item.note}
					</span>
				) : null}
			</div>

			{open ? (
				<Link
					href={`/sittings/${item.sittingSlug}/vote` as Route}
					className="text-sm underline"
				>
					Go to the vote
				</Link>
			) : item.winner ? (
				<div className="flex min-w-0 items-center gap-2 sm:max-w-[45%]">
					<span className="shrink-0 text-muted-foreground text-xs">Picked</span>
					<Cover coverId={item.winner.coverId} title={item.winner.title} />
					<span className="min-w-0">
						<Link
							href={`/books/${item.winner.slug}` as Route}
							className="block truncate font-medium text-sm hover:underline"
						>
							{item.winner.title}
						</Link>
						<span className="block text-muted-foreground text-xs tabular-nums">
							{plural(item.winner.points, "point")}
						</span>
					</span>
				</div>
			) : null}
		</li>
	);
}

function ToggleChip({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<Button
			type="button"
			size="sm"
			variant={active ? "default" : "outline"}
			aria-pressed={active}
			onClick={onClick}
		>
			{children}
		</Button>
	);
}

function toggleValue<T extends string>(
	current: readonly T[] | null,
	value: T,
): T[] | null {
	const list = current ?? [];
	const next = list.includes(value)
		? list.filter((item) => item !== value)
		: [...list, value];
	return next.length > 0 ? next : null;
}

export function BookSittingsPanel({
	bookSlug,
	initialData,
}: BookSittingsPanelProps) {
	const { data = initialData } = useQuery({
		...orpc.book.getSittings.queryOptions({ input: { bookSlug } }),
		initialData,
		staleTime: 60_000,
	});

	const { data: session } = authClient.useSession();
	const signedIn = Boolean(session?.user);
	const marksQuery = useQuery({
		...orpc.book.getMySittingMarks.queryOptions({ input: { bookSlug } }),
		enabled: signedIn,
		retry: false,
	});
	const marks: Marks = useMemo(
		() =>
			new Map((marksQuery.data ?? []).map((mark) => [mark.sittingSlug, mark])),
		[marksQuery.data],
	);

	const [filters, setFilters] = useQueryStates({
		outcome: parseAsArrayOf(parseAsStringLiteral(BOOK_SITTING_OUTCOMES)),
		status: parseAsArrayOf(parseAsStringLiteral(BOOK_SITTING_STATUSES)),
		year: parseAsInteger,
		mine: parseAsBoolean.withDefault(false),
		sort: parseAsStringLiteral(BOOK_SITTING_SORTS).withDefault("newest"),
	});

	const years = useMemo(
		() =>
			[...new Set(data.items.map((item) => item.year))].sort((a, b) => b - a),
		[data.items],
	);

	const mineSlugs = useMemo(
		() =>
			filters.mine && signedIn
				? new Set(
						[...marks.values()]
							.filter((mark) => mark.voted || mark.myProgress != null)
							.map((mark) => mark.sittingSlug),
					)
				: null,
		[filters.mine, signedIn, marks],
	);

	const visible = useMemo(
		() =>
			filterAndSortBookSittings(data.items, {
				outcomes: filters.outcome,
				statuses: filters.status,
				year: filters.year,
				mineSlugs,
				sort: filters.sort,
			}),
		[data.items, filters, mineSlugs],
	);

	const pickedItems = visible.filter((item) => item.outcome === "picked");
	const pollItems = visible.filter((item) => item.outcome !== "picked");
	const narrowed =
		Boolean(filters.outcome?.length) ||
		Boolean(filters.status?.length) ||
		filters.year != null ||
		filters.mine;

	if (data.items.length === 0) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyTitle>No sittings yet</EmptyTitle>
					<EmptyDescription>
						This book has not been picked or been a poll option yet. When a
						sitting includes it, the votes and readers show up here.{" "}
						<Link href={"/sittings/new" as Route} className="underline">
							Start a sitting
						</Link>{" "}
						if you are an admin.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	const { summary } = data;

	return (
		<div className="flex flex-col gap-6">
			<section
				aria-label="Summary"
				className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"
			>
				<SummaryStat
					label="Picked"
					value={String(summary.picked)}
					hint={
						summary.readers > 0
							? `${plural(summary.readers, "reader")} in total`
							: undefined
					}
				/>
				<SummaryStat
					label="Poll appearances"
					value={String(summary.pollAppearances)}
					hint={summary.inPollNow > 0 ? "In a poll right now" : undefined}
				/>
				{summary.winRate != null ? (
					<SummaryStat
						label="Win rate"
						value={`${Math.round(summary.winRate * 100)}%`}
						hint={`${plural(summary.closedPolls, "closed poll")}`}
					/>
				) : null}
				{summary.bestPlace != null ? (
					<SummaryStat label="Best place" value={ordinal(summary.bestPlace)} />
				) : null}
				{summary.averagePlace != null ? (
					<SummaryStat
						label="Average place"
						value={summary.averagePlace.toFixed(1)}
					/>
				) : null}
			</section>

			<p className="text-muted-foreground text-sm">
				Want the numbers over time? See the poll chart on the{" "}
				<Link href={`/books/${bookSlug}/stats` as Route} className="underline">
					stats page
				</Link>
				.
			</p>

			{data.items.length >= FILTER_BAR_MIN_ITEMS ? (
				<section
					aria-label="Filters"
					className="flex flex-col gap-3 border border-border p-3"
				>
					<div className="flex flex-wrap items-center gap-2">
						{BOOK_SITTING_OUTCOMES.map((value) => (
							<ToggleChip
								key={value}
								active={filters.outcome?.includes(value) ?? false}
								onClick={() =>
									void setFilters({
										outcome: toggleValue(filters.outcome, value),
									})
								}
							>
								{BOOK_SITTING_OUTCOME_LABELS[value]}
							</ToggleChip>
						))}
						<span className="mx-1 h-5 w-px bg-border" aria-hidden />
						{BOOK_SITTING_STATUSES.map((value) => (
							<ToggleChip
								key={value}
								active={filters.status?.includes(value) ?? false}
								onClick={() =>
									void setFilters({
										status: toggleValue(filters.status, value),
									})
								}
							>
								{BOOK_SITTING_STATUS_LABELS[value]}
							</ToggleChip>
						))}
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<Select
							value={filters.year == null ? "all" : String(filters.year)}
							onValueChange={(value) =>
								void setFilters({
									year: value === "all" ? null : Number(value),
								})
							}
						>
							<SelectTrigger className="h-8 w-[120px]">
								<span>{filters.year == null ? "All years" : filters.year}</span>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All years</SelectItem>
								{years.map((year) => (
									<SelectItem key={year} value={String(year)}>
										{year}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select
							value={filters.sort}
							onValueChange={(value) =>
								void setFilters({
									sort: value as (typeof BOOK_SITTING_SORTS)[number],
								})
							}
						>
							<SelectTrigger className="h-8 w-[180px]">
								<span>{BOOK_SITTING_SORT_LABELS[filters.sort]}</span>
							</SelectTrigger>
							<SelectContent>
								{BOOK_SITTING_SORTS.map((value) => (
									<SelectItem key={value} value={value}>
										{BOOK_SITTING_SORT_LABELS[value]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{signedIn ? (
							<div className="flex items-center gap-2">
								<Checkbox
									id="book-sittings-mine"
									checked={filters.mine}
									onCheckedChange={(checked) =>
										void setFilters({ mine: checked === true })
									}
								/>
								<Label htmlFor="book-sittings-mine" className="text-sm">
									Only sittings I voted in or joined
								</Label>
							</div>
						) : null}
						{narrowed ? (
							<Button
								variant="ghost"
								size="sm"
								onClick={() =>
									void setFilters({
										outcome: null,
										status: null,
										year: null,
										mine: null,
									})
								}
							>
								Clear filters
							</Button>
						) : null}
					</div>
				</section>
			) : null}

			{visible.length === 0 ? (
				<Empty>
					<EmptyHeader>
						<EmptyTitle>No sittings match</EmptyTitle>
						<EmptyDescription>
							Try removing a filter to see more.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : null}

			{pickedItems.length > 0 ? (
				<section className="flex flex-col gap-3" aria-label="Picked sittings">
					<h2 className="font-semibold text-base tracking-tight">
						Picked by the club
					</h2>
					<div className="grid gap-4 lg:grid-cols-2">
						{pickedItems.map((item) => (
							<PickedCard
								key={item.sittingSlug}
								item={item}
								mark={marks.get(item.sittingSlug)}
							/>
						))}
					</div>
				</section>
			) : null}

			{pollItems.length > 0 ? (
				<section className="flex flex-col gap-3" aria-label="Other polls">
					<h2 className="font-semibold text-base tracking-tight">
						In other polls
					</h2>
					<ul className="flex flex-col gap-2">
						{pollItems.map((item) => (
							<PollRow
								key={item.sittingSlug}
								item={item}
								mark={marks.get(item.sittingSlug)}
							/>
						))}
					</ul>
				</section>
			) : null}

			{data.rivals.length > 0 ? (
				<section className="flex flex-col gap-3" aria-label="Rivals">
					<div className="space-y-1">
						<h2 className="font-semibold text-base tracking-tight">
							Head to head
						</h2>
						<p className="text-muted-foreground text-sm">
							Books it shared a poll with most often, and who finished ahead.
						</p>
					</div>
					<ul className="grid gap-2 sm:grid-cols-2">
						{data.rivals.map((rival) => (
							<li
								key={rival.slug}
								className="flex items-center gap-3 border border-border p-3"
							>
								<Cover coverId={rival.coverId} title={rival.title} />
								<span className="min-w-0 flex-1">
									<Link
										href={`/books/${rival.slug}` as Route}
										className="block truncate font-medium text-sm hover:underline"
									>
										{rival.title}
									</Link>
									<span className="block text-muted-foreground text-xs">
										Ahead of it {plural(rival.ahead, "time")}, behind it{" "}
										{plural(rival.behind, "time")}
									</span>
								</span>
							</li>
						))}
					</ul>
				</section>
			) : null}
		</div>
	);
}
