import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import {
	authorNameToSlug,
	contentPlainText,
	formatFeedbackRating,
} from "@bbrc/shared";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@bbrc/ui/components/avatar";
import { Star, Trophy } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { BookCountriesSummary } from "@/components/blocks/book-countries-summary";
import { BookStatusBadge } from "@/components/blocks/book-status-badge";
import {
	ReadingTimeline,
	VotingProgress,
} from "@/components/blocks/sitting-card-parts";
import { bookCoverUrl } from "@/lib/book-cover";
import { formatClubDateTime } from "@/lib/club-timezone";
import { cn } from "@/lib/utils";

type Sitting = GetSittingBySlugOutput;

const progressBarClass = {
	completed: "bg-success",
	in_progress: "bg-primary",
	not_started: "bg-warning",
	dnf: "bg-destructive",
} as const;

const progressDotClass = progressBarClass;

// Defined here: the shared labels live in a client module, which a server
// component cannot read values from.
const progressLabels = {
	not_started: "Not started",
	in_progress: "Reading",
	completed: "Completed",
	dnf: "Did not finish",
} as const;

const progressOrder = [
	"completed",
	"in_progress",
	"not_started",
	"dnf",
] as const;

function Section({
	title,
	href,
	linkLabel = "See all",
	className,
	children,
}: {
	title: string;
	href?: Route;
	linkLabel?: string;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<section className={cn("flex min-w-0 flex-col gap-3", className)}>
			<div className="flex items-baseline justify-between gap-3">
				<h2 className="font-semibold text-base tracking-tight">{title}</h2>
				{href ? (
					<Link
						href={href}
						className="text-muted-foreground text-sm transition-colors hover:text-foreground"
					>
						{linkLabel}
					</Link>
				) : null}
			</div>
			{children}
		</section>
	);
}

function ProgressSection({ sitting }: { sitting: Sitting }) {
	const { stats } = sitting;
	const total = stats.participantCount;
	const isVoting = sitting.status === "voting";

	return (
		<Section title={isVoting ? "Voting" : "Progress"}>
			<div className="flex flex-col gap-4 border border-border p-4">
				{isVoting ? (
					sitting.poll ? (
						<VotingProgress
							poll={{
								createdAt: sitting.createdAt,
								deadline: sitting.poll.deadline,
							}}
						/>
					) : null
				) : (
					<>
						<div className="flex flex-col gap-2">
							<div
								className="flex h-2 overflow-hidden border border-border bg-muted/30"
								role="img"
								aria-label={`${stats.progressCounts.completed} of ${total} readers finished`}
							>
								{progressOrder.map((key) => {
									const count = stats.progressCounts[key];
									return count > 0 ? (
										<div
											key={key}
											className={progressBarClass[key]}
											style={{ width: `${(count / total) * 100}%` }}
										/>
									) : null;
								})}
							</div>
							<ul className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs tabular-nums">
								{progressOrder.map((key) =>
									stats.progressCounts[key] > 0 ? (
										<li key={key} className="inline-flex items-center gap-1.5">
											<span
												className={cn("size-2", progressDotClass[key])}
												aria-hidden
											/>
											{stats.progressCounts[key]}{" "}
											{progressLabels[key].toLowerCase()}
										</li>
									) : null,
								)}
							</ul>
						</div>
						{sitting.deadline ? (
							<ReadingTimeline
								start={sitting.readingStartedAt ?? sitting.createdAt}
								end={sitting.deadline}
								finished={sitting.status === "finished"}
							/>
						) : null}
					</>
				)}
			</div>
		</Section>
	);
}

