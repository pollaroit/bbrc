"use client";

import type {
	CompareBook,
	CompareExtrasOutput,
	CompareOutput,
} from "@bbrc/api/modules/user-compare/user-compare.schema";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@bbrc/ui/components/chart";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
	PolarAngleAxis,
	PolarGrid,
	Radar,
	RadarChart,
	XAxis,
	YAxis,
} from "recharts";
import {
	INSIGHTS_BOOK_SHAPE,
	InsightsBookCover,
} from "@/components/blocks/author/author-insights-covers";
import {
	ChartEmpty,
	ChartFrame,
} from "@/components/blocks/author/author-stats-frame";
import { ClubDateTime } from "@/components/blocks/club-date-time";
import { SittingStatusBadge } from "@/components/blocks/sitting-status-badge";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export const COMPARE_EXTRA_TABS = [
	{ id: "taste", label: "Taste" },
	{ id: "authors", label: "Authors & favourites" },
	{ id: "timeline", label: "Timeline" },
	{ id: "shelves", label: "Shelves" },
	{ id: "together", label: "Together" },
] as const;

export type CompareExtraTab = (typeof COMPARE_EXTRA_TABS)[number]["id"];

type Extras = CompareExtrasOutput;

export function CompareExtrasPanel({
	a,
	b,
	asAdmin,
	tab,
	data,
}: {
	a: string;
	b: string;
	asAdmin: boolean;
	tab: CompareExtraTab;
	data: CompareOutput;
}) {
	const input = { a, b };
	// One request serves every extra tab; the result is cached while you switch.
	const extras = useQuery(
		asAdmin
			? orpc.userCompareAdmin.extras.queryOptions({ input })
			: orpc.userCompare.extras.queryOptions({ input }),
	);

	if (extras.isPending) {
		return (
			<div className="grid gap-4 lg:grid-cols-2" aria-hidden>
				<Skeleton className="h-80 w-full" />
				<Skeleton className="h-80 w-full" />
			</div>
		);
	}
	if (extras.isError || !extras.data) {
		return (
			<div className="border border-border border-dashed p-8 text-center text-sm">
				Could not load this part.{" "}
				<button
					type="button"
					onClick={() => void extras.refetch()}
					className="underline underline-offset-4"
				>
					Try again
				</button>
			</div>
		);
	}

	const names = {
		a: data.a.name,
		b: data.b.name,
	};
	const extra = extras.data;

	switch (tab) {
		case "taste":
			return <TasteTab extras={extra} names={names} />;
		case "authors":
			return <AuthorsTab extras={extra} names={names} />;
		case "timeline":
			return <TimelineTab extras={extra} names={names} />;
		case "shelves":
			return <ShelvesTab extras={extra} />;
		case "together":
			return <TogetherTab extras={extra} names={names} />;
	}
}

type Names = { a: string; b: string };

function chartConfig(names: Names): ChartConfig {
	return {
		a: { label: names.a, color: "var(--chart-1)" },
		b: { label: names.b, color: "var(--chart-2)" },
	};
}

function Nothing({ children }: { children: React.ReactNode }) {
	return (
		<div className="border border-border border-dashed p-8 text-center text-muted-foreground text-sm">
			{children}
		</div>
	);
}

function Section({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: React.ReactNode;
}) {
	return (
		<section className="flex flex-col gap-3" aria-label={title}>
			<div>
				<h3 className="font-medium text-sm">{title}</h3>
				{description ? (
					<p className="text-muted-foreground text-xs">{description}</p>
				) : null}
			</div>
			{children}
		</section>
	);
}

// ── Taste ──────────────────────────────────────────────────────────────────

type Axis = NonNullable<Extras["subjects"]>[number];

