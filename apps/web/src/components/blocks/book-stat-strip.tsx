"use client";

import type { BookPulse } from "@bbrc/api/modules/book/book-pulse.service";
import {
	BookCheck,
	Bookmark,
	BookOpen,
	type LucideIcon,
	Star,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { BOOK_TONES, type BookTone } from "@/lib/book-tones";
import { useBookLiveCounts } from "@/lib/books/use-book-live-counts";
import { cn } from "@/lib/utils";

const cellBase =
	"flex min-w-0 flex-col justify-center gap-1 bg-background px-3 py-3 sm:px-4";
const cellLink =
	"transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2 motion-reduce:transition-none";

function ordinal(n: number) {
	const mod100 = n % 100;
	if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
	return `${n}${["th", "st", "nd", "rd"][n % 10 > 3 ? 0 : n % 10] ?? "th"}`;
}

/**
 * Where the book stands among every book for this number. A small outlined
 * "#4"; the top three take the metric's own colour, the rest stay quiet.
 */
function RankMark({
	rank,
	tone,
	hint,
}: {
	rank: number | null | undefined;
	tone: BookTone;
	hint: string;
}) {
	if (rank == null) return null;
	const top = rank <= 3;

	return (
		<span
			title={`${ordinal(rank)} ${hint}`}
			className={cn(
				"inline-flex h-5 items-center border px-1 font-medium text-xs tabular-nums leading-none",
				top
					? cn("border-current/40", BOOK_TONES[tone].ink)
					: "border-border text-muted-foreground",
			)}
		>
			<span className="sr-only">
				{ordinal(rank)} {hint}
			</span>
			<span aria-hidden>#{rank}</span>
		</span>
	);
}

function Stars({ average }: { average: number }) {
	const row = (className: string) => (
		<span className="flex w-max">
			{[0, 1, 2, 3, 4].map((i) => (
				<Star
					key={i}
					className={cn("size-3.5 shrink-0", className)}
					aria-hidden
				/>
			))}
		</span>
	);

	return (
		<span
			role="img"
			aria-label={`${average.toFixed(1)} out of 5 stars`}
			className="relative inline-flex"
		>
			{row("text-muted-foreground/30")}
			<span
				className="absolute inset-y-0 left-0 overflow-hidden"
				style={{ width: `${Math.min(100, (average / 5) * 100)}%` }}
			>
				{row("fill-warning text-warning")}
			</span>
		</span>
	);
}

function RatingCell({
	slug,
	average,
	pulse,
}: {
	slug: string;
	average: number | null;
	pulse: BookPulse;
}) {
	const peak = Math.max(1, ...pulse.ratingBars.map((bar) => bar.count));
	const rated = pulse.reviews > 0 && average != null;

	return (
		<Link
			href={`/books/${slug}/reviews` as Route}
			className={cn(cellBase, cellLink, "flex-row items-center gap-5")}
		>
			<span className="flex flex-col gap-1">
				<span className="flex items-baseline gap-2">
					<span className="font-semibold text-2xl tabular-nums leading-none">
						{rated ? average.toFixed(1) : "–"}
					</span>
					{rated ? (
						<RankMark
							rank={pulse.ranks.rating}
							tone="warning"
							hint="highest rated of all books"
						/>
					) : null}
					<span className="text-muted-foreground text-sm">
						{pulse.reviews === 0
							? "No reviews yet"
							: `${pulse.reviews} ${pulse.reviews === 1 ? "review" : "reviews"}`}
					</span>
				</span>
				{rated ? (
					<Stars average={average} />
				) : (
					<span className="flex text-muted-foreground/30" aria-hidden>
						{[0, 1, 2, 3, 4].map((i) => (
							<Star key={i} className="size-3.5" />
						))}
					</span>
				)}
			</span>
			{pulse.reviews > 0 ? (
				<ul
					className="ml-auto flex w-32 shrink-0 flex-col gap-0.5 lg:ml-0 lg:w-28"
					aria-label="Reviews by stars"
				>
					{pulse.ratingBars.map((bar) => (
						<li key={bar.stars} className="flex items-center gap-1.5 text-3xs">
							<span className="w-2 text-right text-muted-foreground tabular-nums">
								{bar.stars}
							</span>
							<span className="h-1 flex-1 bg-muted">
								<span
									className="block h-full bg-warning"
									style={{ width: `${(bar.count / peak) * 100}%` }}
								/>
							</span>
						</li>
					))}
				</ul>
			) : null}
		</Link>
	);
}

function Cell({
	href,
	icon: Icon,
	tone,
	label,
	value,
	rank,
	rankHint,
}: {
	href?: string;
	icon: LucideIcon;
	tone?: BookTone;
	label: string;
	value: string | undefined;
	rank?: number | null;
	rankHint?: string;
}) {
	const inner = (
		<>
			<span className="flex min-w-0 items-center gap-1.5 text-muted-foreground text-xs">
				<Icon
					className={cn("size-3.5 shrink-0", tone ? BOOK_TONES[tone].ink : "")}
					aria-hidden
				/>
				{label}
			</span>
			{value == null ? (
				<span
					className="h-5 w-8 bg-muted motion-safe:animate-pulse"
					aria-hidden
				/>
			) : (
				<span className="flex items-center gap-1.5">
					<span className="font-semibold text-xl tabular-nums leading-none">
						{value}
					</span>
					{tone && rankHint ? (
						<RankMark rank={rank} tone={tone} hint={rankHint} />
					) : null}
				</span>
			)}
		</>
	);

	return href ? (
		<Link href={href as Route} className={cn(cellBase, cellLink)}>
			{inner}
		</Link>
	) : (
		<div className={cellBase}>{inner}</div>
	);
}

/**
 * The numbers at a glance, in one hairline-divided strip: how the club rated
 * it with a five-bar histogram, then how many have read it, are reading it,
 * and wishlisted it. Colour lives only in the marks.
 */
export function BookStatStrip({
	slug,
	average,
	pulse,
}: {
	slug: string;
	average: number | null;
	pulse: BookPulse;
}) {
	const live = useBookLiveCounts(slug);
	const { data: session } = authClient.useSession();
	const username = session?.user.username;

	return (
		<div className="grid grid-cols-3 gap-px border border-border bg-border lg:grid-cols-[17rem_repeat(3,minmax(0,1fr))]">
			<div className="col-span-3 grid lg:col-span-1">
				<RatingCell slug={slug} average={average} pulse={pulse} />
			</div>
			<Cell
				href={`/books/${slug}/reads`}
				icon={BookCheck}
				tone="success"
				label="Read it"
				value={live.reads?.toString()}
				rank={pulse.ranks.reads}
				rankHint="most read of all books"
			/>
			<Cell
				href={`/books/${slug}/reading`}
				icon={BookOpen}
				tone="info"
				label="Reading"
				value={live.reading?.toString()}
				rank={pulse.ranks.reading}
				rankHint="most read right now"
			/>
			<Cell
				href={username ? `/users/${username}/wishlist` : undefined}
				icon={Bookmark}
				tone="violet"
				label="Wishlisted"
				value={live.wishlists?.toString()}
				rank={pulse.ranks.wishlists}
				rankHint="most wishlisted of all books"
			/>
		</div>
	);
}
