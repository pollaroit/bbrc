import type { TGetBookBySlugOutputSchema } from "@bbrc/api/modules/book/book.schema";
import type { BookPulse } from "@bbrc/api/modules/book/book-pulse.service";
import { getBookCountryName, openLibraryWorkPageUrl } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	ArrowLeft,
	Bookmark,
	BookOpen,
	CalendarDays,
	CircleCheck,
	ExternalLink,
	EyeOff,
	FileText,
	Layers,
	type LucideIcon,
	Star,
	UserRound,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { BookActionDock } from "@/components/blocks/book-action-dock";
import { BookAuthorLinks } from "@/components/blocks/book-author-links";
import { BookCover } from "@/components/blocks/book-cover";
import { BookPrimaryAction } from "@/components/blocks/book-primary-action";
import { BookReadAfterLinks } from "@/components/blocks/book-read-after-links";
import { BookStatStrip } from "@/components/blocks/book-stat-strip";
import { BookViewsChip } from "@/components/blocks/book-views-chip";
import { CountryFlagIcon } from "@/components/blocks/country-dropdown";
import { BookReadingStrip } from "@/components/blocks/reading/book-reading-strip";
import { bookCoverUrl } from "@/lib/book-cover";
import { BOOK_TONES, type BookTone } from "@/lib/book-tones";
import { cn } from "@/lib/utils";

type BookHeaderProps = {
	book: TGetBookBySlugOutputSchema;
	pulse: BookPulse;
};

const STATUS: Record<
	TGetBookBySlugOutputSchema["status"],
	{ label: string; hint: string; icon: LucideIcon; tone: BookTone }
> = {
	completed: {
		label: "Completed",
		hint: "The club has finished reading this title.",
		icon: CircleCheck,
		tone: "success",
	},
	reading: {
		label: "Reading",
		hint: "This book is in an active club read.",
		icon: BookOpen,
		tone: "info",
	},
	wishlist: {
		label: "Wishlist",
		hint: "Queued for a future sitting or vote.",
		icon: Bookmark,
		tone: "violet",
	},
};

const focusRing =
	"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2";

/** One fact about the book. Every chip is the same height, so a row always lines up. */
function Chip({
	icon: Icon,
	tone,
	href,
	external = false,
	title,
	children,
}: {
	icon?: LucideIcon;
	tone?: BookTone;
	href?: string;
	external?: boolean;
	title?: string;
	children: React.ReactNode;
}) {
	const className =
		"inline-flex h-7 max-w-full items-center gap-1.5 border border-border px-2 text-sm";
	const content = (
		<>
			{Icon ? (
				<Icon
					className={cn(
						"size-3.5 shrink-0",
						tone ? BOOK_TONES[tone].ink : "text-muted-foreground",
					)}
					aria-hidden
				/>
			) : null}
			<span className="truncate">{children}</span>
			{external ? (
				<ExternalLink
					className="size-3 shrink-0 text-muted-foreground"
					aria-hidden
				/>
			) : null}
		</>
	);

	if (!href) {
		return (
			<span className={className} title={title}>
				{content}
			</span>
		);
	}

	const linkClass = cn(
		className,
		"transition-colors hover:bg-muted motion-reduce:transition-none",
		focusRing,
	);

	return external ? (
		<a
			href={href}
			target="_blank"
			rel="noreferrer"
			className={linkClass}
			title={title}
		>
			{content}
		</a>
	) : (
		<Link href={href as Route} className={linkClass} title={title}>
			{content}
		</Link>
	);
}

