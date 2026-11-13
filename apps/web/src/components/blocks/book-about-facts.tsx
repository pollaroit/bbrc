import type { TGetBookBySlugOutputSchema } from "@bbrc/api/modules/book/book.schema";
import type { BookAbout } from "@bbrc/api/modules/book/book-about.service";
import {
	estimateReadingMinutes,
	formatEditionLanguage,
	formatReadingTime,
	getBookCountryName,
	openLibraryWorkPageUrl,
} from "@bbrc/shared";
import {
	BookCopy,
	CalendarDays,
	Clock,
	Database,
	FileText,
	Globe,
	Layers,
	type LucideIcon,
	Ruler,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { CountryLabel } from "@/components/blocks/country-dropdown";
import { BOOK_TONES, type BookTone } from "@/lib/book-tones";
import { cn } from "@/lib/utils";

const focusRing =
	"focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2";

function Fact({
	icon: Icon,
	tone,
	label,
	hint,
	children,
	note,
}: {
	icon: LucideIcon;
	tone?: BookTone;
	label: string;
	hint?: string;
	children: React.ReactNode;
	note?: React.ReactNode;
}) {
	return (
		<div
			title={hint}
			className="flex min-w-0 grow basis-36 flex-col justify-center gap-1 border-border border-r border-b bg-background px-4 py-3 sm:basis-48"
		>
			<span className="flex min-w-0 items-center gap-1.5 text-muted-foreground text-xs">
				<Icon
					className={cn("size-3.5 shrink-0", tone && BOOK_TONES[tone].ink)}
					aria-hidden
				/>
				<span className="truncate">{label}</span>
			</span>
			<span className="min-w-0 font-semibold text-lg leading-tight">
				{children}
			</span>
			{note ? (
				<span className="min-w-0 text-muted-foreground text-xs">{note}</span>
			) : null}
		</div>
	);
}

const linkClass = cn(
	"underline-offset-4 hover:underline motion-reduce:transition-none",
	focusRing,
);

/**
 * The book's catalogue facts in one hairline-divided strip, the same language
 * as the header's numbers. Cells wrap and stretch to fill each row, so a book
 * with fewer facts never leaves a hole.
 */
export function BookAboutFacts({
	book,
	about,
}: {
	book: TGetBookBySlugOutputSchema;
	about: BookAbout;
}) {
	const year = new Date().getFullYear();
	const age = year - book.publishedIn;
	const minutes = estimateReadingMinutes(book.pages);
	const olUrl = book.olid ? openLibraryWorkPageUrl(book.olid) : null;
	const comparison = about.lengthComparison;
	const { series, editions } = about;
	const languages = editions.languages.map(formatEditionLanguage);

	return (
		<div className="overflow-hidden border border-border">
			<div className="-mr-px -mb-px flex flex-wrap">
				{book.publishedIn > 0 ? (
					<Fact
						icon={CalendarDays}
						tone="success"
						label="First published"
						note={age > 0 ? `${age} years ago` : "This year"}
					>
						<Link
							href={
								`/books?minPublishedIn=${book.publishedIn}&maxPublishedIn=${book.publishedIn}` as Route
							}
							className={linkClass}
						>
							<span className="tabular-nums">{book.publishedIn}</span>
						</Link>
					</Fact>
				) : null}

				{book.pages > 0 ? (
					<Fact
						icon={FileText}
						tone="info"
						label="Length"
						hint="Reading time assumes about 250 words a minute"
						note={
							minutes > 0
								? `About ${formatReadingTime(minutes)} to read`
								: undefined
						}
					>
						<span className="tabular-nums">{book.pages}</span> pages
					</Fact>
				) : null}

				{comparison ? (
					<Fact
						icon={Ruler}
						tone="violet"
						label="Next to the library"
						note="of the books here"
					>
						{comparison.direction === "longer" ? "Longer" : "Shorter"} than{" "}
						<span className="tabular-nums">{comparison.percent}%</span>
					</Fact>
				) : null}

				{book.countries.length > 0 ? (
					<Fact
						icon={Globe}
						tone="info"
						label="Literary origin"
						hint="The country whose literature this belongs to, by the author's tradition. Not necessarily where the story is set."
					>
						<span className="flex flex-col gap-0.5 text-base">
							{book.countries.map((code) => (
								<Link
									key={code}
									href={`/books?countries=${encodeURIComponent(code)}` as Route}
									className={cn("w-fit", linkClass)}
								>
									<CountryLabel
										alpha2={code}
										name={getBookCountryName(code) ?? code}
									/>
								</Link>
							))}
						</span>
					</Fact>
				) : null}

				{series ? (
					<Fact
						icon={Layers}
						tone="violet"
						label="Series"
						note={
							series.next ? (
								<>
									Next:{" "}
									<Link
										href={`/books/${series.next.slug}` as Route}
										className={cn("text-foreground", linkClass)}
									>
										{series.next.title}
									</Link>
								</>
							) : series.previous ? (
								<>
									Before:{" "}
									<Link
										href={`/books/${series.previous.slug}` as Route}
										className={cn("text-foreground", linkClass)}
									>
										{series.previous.title}
									</Link>
								</>
							) : undefined
						}
					>
						<Link
							href={`/series/${series.slug}` as Route}
							className={linkClass}
						>
							<span className="tabular-nums">#{series.position}</span> of{" "}
							<span className="tabular-nums">{series.total}</span>
						</Link>
					</Fact>
				) : null}

				{editions.count > 0 ? (
					<Fact
						icon={BookCopy}
						tone="pink"
						label="Editions from members"
						note={languages.join(", ") || undefined}
					>
						<Link
							href={`/books/${book.slug}/editions` as Route}
							className={linkClass}
						>
							<span className="tabular-nums">{editions.count}</span>{" "}
							{editions.count === 1 ? "edition" : "editions"}
						</Link>
					</Fact>
				) : null}

				<Fact
					icon={Database}
					tone="info"
					label="Details from"
					note={
						book.openLibraryRating != null ? (
							<>
								<span className="tabular-nums">
									{book.openLibraryRating.toFixed(1)}
								</span>{" "}
								out of 5 there
							</>
						) : undefined
					}
				>
					{olUrl ? (
						<a
							href={olUrl}
							target="_blank"
							rel="noreferrer"
							className={linkClass}
						>
							Open Library
						</a>
					) : (
						"Added by hand"
					)}
				</Fact>

				<Fact icon={Clock} label="Added to BBRC">
					{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
						book.createdAt,
					)}
				</Fact>
			</div>
		</div>
	);
}
