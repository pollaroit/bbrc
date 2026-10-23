import type { PeopleListItem } from "@bbrc/api/modules/people/people.schema";
import type { LucideIcon } from "lucide-react";
import {
	BookOpen,
	Crown,
	Flame,
	MapPin,
	MessageSquareText,
	PenLine,
	Sofa,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { UserAvatar } from "@/components/blocks/user-avatar";
import type { PeopleSortField } from "@/lib/listing/people-listing";
import { cn } from "@/lib/utils";

type PeopleCardProps = {
	person: PeopleListItem;
	/** True for the signed-in member's own card. */
	isViewer?: boolean;
	/** The grid's current sort; figures that have no room on the card appear in the top strip when sorted by. */
	sortBy?: PeopleSortField;
};

const NEW_MEMBER_DAYS = 14;

type SortMetric = { label: string; value: string; href?: string };

/** Sorts whose figure is not already on the card (the strips cover xp, rp, reads, reviews, posts, sittings and streak). */
function sortMetricFor(
	person: PeopleListItem,
	sortBy: PeopleSortField | undefined,
): SortMetric | null {
	const base = `/users/${person.username}`;
	switch (sortBy) {
		case "averageRating":
			return {
				label: "Avg rating given",
				value:
					person.averageRatingGiven != null
						? person.averageRatingGiven.toFixed(2)
						: "—",
				href: `${base}/feedbacks`,
			};
		case "authors":
			return {
				label: "Authors read",
				value: String(person.authorsRead),
				href: `${base}/reads`,
			};
		case "participations":
			return {
				label: "Sittings joined",
				value: String(person.sittingsJoined),
				href: `${base}/sittings`,
			};
		case "shelves":
			return {
				label: "Shelves",
				value: String(person.shelves),
				href: `${base}/shelves`,
			};
		case "favorites":
			return {
				label: "Favorites",
				value: String(person.favorites),
				href: base,
			};
		case "quizzes":
			return {
				label: "Quizzes taken",
				value: String(person.quizzesTaken),
				href: `${base}/quizzes`,
			};
		case "documents":
			return {
				label: "Documents shared",
				value: String(person.documentsShared),
			};
		default:
			return null;
	}
}

const joinedFormat = new Intl.DateTimeFormat("en", {
	month: "short",
	year: "numeric",
	timeZone: "UTC",
});

type Highlight = { label: string; className: string; href?: Route };

/** The strip names the most notable thing about the member; the rest sit in the main part. */
function highlightFor(person: PeopleListItem, isViewer: boolean): Highlight {
	if (person.status === "banned") {
		return { label: "Banned", className: "bg-destructive/10 text-destructive" };
	}
	if (person.readingNow) {
		return {
			label: "Reading in a sitting now",
			className: "bg-info/10 text-info-ink",
			href: `/sittings/${person.readingNow.sittingSlug}` as Route,
		};
	}
	if (person.status === "warned") {
		return {
			label: "Warned",
			className: "bg-warning/10 text-warning-ink",
		};
	}
	if (isViewer) {
		return { label: "You", className: "bg-primary/10 text-foreground" };
	}
	if (person.isAdmin) {
		return {
			label: "Administrator",
			className: "bg-warning/10 text-warning-ink",
		};
	}
	const ageDays =
		(Date.now() - new Date(person.createdAt).getTime()) / 86_400_000;
	if (ageDays <= NEW_MEMBER_DAYS) {
		return {
			label: "New here",
			className: "bg-success/10 text-success-ink",
		};
	}
	return { label: "Member", className: "bg-muted/30 text-muted-foreground" };
}

const stripLinkClassName =
	"inline-flex min-w-0 items-center transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none";

function Stat({
	icon: Icon,
	value,
	title,
	href,
}: {
	icon: LucideIcon;
	value: number | string;
	title: string;
	href: Route;
}) {
	return (
		<Link
			href={href}
			className={cn(stripLinkClassName, "shrink-0 gap-0.5 tabular-nums")}
			title={title}
			aria-label={`${title}: ${value}`}
		>
			<Icon className="size-3.5 shrink-0" aria-hidden />
			<span>{value}</span>
		</Link>
	);
}

function LevelLink({
	href,
	level,
	points,
	unit,
	title,
}: {
	href: Route;
	level: string;
	points: number;
	unit: string;
	title: string;
}) {
	return (
		<Link
			href={href}
			className={cn(
				stripLinkClassName,
				"min-w-0 flex-1 justify-between gap-2 px-3 py-1.5",
			)}
			title={title}
		>
			<span className="truncate font-medium text-foreground">{level}</span>
			<span className="shrink-0 tabular-nums">
				{points} {unit}
			</span>
		</Link>
	);
}

export function PeopleCard({
	person,
	isViewer = false,
	sortBy,
}: PeopleCardProps) {
	const profileHref = `/users/${person.username}` as Route;
	const highlight = highlightFor(person, isViewer);
	const metric = sortMetricFor(person, sortBy);
	const about =
		person.bio ??
		(person.favoriteGenres.length > 0
			? `Reads ${person.favoriteGenres.join(", ")}`
			: null);

	return (
		<article className="relative flex h-full flex-col overflow-hidden border border-border bg-card transition-colors focus-within:bg-muted/20 hover:bg-muted/20">
			<div
				className={cn(
					"relative z-2 flex items-center justify-between gap-2 border-border border-b px-3 py-1.5 font-medium text-xs",
					highlight.className,
				)}
			>
				{highlight.href ? (
					<Link
						href={highlight.href}
						className="min-w-0 truncate underline-offset-4 hover:underline"
					>
						{highlight.label}
					</Link>
				) : (
					<span className="min-w-0 truncate">{highlight.label}</span>
				)}
				{metric ? (
					metric.href ? (
						<Link
							href={metric.href as Route}
							className="shrink-0 tabular-nums underline-offset-4 hover:underline"
						>
							<span className="font-normal opacity-80">{metric.label} </span>
							<span className="font-semibold">{metric.value}</span>
						</Link>
					) : (
						<span className="shrink-0 tabular-nums">
							<span className="font-normal opacity-80">{metric.label} </span>
							<span className="font-semibold">{metric.value}</span>
						</span>
					)
				) : (
					<span className="shrink-0 font-normal opacity-80">
						Joined {joinedFormat.format(new Date(person.createdAt))}
					</span>
				)}
			</div>

			<div className="relative flex min-h-[8rem] flex-1">
				<Link
					href={profileHref}
					aria-label={`${person.name}, @${person.username}`}
					className="absolute inset-0 z-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
				/>
				<div className="pointer-events-none relative z-1 flex min-w-0 flex-1 gap-3 p-3 sm:gap-4 sm:p-4">
					<UserAvatar user={person} className="size-14 shrink-0" />
					<div className="flex min-w-0 flex-1 flex-col gap-1">
						<h2 className="flex min-w-0 items-center gap-1.5 font-semibold text-base leading-snug tracking-tight">
							<span className="truncate">{person.name}</span>
							{person.isAdmin ? (
								<Crown
									className="size-4 shrink-0 text-warning"
									aria-label="Administrator"
								/>
							) : null}
						</h2>
						<p className="truncate text-muted-foreground text-sm">
							@{person.username}
						</p>
						{about ? (
							<p className="line-clamp-2 text-muted-foreground text-xs leading-relaxed">
								{about}
							</p>
						) : null}
						{person.location ? (
							<p className="mt-auto inline-flex items-center gap-1 pt-1 text-muted-foreground text-xs">
								<MapPin className="size-3.5 shrink-0" aria-hidden />
								<span className="truncate">{person.location}</span>
							</p>
						) : null}
					</div>
				</div>
			</div>

			<div className="relative z-2 flex divide-x divide-border border-border border-t bg-muted/10 text-muted-foreground text-xs">
				<LevelLink
					href={`/users/${person.username}/xp` as Route}
					level={person.xpLevel.label}
					points={person.xp}
					unit="XP"
					title={`${person.xp} experience points`}
				/>
				<LevelLink
					href={`/users/${person.username}/rp` as Route}
					level={person.rpLevel.label}
					points={person.rp}
					unit="RP"
					title={`${person.rp} reading points`}
				/>
			</div>
			<div className="relative z-2 flex flex-nowrap items-center justify-between gap-1 border-border border-t bg-muted/10 px-3 py-1.5 text-muted-foreground text-xs tabular-nums">
				<Stat
					icon={BookOpen}
					value={person.reads}
					title="Books read"
					href={`/users/${person.username}/reads` as Route}
				/>
				<Stat
					icon={MessageSquareText}
					value={person.reviews}
					title="Reviews"
					href={`/users/${person.username}/feedbacks` as Route}
				/>
				<Stat
					icon={PenLine}
					value={person.posts}
					title="Posts"
					href={`/users/${person.username}/posts` as Route}
				/>
				<Stat
					icon={Sofa}
					value={person.sittingsFinished}
					title="Sittings finished"
					href={`/users/${person.username}/sittings` as Route}
				/>
				<Stat
					icon={Flame}
					value={person.streak.current}
					title="Current reading streak"
					href={`/users/${person.username}/sittings` as Route}
				/>
			</div>
		</article>
	);
}
