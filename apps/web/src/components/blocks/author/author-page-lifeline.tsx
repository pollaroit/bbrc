"use client";

import type { AuthorProfile } from "@bbrc/api/modules/author/author.schema";
import { Button } from "@bbrc/ui/components/button";
import { Star } from "lucide-react";
import type { Route } from "next";
import { useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { cn } from "@/lib/utils";
import { AuthorPageCover, authorBookAnchor } from "./author-page-bits";
export type LifelineBook = {
	slug: string;
	title: string;
	publishedIn: number;
	coverId: number | null;
	averageRating?: number | null;
	readCount: number;
};

type AuthorPageLifelineProps = {
	birth: AuthorProfile["birth"];
	death: AuthorProfile["death"];
	books: LifelineBook[];
	currentYear: number;
};

const LANE_HEIGHT = 26;
const MIN_GAP_PERCENT = 2.4;

function tickStep(span: number) {
	if (span <= 40) return 5;
	if (span <= 120) return 10;
	if (span <= 300) return 25;
	return 100;
}

/**
 * The life as a shaded band and every book we have as a marker at the year it was published.
 * Hover, focus or tap a marker for its card; arrow keys walk through the books in year order.
 */
export function AuthorPageLifeline({
	birth,
	death,
	books,
	currentYear,
}: AuthorPageLifelineProps) {
	const f = useFormatters();
	const dated = useMemo(
		() =>
			books
				.filter((book) => book.publishedIn > 0)
				.sort(
					(a, b) =>
						a.publishedIn - b.publishedIn || a.title.localeCompare(b.title),
				),
		[books],
	);
	const initial = useMemo(
		() => [...dated].sort((a, b) => b.readCount - a.readCount)[0]?.slug ?? null,
		[dated],
	);
	const [activeSlug, setActiveSlug] = useState<string | null>(initial);
	const markers = useRef(new Map<string, HTMLButtonElement>());

	const geometry = useMemo(() => {
		if (dated.length === 0) return null;
		const years = dated.map((book) => book.publishedIn);
		const born = birth.year;
		const died = death.year ?? (born != null ? currentYear : null);
		const rawStart = Math.min(born ?? Number.POSITIVE_INFINITY, ...years);
		const rawEnd = Math.max(died ?? Number.NEGATIVE_INFINITY, ...years);
		const step = tickStep(rawEnd - rawStart);
		const start = Math.floor(rawStart / step) * step;
		const end = Math.max(start + step, Math.ceil(rawEnd / step) * step);
		const span = end - start;
		const at = (year: number) => ((year - start) / span) * 100;

		// Books published close together go on their own row so they never hide each other.
		const laneEnds: number[] = [];
		const placed = dated.map((book) => {
			const x = at(book.publishedIn);
			let lane = laneEnds.findIndex((last) => x - last >= MIN_GAP_PERCENT);
			if (lane === -1) {
				lane = laneEnds.length < 4 ? laneEnds.length : 3;
			}
			laneEnds[lane] = x;
			return { book, x, lane };
		});

		const ticks: number[] = [];
		for (let year = start; year <= end; year += step) ticks.push(year);

		return {
			placed,
			ticks,
			at,
			born,
			died,
			lanes: Math.max(1, laneEnds.length),
		};
	}, [dated, birth.year, death.year, currentYear]);

	if (!geometry) {
		return null;
	}

	const { placed, ticks, at, born, died, lanes } = geometry;
	const active = dated.find((book) => book.slug === activeSlug) ?? null;
	const ageAtPublication =
		active && born != null ? active.publishedIn - born : null;
	const lifeLeft = born != null ? at(born) : 0;
	const lifeRight = died != null ? at(died) : 100;
	const height = lanes * LANE_HEIGHT + 12;

	function focusNeighbour(index: number, delta: number) {
		const next = placed[index + delta];
		if (!next) return;
		markers.current.get(next.book.slug)?.focus();
	}

	function showInList(slug: string) {
		const target = document.getElementById(authorBookAnchor(slug));
		if (!target) return;
		target.scrollIntoView({ behavior: "smooth", block: "center" });
		target.focus({ preventScroll: true });
	}

	return (
		<section
			className="flex flex-col gap-3"
			aria-label="Life and works on a timeline"
		>
			<div className="flex items-baseline justify-between gap-3">
				<h2 className="font-semibold text-sm tracking-tight">Life and works</h2>
				<p className="text-muted-foreground text-xs">
					{born != null ? "The shaded band is their lifetime. " : ""}
					Pick a mark to see the book.
				</p>
			</div>

			<div className="border border-border bg-muted/10 px-3 pt-3 pb-1">
				<div className="relative" style={{ height }}>
					<div
						className="absolute inset-y-0 border-border border-x bg-muted"
						style={{ left: `${lifeLeft}%`, width: `${lifeRight - lifeLeft}%` }}
						aria-hidden
					/>
					{born != null ? (
						<span
							className="absolute top-0 -translate-x-1/2 whitespace-nowrap bg-background px-1 text-3xs text-muted-foreground"
							style={{ left: `${lifeLeft}%` }}
						>
							Born {born}
						</span>
					) : null}
					{death.year != null ? (
						<span
							className="absolute bottom-0 -translate-x-1/2 whitespace-nowrap bg-background px-1 text-3xs text-muted-foreground"
							style={{ left: `${lifeRight}%` }}
						>
							Died {death.year}
						</span>
					) : null}
					<ul className="contents">
						{placed.map(({ book, x, lane }, index) => {
							const isActive = book.slug === activeSlug;
							return (
								<li key={book.slug}>
									<button
										type="button"
										ref={(node) => {
											if (node) markers.current.set(book.slug, node);
											else markers.current.delete(book.slug);
										}}
										aria-label={`${book.title}, ${book.publishedIn}`}
										aria-pressed={isActive}
										className={cn(
											"absolute -translate-x-1/2 border border-background outline-none transition-[height,width,background-color] focus-visible:ring-2 focus-visible:ring-ring",
											isActive
												? "z-10 h-5 w-3 bg-primary"
												: "h-4 w-2 bg-foreground hover:bg-primary",
										)}
										style={{
											left: `${x}%`,
											top: 6 + lane * LANE_HEIGHT + (isActive ? 0 : 2),
										}}
										onMouseEnter={() => setActiveSlug(book.slug)}
										onFocus={() => setActiveSlug(book.slug)}
										onClick={() => setActiveSlug(book.slug)}
										onKeyDown={(event) => {
											if (event.key === "ArrowRight") {
												event.preventDefault();
												focusNeighbour(index, 1);
											} else if (event.key === "ArrowLeft") {
												event.preventDefault();
												focusNeighbour(index, -1);
											}
										}}
									/>
								</li>
							);
						})}
					</ul>
				</div>
				<div
					className="relative mt-1 h-5 border-border border-t text-3xs text-muted-foreground tabular-nums"
					aria-hidden
				>
					{ticks.map((year) => (
						<span
							key={year}
							className="absolute top-1 -translate-x-1/2"
							style={{ left: `${at(year)}%` }}
						>
							{year}
						</span>
					))}
				</div>
			</div>

			{active ? (
				<div className="flex gap-3 border border-border p-3" aria-live="polite">
					<div className="w-14 shrink-0">
						<AuthorPageCover
							coverId={active.coverId}
							title={active.title}
							sizes="56px"
						/>
					</div>
					<div className="flex min-w-0 flex-1 flex-col gap-1">
						<p className="line-clamp-2 font-medium text-sm leading-snug">
							{active.title}
						</p>
						<p className="text-muted-foreground text-xs tabular-nums">
							Published {active.publishedIn}
							{ageAtPublication != null && ageAtPublication >= 0
								? `, when they were ${ageAtPublication}`
								: ""}
						</p>
						<p className="flex items-center gap-3 text-muted-foreground text-xs tabular-nums">
							{active.averageRating ? (
								<span className="inline-flex items-center gap-1">
									<Star className="size-3" aria-hidden />
									{f.decimal(active.averageRating, 1)}
								</span>
							) : null}
							<span>
								{active.readCount} {active.readCount === 1 ? "read" : "reads"}
							</span>
						</p>
						<div className="mt-auto flex flex-wrap gap-2 pt-1">
							<Button
								variant="outline"
								size="sm"
								nativeButton={false}
								render={<Link href={`/books/${active.slug}` as Route} />}
							>
								Open book
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => showInList(active.slug)}
							>
								Show in the list
							</Button>
						</div>
					</div>
				</div>
			) : null}

			<ol className="sr-only">
				{placed.map(({ book }) => (
					<li key={book.slug}>
						{book.publishedIn}: {book.title}
					</li>
				))}
			</ol>
		</section>
	);
}
