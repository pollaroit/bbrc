import type { EditionPage } from "@bbrc/api/modules/edition/edition.schema";
import { Star } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { EditionSection } from "@/components/blocks/edition-page/section";

function Tile({
	label,
	value,
	hint,
}: {
	label: string;
	value: string;
	hint?: string;
}) {
	return (
		<div className="flex flex-col gap-1 bg-card p-3 sm:p-4">
			<dt className="text-muted-foreground text-xs">{label}</dt>
			<dd className="font-semibold text-2xl tabular-nums tracking-tight">
				{value}
			</dd>
			{hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
		</div>
	);
}

const days = (value: number) =>
	`${value % 1 === 0 ? value : value.toFixed(1)} ${value === 1 ? "day" : "days"}`;

/** Numbers about this edition, and the rating its readers gave the BOOK. */
export function EditionStats({
	stats,
	bookSlug,
}: {
	stats: EditionPage["stats"];
	bookSlug: string;
}) {
	const { bookRating } = stats;

	return (
		<EditionSection
			id="edition-stats"
			title="In the club"
			description="How members get on with this edition."
		>
			<dl className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
				<Tile label="Reading now" value={String(stats.readingNow)} />
				<Tile label="Finished" value={String(stats.finished)} />
				<Tile
					label="Time to finish"
					value={
						stats.averageDaysToFinish != null
							? days(stats.averageDaysToFinish)
							: "—"
					}
					hint={
						stats.averageDaysToFinish != null
							? "on average"
							: "no finished readings yet"
					}
				/>
				<Tile
					label="Pace"
					value={
						stats.pagesPerDay != null
							? `${stats.pagesPerDay % 1 === 0 ? stats.pagesPerDay : stats.pagesPerDay.toFixed(1)} p/day`
							: "—"
					}
					hint={stats.pagesPerDay != null ? "while reading it" : undefined}
				/>
			</dl>
			<p className="flex flex-wrap items-center gap-x-2 gap-y-1 border border-border border-dashed p-3 text-sm">
				<Star className="size-4 text-warning-ink" aria-hidden />
				{bookRating.average != null ? (
					<span>
						Readers of this edition rate the <em>book</em>{" "}
						<strong className="tabular-nums">
							{bookRating.average.toFixed(1)}
						</strong>{" "}
						<span className="text-muted-foreground tabular-nums">
							({bookRating.count}{" "}
							{bookRating.count === 1 ? "review" : "reviews"})
						</span>
					</span>
				) : (
					<span className="text-muted-foreground">
						No reviews yet from readers of this edition.
					</span>
				)}
				<span className="text-muted-foreground text-xs">
					Reviews are for the book, not the edition.{" "}
					<Link
						href={`/books/${bookSlug}/reviews` as Route}
						className="text-foreground underline underline-offset-4"
					>
						All reviews
					</Link>
				</span>
			</p>
		</EditionSection>
	);
}