function BookSection({ sitting }: { sitting: Sitting }) {
	const book = sitting.selectedBook;
	if (!book) return null;

	const facts: { label: string; value: string }[] = [
		{ label: "Published", value: String(book.publishedIn) },
		{ label: "Pages", value: String(book.pages) },
		...(book.openLibraryRating != null
			? [
					{
						label: "Open Library",
						value: `${book.openLibraryRating.toFixed(1)} / 5`,
					},
				]
			: []),
		...(book.averageRating != null
			? [
					{
						label: "Club rating",
						value: `${book.averageRating.toFixed(1)} / 5`,
					},
				]
			: []),
	];

	return (
		<Section
			title="The book"
			href={`/books/${book.slug}` as Route}
			linkLabel="Open book page"
		>
			<div className="flex flex-col gap-3 border border-border p-4">
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0">
						<p className="font-medium text-sm leading-snug">
							<Link
								href={`/books/${book.slug}` as Route}
								className="hover:underline"
							>
								{book.title}
							</Link>
						</p>
						<p className="text-muted-foreground text-sm">
							{book.authors.map((author, index) => (
								<span key={author}>
									{index > 0 ? ", " : null}
									<Link
										href={`/authors/${authorNameToSlug(author)}` as Route}
										className="hover:text-foreground hover:underline"
									>
										{author}
									</Link>
								</span>
							))}
						</p>
					</div>
					<BookStatusBadge status={book.status} />
				</div>
				{book.countries.length > 0 ? (
					<BookCountriesSummary countries={book.countries} maxVisible={4} />
				) : null}
				<dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-border border-t pt-3 text-sm">
					{facts.map((fact) => (
						<div key={fact.label}>
							<dt className="text-muted-foreground text-xs">{fact.label}</dt>
							<dd className="tabular-nums">{fact.value}</dd>
						</div>
					))}
				</dl>
			</div>
		</Section>
	);
}

function VotingSection({ sitting }: { sitting: Sitting }) {
	const poll = sitting.poll;
	if (!poll) return null;

	const voteHref = `/sittings/${sitting.slug}/vote` as Route;
	const isVoting = sitting.status === "voting";

	if (isVoting) {
		const options = poll.options.slice(0, 6);
		return (
			<Section title="On the ballot" href={voteHref} linkLabel="Open ballot">
				<div className="flex flex-col gap-3 border border-border p-4">
					<ul className="flex gap-2 overflow-x-auto">
						{options.map((option) => {
							const src = bookCoverUrl(option.book.coverId);
							return (
								<li key={option.id} className="shrink-0">
									<span
										className="relative block aspect-2/3 w-14 overflow-hidden bg-muted ring-1 ring-foreground/10"
										title={option.book.title}
									>
										{src ? (
											<Image
												src={src}
												alt={option.book.title}
												fill
												className="object-cover"
												sizes="56px"
											/>
										) : null}
									</span>
								</li>
							);
						})}
					</ul>
					<p className="text-muted-foreground text-sm">
						{poll.options.length} books to choose from. Voting closes{" "}
						{formatClubDateTime(poll.deadline)}.
					</p>
				</div>
			</Section>
		);
	}

	const ranked = poll.options.toSorted(
		(a, b) => b.pointTotal - a.pointTotal || b.voteCount - a.voteCount,
	);
	const top = ranked.slice(0, 3);
	const maxPoints = Math.max(1, ...top.map((option) => option.pointTotal));

	return (
		<Section title="How the vote went" href={voteHref} linkLabel="Full results">
			<ul className="flex flex-col gap-3 border border-border p-4">
				{top.map((option) => {
					const winner = option.book.slug === sitting.selectedBook?.slug;
					return (
						<li key={option.id} className="flex flex-col gap-1">
							<div className="flex items-center justify-between gap-3 text-sm">
								<span className="flex min-w-0 items-center gap-1.5">
									{winner ? (
										<Trophy
											className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400"
											aria-label="Winner"
										/>
									) : null}
									<span className={cn("truncate", winner && "font-medium")}>
										{option.book.title}
									</span>
								</span>
								<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
									{option.pointTotal} pts · {option.voteCount}{" "}
									{option.voteCount === 1 ? "voter" : "voters"}
								</span>
							</div>
							<div className="h-1.5 bg-muted/40">
								<div
									className={cn(
										"h-full",
										winner ? "bg-foreground" : "bg-foreground/30",
									)}
									style={{ width: `${(option.pointTotal / maxPoints) * 100}%` }}
								/>
							</div>
						</li>
					);
				})}
			</ul>
		</Section>
	);
}