function TasteRadar({
	title,
	description,
	axes,
	names,
}: {
	title: string;
	description: string;
	axes: Axis[] | null;
	names: Names;
}) {
	const config = chartConfig(names);
	const table = {
		columns: ["", `${names.a} %`, `${names.b} %`],
		rows: (axes ?? []).map((axis) => [axis.label, axis.a, axis.b]),
	};
	return (
		<ChartFrame title={title} description={description} table={table}>
			{!axes || axes.length === 0 ? (
				<ChartEmpty>No books to draw this from.</ChartEmpty>
			) : axes.length < 3 ? (
				<ChartContainer config={config} className="aspect-auto h-64 w-full">
					<BarChart data={axes} accessibilityLayer>
						<CartesianGrid vertical={false} />
						<XAxis dataKey="label" tickLine={false} axisLine={false} />
						<YAxis hide domain={[0, 100]} />
						<ChartTooltip content={<ChartTooltipContent />} />
						<Bar dataKey="a" fill="var(--color-a)" />
						<Bar dataKey="b" fill="var(--color-b)" />
					</BarChart>
				</ChartContainer>
			) : (
				<ChartContainer
					config={config}
					className="mx-auto aspect-square max-h-80 w-full"
				>
					<RadarChart data={axes}>
						<ChartTooltip content={<ChartTooltipContent />} />
						<PolarGrid />
						<PolarAngleAxis dataKey="label" tick={{ fontSize: 11 }} />
						<Radar
							dataKey="a"
							fill="var(--color-a)"
							fillOpacity={0.25}
							stroke="var(--color-a)"
						/>
						<Radar
							dataKey="b"
							fill="var(--color-b)"
							fillOpacity={0.25}
							stroke="var(--color-b)"
						/>
						<ChartLegend content={<ChartLegendContent />} />
					</RadarChart>
				</ChartContainer>
			)}
		</ChartFrame>
	);
}

function TasteTab({ extras, names }: { extras: Extras; names: Names }) {
	if (!extras.subjects && !extras.countries) {
		return (
			<Nothing>
				Neither member has read a book yet, so there is no taste to compare.
			</Nothing>
		);
	}
	return (
		<div className="grid gap-4 lg:grid-cols-2">
			<TasteRadar
				title="Subjects"
				description="Share of each member's books that carry the subject."
				axes={extras.subjects}
				names={names}
			/>
			<TasteRadar
				title="Where the books come from"
				description="Share of each member's books by country of origin."
				axes={extras.countries}
				names={names}
			/>
		</div>
	);
}

// ── Authors and favourites ────────────────────────────────────────────────

function CoverGrid({ books }: { books: CompareBook[] }) {
	return (
		<ul className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-3">
			{books.map((book) => (
				<li key={book.slug} className="min-w-0" title={book.title}>
					<InsightsBookCover
						book={book}
						linked
						className={cn(INSIGHTS_BOOK_SHAPE, "w-full")}
						sizes="96px"
					/>
					<p className="mt-1 line-clamp-2 text-xs leading-tight">
						{book.title}
					</p>
				</li>
			))}
		</ul>
	);
}

function AuthorsTab({ extras, names }: { extras: Extras; names: Names }) {
	const authors = extras.authors;
	if (
		!authors ||
		(authors.shared.length === 0 && authors.sharedFavorites.length === 0)
	) {
		return <Nothing>No authors or favourite books in common yet.</Nothing>;
	}
	const top = Math.max(
		1,
		...authors.shared.flatMap((row) => [row.countA, row.countB]),
	);
	return (
		<div className="flex flex-col gap-8">
			{authors.shared.length > 0 ? (
				<Section
					title="Authors you both read"
					description="How many of their books each of you has read."
				>
					<ul className="grid gap-3 sm:grid-cols-2">
						{authors.shared.map((author) => (
							<li
								key={author.slug}
								className="flex flex-col gap-2 border border-border p-3"
							>
								<Link
									href={`/authors/${author.slug}` as Route}
									className="truncate font-medium text-sm hover:underline"
								>
									{author.name}
								</Link>
								{(
									[
										["a", names.a, author.countA],
										["b", names.b, author.countB],
									] as const
								).map(([side, name, count]) => (
									<div key={side} className="flex items-center gap-2 text-xs">
										<span className="w-20 shrink-0 truncate text-muted-foreground">
											{name}
										</span>
										<div className="h-2 flex-1 bg-muted" aria-hidden>
											<div
												className={cn(
													"h-full",
													side === "a" ? "bg-chart-1" : "bg-chart-2",
												)}
												style={{ width: `${(count / top) * 100}%` }}
											/>
										</div>
										<span className="w-6 text-right tabular-nums">{count}</span>
									</div>
								))}
							</li>
						))}
					</ul>
				</Section>
			) : null}
			{authors.sharedFavorites.length > 0 ? (
				<Section
					title="Favourites you share"
					description="Books you both put among your favourites."
				>
					<CoverGrid books={authors.sharedFavorites} />
				</Section>
			) : null}
		</div>
	);
}

