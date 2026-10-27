import type { EditionPage } from "@bbrc/api/modules/edition/edition.schema";
import type { Formatters } from "@bbrc/i18n";
import { Star } from "lucide-react";
import type { Route } from "next";
import { EditionSection } from "@/components/blocks/edition-page/section";
import { Link } from "@/i18n/navigation";
import { useFormatters } from "@/lib/i18n/use-formatters";

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

const days = (f: Formatters, value: number) =>
	`${f.decimal(value, value % 1 === 0 ? 0 : 1)} ${value === 1 ? "day" : "days"}`;

/** Numbers about this edition, and the rating its readers gave the BOOK. */
export function EditionStats({
	stats,
	bookSlug,
}: {
	stats: EditionPage["stats"];
	bookSlug: string;
}) {
	const f = useFormatters();
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
							? days(f, stats.averageDaysToFinish)
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
							? `${f.decimal(stats.pagesPerDay, stats.pagesPerDay % 1 === 0 ? 0 : 1)} p/day`
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
							{f.rating(bookRating.average)}
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