function ReadersSection({ sitting }: { sitting: Sitting }) {
	const people = sitting.participants;
	const shown = people.slice(0, 10);
	const hidden = people.length - shown.length;
	const showProgress = sitting.status !== "voting";

	return (
		<Section
			title={`Readers (${people.length})`}
			href={`/sittings/${sitting.slug}/participants` as Route}
			linkLabel="Everyone"
		>
			<ul className="grid grid-cols-5 gap-x-2 gap-y-3 border border-border p-4 sm:grid-cols-5">
				{shown.map((person) => (
					<li key={person.userId} className="min-w-0">
						<Link
							href={`/users/${person.username}` as Route}
							className="flex flex-col items-center gap-1 text-center"
							title={
								showProgress
									? `${person.name} — ${progressLabels[person.progress]}`
									: person.name
							}
						>
							<span className="relative">
								<Avatar className="size-10">
									<AvatarImage src={person.image ?? undefined} />
									<AvatarFallback>{person.name.charAt(0)}</AvatarFallback>
								</Avatar>
								{showProgress ? (
									<span
										className={cn(
											"absolute right-0 bottom-0 size-3 border-2 border-background",
											progressDotClass[person.progress],
										)}
										aria-hidden
									/>
								) : null}
							</span>
							<span className="w-full truncate text-xs">
								{person.name.split(" ")[0]}
							</span>
						</Link>
					</li>
				))}
				{hidden > 0 ? (
					<li className="flex items-center justify-center text-muted-foreground text-xs">
						+{hidden}
					</li>
				) : null}
			</ul>
		</Section>
	);
}

function ReviewsSection({ sitting }: { sitting: Sitting }) {
	const book = sitting.selectedBook;
	if (!book || sitting.status === "voting") return null;

	const { reviews } = sitting;
	const { stats } = sitting;
	const preview = reviews
		.filter((review) => contentPlainText(review.review).trim().length > 0)
		.slice(0, 3);

	return (
		<Section
			title="Reviews"
			href={`/sittings/${sitting.slug}/reviews` as Route}
			linkLabel={reviews.length > 0 ? "All reviews" : undefined}
		>
			{reviews.length === 0 ? (
				<p className="border border-border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
					No reviews yet. Readers can review {book.title} once they finish it.
				</p>
			) : (
				<div className="flex flex-col divide-y divide-border border border-border">
					<p className="flex items-center gap-1.5 px-4 py-3 text-sm">
						<Star
							className="size-4 fill-amber-500 text-amber-500"
							aria-hidden
						/>
						<span className="font-medium tabular-nums">
							{stats.averageRating != null
								? formatFeedbackRating(Number(stats.averageRating.toFixed(1)))
								: "—"}
						</span>
						<span className="text-muted-foreground">
							average from {stats.reviewCount}{" "}
							{stats.reviewCount === 1 ? "review" : "reviews"}
						</span>
					</p>
					{preview.map((review) => (
						<Link
							key={review.slug}
							href={`/books/${book.slug}/feedbacks/${review.slug}` as Route}
							className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/40"
						>
							<span className="flex items-center justify-between gap-2 text-sm">
								<span className="font-medium">{review.name}</span>
								<span className="inline-flex items-center gap-1 text-xs tabular-nums">
									<Star
										className="size-3 fill-amber-500 text-amber-500"
										aria-hidden
									/>
									{formatFeedbackRating(review.rating)}
								</span>
							</span>
							<span
								className={cn(
									"line-clamp-2 text-muted-foreground text-sm",
									review.isSpoiler && "italic",
								)}
							>
								{review.isSpoiler
									? "Spoiler — open to read"
									: contentPlainText(review.review).trim()}
							</span>
						</Link>
					))}
				</div>
			)}
		</Section>
	);
}

/** Landing view: where the sitting stands, plus a preview of each section. */
export function SittingOverview({ sitting }: { sitting: Sitting }) {
	return (
		<div className="flex flex-col gap-8 md:grid md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-start md:gap-10">
			<div className="contents md:flex md:flex-col md:gap-8">
				<div className="order-1 md:order-none">
					<ProgressSection sitting={sitting} />
				</div>
				<div className="order-3 md:order-none">
					<VotingSection sitting={sitting} />
				</div>
				<div className="order-5 md:order-none">
					<ReviewsSection sitting={sitting} />
				</div>
			</div>
			<div className="contents md:flex md:flex-col md:gap-8">
				<div className="order-2 md:order-none">
					<BookSection sitting={sitting} />
				</div>
				<div className="order-4 md:order-none">
					<ReadersSection sitting={sitting} />
				</div>
			</div>
		</div>
	);
}