export function BookHeader({ book, pulse }: BookHeaderProps) {
	const coverSrc = bookCoverUrl(book.coverId, "L");
	const olWorkUrl = book.olid ? openLibraryWorkPageUrl(book.olid) : null;
	const status = STATUS[book.status];
	const countries = book.countries.flatMap((code) => {
		const name = getBookCountryName(code);
		return name ? [{ code, name }] : [];
	});
	const requester = book.requestedBy;

	return (
		<header className="flex min-w-0 flex-col gap-5">
			<Button
				variant="outline"
				nativeButton={false}
				render={<Link href={"/books" as Route} />}
				className="group/back h-8 w-fit gap-1.5 pr-3 pl-2 text-sm"
			>
				<ArrowLeft
					className="size-4 text-muted-foreground transition-transform group-hover/back:-translate-x-0.5 motion-reduce:transition-none"
					aria-hidden
				/>
				All books
			</Button>

			<div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-start sm:gap-x-8 sm:gap-y-3 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-x-10">
				<div className="order-1 mx-auto w-full max-w-56 sm:col-start-1 sm:row-start-1 sm:mx-0 sm:max-w-none">
					<BookCover
						key={book.slug}
						src={coverSrc}
						title={book.title}
						authors={book.authors}
						seed={book.slug}
						priority
					/>
				</div>

				<div className="order-3 sm:col-start-1 sm:row-start-2">
					<BookPrimaryAction
						slug={book.slug}
						title={book.title}
						pages={book.pages}
					/>
				</div>

				{/* Phones lay these two out in the grid's own order; from sm up they are one column beside the cover. */}
				<div className="contents sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:flex sm:min-w-0 sm:flex-col sm:gap-5">
					<div className="order-2 flex min-w-0 flex-col gap-5">
						<div className="flex min-w-0 flex-col gap-2">
							<h1 className="wrap-break-word min-w-0 text-balance font-semibold text-4xl leading-[1.08] tracking-tight sm:text-5xl">
								{book.title}
							</h1>
							<BookAuthorLinks
								authors={book.authors}
								refs={book.authorRefs}
								withPhotos
								className="text-lg leading-relaxed"
							/>
							<BookReadAfterLinks readAfterBooks={book.readAfterBooks} />
						</div>

						<div className="flex flex-wrap items-center gap-2">
							<Chip icon={status.icon} tone={status.tone} title={status.hint}>
								{status.label}
							</Chip>
							{book.hidden ? (
								<Chip
									icon={EyeOff}
									tone="warning"
									title="Never offered to a sitting"
								>
									Hidden from sittings
								</Chip>
							) : null}
							{book.series ? (
								<Chip
									icon={Layers}
									tone="violet"
									href={`/series/${book.series.slug}`}
								>
									<span className="tabular-nums">#{book.series.position}</span>{" "}
									in {book.series.title}
								</Chip>
							) : null}
							{book.pages > 0 ? (
								<Chip icon={FileText} tone="info">
									<span className="tabular-nums">{book.pages}</span> pages
								</Chip>
							) : null}
							{book.publishedIn != null ? (
								<Chip
									icon={CalendarDays}
									tone="success"
									href={`/books?minPublishedIn=${book.publishedIn}&maxPublishedIn=${book.publishedIn}`}
								>
									<span className="tabular-nums">{book.publishedIn}</span>
								</Chip>
							) : null}
							{countries.slice(0, 2).map((country) => (
								<span
									key={country.code}
									className="inline-flex h-7 items-center gap-1.5 border border-border px-2 text-sm"
								>
									<CountryFlagIcon alpha2={country.code} size="sm" />
									{country.name}
								</span>
							))}
							{countries.length > 2 ? (
								<Chip>
									<span className="tabular-nums">+{countries.length - 2}</span>
								</Chip>
							) : null}
							<BookViewsChip slug={book.slug} />
							{olWorkUrl ? (
								<Chip icon={Star} tone="warning" href={olWorkUrl} external>
									{book.openLibraryRating != null ? (
										<>
											<span className="tabular-nums">
												{book.openLibraryRating.toFixed(1)}
											</span>{" "}
											on Open Library
										</>
									) : (
										"Open Library"
									)}
								</Chip>
							) : null}
							{requester ? (
								<Chip
									icon={UserRound}
									href={`/users/${requester.username}`}
									title="Asked for this book"
								>
									Requested by {requester.name?.trim() || requester.username}
								</Chip>
							) : null}
						</div>
					</div>

					<div className="order-4 flex min-w-0 flex-col gap-5">
						<BookStatStrip
							slug={book.slug}
							average={book.averageRating ?? null}
							pulse={pulse}
						/>

						<BookActionDock
							slug={book.slug}
							title={book.title}
							hidden={book.hidden}
						/>
					</div>
				</div>

				{/* Its own row under both columns, so it never pushes the primary button away from the cover. */}
				<div className="order-5 min-w-0 empty:hidden sm:col-span-2 sm:row-start-3">
					<BookReadingStrip
						bookSlug={book.slug}
						bookTitle={book.title}
						bookPages={book.pages}
					/>
				</div>
			</div>
		</header>
	);
}
