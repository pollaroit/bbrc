import type { AuthorProfile } from "@bbrc/api/modules/author/author.schema";

type LifelineBook = { title: string; publishedIn: number };

type AuthorPageLifelineProps = {
	birth: AuthorProfile["birth"];
	death: AuthorProfile["death"];
	books: LifelineBook[];
	currentYear: number;
};

/** The life as a bar and every book we have as a mark at the year it was published. */
export function AuthorPageLifeline({
	birth,
	death,
	books,
	currentYear,
}: AuthorPageLifelineProps) {
	const dated = books.filter((book) => book.publishedIn > 0);
	if (dated.length === 0) {
		return null;
	}

	const years = dated.map((book) => book.publishedIn);
	const born = birth.year;
	const died = death.year ?? (born != null ? currentYear : null);
	const start = Math.min(born ?? Number.POSITIVE_INFINITY, ...years);
	const end = Math.max(died ?? Number.NEGATIVE_INFINITY, ...years);
	const span = Math.max(1, end - start);
	const at = (year: number) => ((year - start) / span) * 100;

	// Books of the same year stack on top of each other.
	const byYear = new Map<number, string[]>();
	for (const book of dated) {
		byYear.set(book.publishedIn, [
			...(byYear.get(book.publishedIn) ?? []),
			book.title,
		]);
	}

	const lifeLeft = born != null ? at(born) : 0;
	const lifeRight = died != null ? at(died) : 100;

	return (
		<section
			className="flex flex-col gap-2"
			aria-label="Life and works on a timeline"
		>
			<h2 className="font-semibold text-sm tracking-tight">Life and works</h2>
			<div className="relative h-14 border border-border bg-muted/20">
				<div
					className="absolute inset-y-0 border-border border-x bg-muted"
					style={{ left: `${lifeLeft}%`, width: `${lifeRight - lifeLeft}%` }}
					aria-hidden
				/>
				{[...byYear.entries()].map(([year, titles]) => (
					<div
						key={year}
						className="absolute bottom-0 w-0.5 -translate-x-1/2 bg-foreground"
						style={{
							left: `${at(year)}%`,
							height: `${Math.min(100, 28 + titles.length * 18)}%`,
						}}
						title={`${year}: ${titles.join(", ")}`}
					/>
				))}
			</div>
			<div className="flex justify-between text-2xs text-muted-foreground tabular-nums">
				<span>{start}</span>
				<span>
					{born != null ? "Shaded: lifetime. " : ""}Marks: books in our library
				</span>
				<span>{end}</span>
			</div>
			<ol className="sr-only">
				{[...byYear.entries()].map(([year, titles]) => (
					<li key={year}>
						{year}: {titles.join(", ")}
					</li>
				))}
			</ol>
		</section>
	);
}