// ── Timeline ───────────────────────────────────────────────────────────────

function TimelineTab({ extras, names }: { extras: Extras; names: Names }) {
	const timeline = extras.timeline;
	if (!timeline || timeline.points.length === 0) {
		return <Nothing>No dated reads to put on a timeline yet.</Nothing>;
	}
	const config = chartConfig(names);
	return (
		<ChartFrame
			title="Books finished per year"
			description="Reads with a finish date, year by year."
			table={{
				columns: ["Year", names.a, names.b],
				rows: timeline.points.map((point) => [point.year, point.a, point.b]),
			}}
			footer={
				timeline.undatedA + timeline.undatedB > 0 ? (
					<p className="text-muted-foreground text-xs">
						Left out because they have no finish date: {names.a}{" "}
						{timeline.undatedA}, {names.b} {timeline.undatedB}.
					</p>
				) : null
			}
		>
			<ChartContainer config={config} className="aspect-auto h-72 w-full">
				<LineChart data={timeline.points} accessibilityLayer>
					<CartesianGrid vertical={false} />
					<XAxis dataKey="year" tickLine={false} axisLine={false} />
					<YAxis
						allowDecimals={false}
						tickLine={false}
						axisLine={false}
						width={28}
					/>
					<ChartTooltip content={<ChartTooltipContent />} />
					<Line
						dataKey="a"
						type="monotone"
						stroke="var(--color-a)"
						strokeWidth={2}
						dot={{ r: 3 }}
					/>
					<Line
						dataKey="b"
						type="monotone"
						stroke="var(--color-b)"
						strokeWidth={2}
						dot={{ r: 3 }}
					/>
					<ChartLegend content={<ChartLegendContent />} />
				</LineChart>
			</ChartContainer>
		</ChartFrame>
	);
}

// ── Shelves ────────────────────────────────────────────────────────────────

function shelfHref(owner: string, slug: string) {
	return `/users/${owner}/shelves/${slug}` as Route;
}

function ShelvesTab({ extras }: { extras: Extras }) {
	const shelves = extras.shelves;
	if (
		!shelves ||
		(shelves.sharedBookCount === 0 &&
			shelves.pairs.length === 0 &&
			shelves.collaborations.length === 0)
	) {
		return <Nothing>No public shelves overlap yet.</Nothing>;
	}
	return (
		<div className="flex flex-col gap-8">
			{shelves.pairs.length > 0 ? (
				<Section
					title="Most alike shelves"
					description="One public shelf of each member, ranked by how many books they share."
				>
					<ul className="grid gap-3 md:grid-cols-2">
						{shelves.pairs.map((pair) => (
							<li
								key={`${pair.shelfA.slug}-${pair.shelfB.slug}`}
								className="flex flex-col gap-2 border border-border p-3"
							>
								<div className="grid grid-cols-2 gap-3 text-sm">
									<Link
										href={shelfHref(
											pair.shelfA.owner.username,
											pair.shelfA.slug,
										)}
										className="min-w-0 hover:underline"
									>
										<span className="block truncate font-medium">
											{pair.shelfA.title}
										</span>
										<span className="text-muted-foreground text-xs">
											{pair.shelfA.bookCount} books
										</span>
									</Link>
									<Link
										href={shelfHref(
											pair.shelfB.owner.username,
											pair.shelfB.slug,
										)}
										className="min-w-0 text-right hover:underline"
									>
										<span className="block truncate font-medium">
											{pair.shelfB.title}
										</span>
										<span className="text-muted-foreground text-xs">
											{pair.shelfB.bookCount} books
										</span>
									</Link>
								</div>
								<div className="flex items-center gap-2 text-xs">
									<div className="h-1.5 flex-1 bg-muted" aria-hidden>
										<div
											className="h-full bg-primary"
											style={{ width: `${pair.similarity}%` }}
										/>
									</div>
									<span className="text-muted-foreground tabular-nums">
										{pair.sharedBooks} shared · {pair.similarity}% alike
									</span>
								</div>
							</li>
						))}
					</ul>
				</Section>
			) : null}
			{shelves.sharedBookCount > 0 ? (
				<Section
					title="Books on both members' shelves"
					description={`${shelves.sharedBookCount} ${shelves.sharedBookCount === 1 ? "book appears" : "books appear"} on a public shelf of each.`}
				>
					<CoverGrid books={shelves.sharedBooks} />
				</Section>
			) : null}
			{shelves.collaborations.length > 0 ? (
				<Section
					title="Shelves they share"
					description="A shelf one of them owns and the other helps edit."
				>
					<ul className="grid gap-2 sm:grid-cols-2">
						{shelves.collaborations.map((shelf) => (
							<li key={shelf.slug}>
								<Link
									href={shelfHref(shelf.owner.username, shelf.slug)}
									className="block border border-border p-3 text-sm hover:bg-muted/40"
								>
									<span className="block truncate font-medium">
										{shelf.title}
									</span>
									<span className="text-muted-foreground text-xs">
										by {shelf.owner.name} · {shelf.bookCount} books
									</span>
								</Link>
							</li>
						))}
					</ul>
				</Section>
			) : null}
		</div>
	);
}

