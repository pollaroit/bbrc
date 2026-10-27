"use client";

import type {
	CompareBookItemSchema,
	CompareOutput,
} from "@bbrc/api/modules/user-compare/user-compare.schema";
import { formatReadFinishedMonth } from "@bbrc/shared";
import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import type { Route } from "next";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import type { z } from "zod";
import {
	INSIGHTS_BOOK_SHAPE,
	InsightsBookCover,
} from "@/components/blocks/author/author-insights-covers";
import {
	InsightsFilterRow,
	InsightsSearch,
	InsightsSelect,
} from "@/components/blocks/author/author-insights-filters";
import { BookAuthorLinks } from "@/components/blocks/book-author-links";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type Item = z.infer<typeof CompareBookItemSchema>;

const GROUPS = ["both", "onlyA", "onlyB"] as const;
const SORTS = [
	"score_desc",
	"score_asc",
	"title_asc",
	"title_desc",
	"date_desc",
	"date_asc",
] as const;

const SORT_OPTIONS = [
	{ value: "score_desc", label: "Most alike first" },
	{ value: "score_asc", label: "Biggest gaps first" },
	{ value: "title_asc", label: "Title A–Z" },
	{ value: "title_desc", label: "Title Z–A" },
	{ value: "date_desc", label: "Finished latest" },
	{ value: "date_asc", label: "Finished earliest" },
] as const;

function firstName(name: string) {
	return name.trim().split(/\s+/)[0] ?? name;
}

function monthLabel(finished: Item["finishedA"]) {
	if (!finished || finished.year == null) return null;
	if (finished.month == null) return String(finished.year);
	return formatReadFinishedMonth({
		year: finished.year,
		month: finished.month,
	});
}

export function CompareBooks({
	a,
	b,
	asAdmin,
	data,
}: {
	a: string;
	b: string;
	asAdmin: boolean;
	data: CompareOutput;
}) {
	const [params, setParams] = useQueryStates(
		{
			group: parseAsStringLiteral(GROUPS).withDefault("both"),
			q: parseAsString.withDefault(""),
			sort: parseAsStringLiteral(SORTS).withDefault("score_desc"),
		},
		{ history: "replace", clearOnDefault: true },
	);

	const [sort, sortDirection] = params.sort.split("_") as [
		"score" | "title" | "date",
		"asc" | "desc",
	];
	const input = {
		a,
		b,
		group: params.group,
		sort,
		sortDirection,
		limit: 24,
		...(params.q ? { search: params.q } : {}),
	};

	const infiniteInput = (cursor: number | undefined) => ({
		...input,
		...(cursor != null ? { cursor } : {}),
	});
	const query = useInfiniteQuery(
		asAdmin
			? orpc.userCompareAdmin.books.infiniteOptions({
					initialPageParam: undefined as number | undefined,
					getNextPageParam: (last) => last.metadata.nextCursor ?? undefined,
					input: infiniteInput,
					placeholderData: (previous) => previous,
				})
			: orpc.userCompare.books.infiniteOptions({
					initialPageParam: undefined as number | undefined,
					getNextPageParam: (last) => last.metadata.nextCursor ?? undefined,
					input: infiniteInput,
					placeholderData: (previous) => previous,
				}),
	);

	const items = (query.data?.pages.flatMap((page) => page.items) ??
		[]) as Item[];
	const total = query.data?.pages[0]?.metadata.total;
	const score = data.score;

	const youLeft = data.viewerSide !== "b";
	const nameA =
		youLeft && data.viewerSide === "a" ? "you" : firstName(data.a.name);
	const nameB = data.viewerSide === "b" ? "you" : firstName(data.b.name);
	const onlyLabel = (name: string) =>
		name === "you" ? "Only you" : `Only ${name}`;

	const tabs = [
		{ id: "both" as const, label: "Read by both", count: score?.sharedCount },
		{ id: "onlyA" as const, label: onlyLabel(nameA), count: score?.onlyACount },
		{ id: "onlyB" as const, label: onlyLabel(nameB), count: score?.onlyBCount },
	];

	const filtered = params.q !== "";

	return (
		<div className="flex flex-col gap-4">
			<div
				role="tablist"
				aria-label="Book groups"
				className="flex flex-wrap gap-2"
			>
				{tabs.map((tab) => {
					const active = tab.id === params.group;
					return (
						<button
							key={tab.id}
							type="button"
							role="tab"
							aria-selected={active}
							onClick={() => void setParams({ group: tab.id })}
							className={cn(
								"flex items-center gap-2 border px-3 py-1.5 text-sm transition-colors",
								active
									? "border-foreground bg-foreground text-background"
									: "border-border text-muted-foreground hover:text-foreground",
							)}
						>
							{tab.label}
							{tab.count != null ? (
								<span
									className={cn(
										"text-xs tabular-nums",
										active ? "text-background/70" : "text-muted-foreground",
									)}
								>
									{tab.count}
								</span>
							) : null}
						</button>
					);
				})}
			</div>

			<InsightsFilterRow>
				<InsightsSearch
					value={params.q}
					onChange={(value) => void setParams({ q: value ?? "" })}
					placeholder="Search title, author or slug"
					label="Search these books"
				/>
				<InsightsSelect
					value={params.sort}
					onChange={(next) => void setParams({ sort: next })}
					options={SORT_OPTIONS}
					label="Sort books"
					prefix="Sort"
				/>
			</InsightsFilterRow>

			{params.group === "both" && score && score.sharedCount > 0 ? (
				<RatingLegend a={data.a.name} b={data.b.name} />
			) : null}

			<InfiniteScroll
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
				isEmpty={items.length === 0}
				emptyTitle={
					filtered
						? "No book matches"
						: params.group === "both"
							? "No shared books yet"
							: "Nothing here"
				}
				emptyDescription={
					filtered
						? "Try another search."
						: params.group === "both"
							? "You haven't read any of the same books yet. Browse the library to find one to read together."
							: "Every book they read is in the other groups."
				}
				emptyContent={
					!filtered && params.group === "both" ? (
						<div className="flex flex-col items-center gap-2 border border-border border-dashed p-8 text-center">
							<p className="font-medium text-sm">No shared books yet</p>
							<p className="max-w-sm text-muted-foreground text-sm">
								{data.viewerSide == null ? "They haven't" : "You haven't"} read
								any of the same books yet. Pick one from the library and read it
								together.
							</p>
							<Link
								href={"/books" as Route}
								className="text-sm underline underline-offset-4"
							>
								Browse books
							</Link>
						</div>
					) : undefined
				}
				loadingContent={
					<ul className="grid gap-3 sm:grid-cols-2" aria-hidden>
						{Array.from({ length: 6 }, (_, index) => (
							<li key={index}>
								<Skeleton className="h-28 w-full" />
							</li>
						))}
					</ul>
				}
				endMessage={
					total != null && total > 0 ? `That is all ${total}.` : undefined
				}
			>
				<ul className="grid gap-3 sm:grid-cols-2">
					{items.map((item) => (
						<li key={item.book.slug}>
							<CompareBookRow
								item={item}
								group={params.group}
								nameA={data.a.name}
								nameB={data.b.name}
							/>
						</li>
					))}
				</ul>
			</InfiniteScroll>
		</div>
	);
}

