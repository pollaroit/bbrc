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
import { cn } from "@/lib/utils";

type PeopleCardProps = {
	person: PeopleListItem;
	/** True for the signed-in member's own card. */
	isViewer?: boolean;
};

const NEW_MEMBER_DAYS = 14;

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
			className: "bg-sky-600/10 text-sky-950 dark:text-sky-200",
			href: `/sittings/${person.readingNow.sittingSlug}` as Route,
		};
	}
	if (person.status === "warned") {
		return {
			label: "Warned",
			className: "bg-amber-600/10 text-amber-950 dark:text-amber-200",
		};
	}
	if (isViewer) {
		return { label: "You", className: "bg-primary/10 text-foreground" };
	}
	if (person.isAdmin) {
		return {
			label: "Administrator",
			className: "bg-amber-600/10 text-amber-950 dark:text-amber-200",
		};
	}
	const ageDays =
		(Date.now() - new Date(person.createdAt).getTime()) / 86_400_000;
	if (ageDays <= NEW_MEMBER_DAYS) {
		return {
			label: "New here",
			className: "bg-emerald-600/10 text-emerald-900 dark:text-emerald-200",
		};
	}
	return { label: "Member", className: "bg-muted/30 text-muted-foreground" };
}

function Stat({
	icon: Icon,
	value,
	title,
}: {
	icon: LucideIcon;
	value: number | string;
	title: string;
}) {
	return (
		<span
			className="inline-flex shrink-0 items-center gap-0.5 tabular-nums"
			title={title}
		>
			<Icon className="size-3.5 shrink-0" aria-hidden />
			<span aria-hidden>{value}</span>
			<span className="sr-only">
				{title}: {value}
			</span>
		</span>
	);
}

export function PeopleCard({ person, isViewer = false }: PeopleCardProps) {
	const profileHref = `/users/${person.username}` as Route;
	const highlight = highlightFor(person, isViewer);
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
				<span className="shrink-0 font-normal opacity-80">
					Joined {joinedFormat.format(new Date(person.createdAt))}
				</span>
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
									className="size-4 shrink-0 text-amber-600 dark:text-amber-400"
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

			<div className="relative z-2 flex flex-col gap-1 border-border border-t bg-muted/10 px-3 py-1.5 text-muted-foreground text-xs tabular-nums">
				<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
					<span title={`${person.xp} experience points`}>
						{person.xpLevel.label} · {person.xp} XP
					</span>
					<span title={`${person.rp} reading points`}>
						{person.rpLevel.label} · {person.rp} RP
					</span>
				</div>
				<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
					<Stat icon={BookOpen} value={person.reads} title="Books read" />
					<Stat
						icon={MessageSquareText}
						value={person.reviews}
						title="Reviews"
					/>
					<Stat icon={PenLine} value={person.posts} title="Posts" />
					<Stat
						icon={Sofa}
						value={person.sittingsFinished}
						title="Sittings finished"
					/>
					<Stat
						icon={Flame}
						value={person.streak.current}
						title="Current reading streak"
					/>
				</div>
			</div>
		</article>
	);
}