// ── Together ───────────────────────────────────────────────────────────────

function TogetherTab({ extras, names }: { extras: Extras; names: Names }) {
	const reading = extras.currentlyReading;
	const sittings = extras.sittings;
	const wishlist = extras.wishlist;

	const hasReading =
		reading != null &&
		(reading.both.length > 0 ||
			reading.onlyA.length > 0 ||
			reading.onlyB.length > 0 ||
			reading.readAtSameTimeCount > 0);
	const hasSittings = sittings != null && sittings.count > 0;
	const hasWishlist = wishlist != null && wishlist.shared.length > 0;

	if (!hasReading && !hasSittings && !hasWishlist) {
		return (
			<Nothing>
				Nothing together yet. Current reading and wishlists only show up when
				both members share them.
			</Nothing>
		);
	}

	return (
		<div className="flex flex-col gap-8">
			{hasReading && reading ? (
				<Section
					title="Reading right now"
					description={
						reading.readAtSameTimeCount > 0
							? `You overlapped on ${reading.readAtSameTimeCount} ${reading.readAtSameTimeCount === 1 ? "book" : "books"} while reading at the same time.`
							: undefined
					}
				>
					<div className="grid gap-4 md:grid-cols-3">
						<ReadingGroup title="Both reading" books={reading.both} />
						<ReadingGroup title={`Only ${names.a}`} books={reading.onlyA} />
						<ReadingGroup title={`Only ${names.b}`} books={reading.onlyB} />
					</div>
				</Section>
			) : null}
			{hasSittings && sittings ? (
				<Section
					title="Sittings together"
					description={`${sittings.count} ${sittings.count === 1 ? "sitting" : "sittings"} you both took part in.`}
				>
					<ul className="grid gap-3 md:grid-cols-2">
						{sittings.items.map((sitting) => (
							<li
								key={sitting.slug}
								className="flex gap-3 border border-border p-3"
							>
								{sitting.book ? (
									<InsightsBookCover
										book={sitting.book}
										className={cn(INSIGHTS_BOOK_SHAPE, "w-12")}
										sizes="48px"
									/>
								) : null}
								<div className="flex min-w-0 flex-1 flex-col gap-1">
									<Link
										href={`/sittings/${sitting.slug}` as Route}
										className="truncate font-medium text-sm hover:underline"
									>
										{sitting.title}
									</Link>
									<div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
										<SittingStatusBadge status={sitting.status} />
										<ClubDateTime value={sitting.deadline} />
									</div>
									<p className="text-xs">
										<span className="text-muted-foreground">{names.a}:</span>{" "}
										{sitting.progressA}{" "}
										<span className="text-muted-foreground">· {names.b}:</span>{" "}
										{sitting.progressB}
									</p>
								</div>
							</li>
						))}
					</ul>
				</Section>
			) : null}
			{hasWishlist && wishlist ? (
				<Section
					title="Wishlist overlap"
					description={`${wishlist.shared.length} of ${names.a}'s ${wishlist.countA} and ${names.b}'s ${wishlist.countB} wishlist books are the same.`}
				>
					<CoverGrid books={wishlist.shared} />
				</Section>
			) : null}
		</div>
	);
}

function ReadingGroup({
	title,
	books,
}: {
	title: string;
	books: CompareBook[];
}) {
	return (
		<div className="flex flex-col gap-2 border border-border p-3">
			<h4 className="font-medium text-xs">{title}</h4>
			{books.length === 0 ? (
				<p className="text-muted-foreground text-xs">None.</p>
			) : (
				<CoverGrid books={books} />
			)}
		</div>
	);
}