function RatingLegend({ a, b }: { a: string; b: string }) {
	return (
		<p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-xs">
			<span className="flex items-center gap-1.5">
				<span className="size-2.5 bg-chart-1" aria-hidden />
				{a}
			</span>
			<span className="flex items-center gap-1.5">
				<span className="size-2.5 bg-chart-2" aria-hidden />
				{b}
			</span>
			<span>Gap 0 means the same rating.</span>
		</p>
	);
}

function RatingChip({
	rating,
	tone,
	label,
}: {
	rating: number | null;
	tone: "a" | "b";
	label: string;
}) {
	return (
		<span
			className="flex items-center gap-1.5 text-xs"
			title={`${label}: ${rating == null ? "no rating" : rating}`}
		>
			<span
				className={cn("h-3 w-1", tone === "a" ? "bg-chart-1" : "bg-chart-2")}
				aria-hidden
			/>
			<Star
				className={cn(
					"size-3",
					rating == null ? "text-muted-foreground/50" : "fill-current",
				)}
				aria-hidden
			/>
			<span className="tabular-nums">
				{rating == null ? "No rating" : rating}
			</span>
			<span className="sr-only">{label}</span>
		</span>
	);
}

function CompareBookRow({
	item,
	group,
	nameA,
	nameB,
}: {
	item: Item;
	group: (typeof GROUPS)[number];
	nameA: string;
	nameB: string;
}) {
	const { book } = item;
	const both = group === "both";
	const finished = monthLabel(
		group === "onlyB" ? item.finishedB : item.finishedA,
	);

	return (
		<article className="flex h-full gap-3 border border-border p-3">
			<InsightsBookCover
				book={book}
				linked
				className={cn(INSIGHTS_BOOK_SHAPE, "w-14")}
				sizes="56px"
			/>
			<div className="flex min-w-0 flex-1 flex-col gap-1.5">
				<div className="min-w-0">
					<Link
						href={`/books/${book.slug}` as Route}
						className="line-clamp-2 font-medium text-sm leading-snug hover:underline"
					>
						{book.title}
					</Link>
					<BookAuthorLinks
						authors={book.authors}
						refs={book.authorRefs}
						className="block truncate text-xs"
					/>
				</div>
				<div className="mt-auto flex flex-col gap-1">
					{both ? (
						<>
							<div className="flex flex-wrap gap-x-4 gap-y-1">
								<RatingChip rating={item.ratingA} tone="a" label={nameA} />
								<RatingChip rating={item.ratingB} tone="b" label={nameB} />
							</div>
							<AgreementBar item={item} />
						</>
					) : (
						<RatingChip
							rating={group === "onlyA" ? item.ratingA : item.ratingB}
							tone={group === "onlyA" ? "a" : "b"}
							label={group === "onlyA" ? nameA : nameB}
						/>
					)}
					{finished ? (
						<p className="text-muted-foreground text-xs">Finished {finished}</p>
					) : null}
				</div>
			</div>
		</article>
	);
}

function AgreementBar({ item }: { item: Item }) {
	if (item.score == null) {
		return (
			<p className="text-muted-foreground text-xs">
				Not rated by both, so no agreement score.
			</p>
		);
	}
	const tone =
		item.score >= 80
			? "bg-success"
			: item.score >= 50
				? "bg-warning"
				: "bg-destructive";
	return (
		<div className="flex items-center gap-2">
			<div
				className="h-1.5 flex-1 bg-muted"
				role="img"
				aria-label={`Agreement ${item.score} out of 100`}
			>
				<div
					className={cn("h-full", tone)}
					style={{ width: `${item.score}%` }}
				/>
			</div>
			<span className="text-muted-foreground text-xs tabular-nums">
				{item.score}% · gap {item.diff ?? 0}
			</span>
		</div>
	);
}
