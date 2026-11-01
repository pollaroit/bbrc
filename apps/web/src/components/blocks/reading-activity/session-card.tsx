"use client";

import type { ActivitySessionItem } from "@bbrc/api/modules/reading-activity/reading-activity.schema";
import {
	ACTIVITY_FORMAT_LABELS,
	ACTIVITY_MODE_LABELS,
	type ActivityFormat,
	type ActivityMode,
	formatActivityDuration,
	formatSessionClock,
} from "@bbrc/shared";
import { Badge } from "@bbrc/ui/components/badge";
import { CardContent, CardFooter } from "@bbrc/ui/components/card";
import {
	BookOpen,
	CalendarDays,
	Check,
	Gauge,
	Headphones,
	Hourglass,
	type LucideIcon,
	Repeat,
	Tablet,
	Timer,
} from "lucide-react";
import Image from "next/image";
import { bookCoverUrl } from "@/lib/book-cover";
import { ClickCard } from "./click-card";
import { formatClockTime, formatDayLabel, formatSpeed } from "./format";

export const MODE_ICONS: Record<ActivityMode, LucideIcon> = {
	free: Timer,
	countdown: Hourglass,
	pomodoro: Repeat,
};

const FORMAT_ICONS: Record<ActivityFormat, LucideIcon> = {
	paperback: BookOpen,
	hardcover: BookOpen,
	ebook: Tablet,
	audiobook: Headphones,
	other: BookOpen,
};

export function FormatIcon({ format }: { format: ActivityFormat }) {
	const Icon = FORMAT_ICONS[format];
	return <Icon className="size-3" aria-hidden />;
}

/** The whole cover, never cropped: it sits in a 2:3 frame and shrinks to fit. */
export function Cover({
	coverId,
	className,
	sizes = "96px",
}: {
	coverId: number | null;
	className?: string;
	sizes?: string;
}) {
	const src = bookCoverUrl(coverId, "L");
	return (
		<span
			className={`relative block aspect-2/3 shrink-0 overflow-hidden bg-muted shadow-sm ring-1 ring-foreground/10 ${className ?? "w-24"}`}
		>
			{src ? (
				<Image src={src} alt="" fill className="object-contain" sizes={sizes} />
			) : (
				<BookOpen
					className="absolute inset-0 m-auto size-6 text-muted-foreground"
					aria-hidden
				/>
			)}
		</span>
	);
}

/** What the session meant for the book: a thin bar with the part this session covered filled in. */
export function SpanBar({
	from,
	to,
	label,
}: {
	from: number;
	to: number;
	label: string;
}) {
	const start = Math.min(100, Math.max(0, from));
	const width = Math.max(1.5, Math.min(100 - start, to - from));
	return (
		<div
			role="img"
			aria-label={label}
			className="relative h-2 w-full overflow-hidden bg-muted"
		>
			<div
				className="absolute inset-y-0 bg-primary"
				style={{ left: `${start}%`, width: `${width}%` }}
			/>
		</div>
	);
}

export function methodText(item: {
	mode: ActivitySessionItem["mode"];
	targetMinutes: number | null;
}) {
	const base = ACTIVITY_MODE_LABELS[item.mode];
	return item.mode === "countdown" && item.targetMinutes
		? `${base}, ${item.targetMinutes} min`
		: base;
}

export function gainText(item: ActivitySessionItem): string | null {
	if (item.pages != null && item.pages > 0) {
		return `${item.pages} ${item.pages === 1 ? "page" : "pages"} gained`;
	}
	if (item.percent != null && item.percent > 0) {
		return `${item.percent}% gained`;
	}
	return null;
}

/** Where the session started and ended, in pages when the book has them. */
export function spanText(item: ActivitySessionItem): string | null {
	if (item.percentFrom == null || item.percentTo == null) return null;
	const pages =
		item.pageFrom != null && item.pageTo != null
			? `, pages ${item.pageFrom} to ${item.pageTo}`
			: "";
	return `${item.percentFrom}% to ${item.percentTo}% of the book${pages}`;
}

/**
 * One session. Everyone sees the day, the length and the method; the book's
 * progress, the speed and the facts below only when the member shows progress,
 * and the clock times only to the member.
 */
export function SessionCard({
	item,
	onOpen,
}: {
	item: ActivitySessionItem;
	onOpen: () => void;
}) {
	const ModeIcon = MODE_ICONS[item.mode];
	const span = spanText(item);
	const gain = gainText(item);
	const times = item.detail
		? `${formatClockTime(item.detail.startedAt)} to ${formatClockTime(item.detail.endedAt)}`
		: null;
	const targetShare =
		item.mode === "countdown" && item.targetMinutes
			? Math.min(1, item.seconds / (item.targetMinutes * 60))
			: null;
	const hasFacts =
		gain != null ||
		item.speed != null ||
		item.format != null ||
		item.finished === true ||
		item.targetMet != null;

	return (
		<ClickCard
			label={`Open the ${formatActivityDuration(item.seconds)} session of ${item.title}`}
			onClick={onOpen}
			className="h-full w-full"
		>
			<CardContent className="flex gap-4">
				<Cover coverId={item.coverId} />
				<div className="flex min-w-0 flex-1 flex-col gap-3">
					<div className="flex min-w-0 flex-col gap-0.5">
						<p className="line-clamp-2 font-heading font-medium text-sm leading-snug">
							{item.title}
						</p>
						{item.authors.length > 0 ? (
							<p className="truncate text-muted-foreground text-xs">
								{item.authors.join(", ")}
							</p>
						) : null}
						<p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-muted-foreground text-xs">
							<CalendarDays className="size-3" aria-hidden />
							<span>{formatDayLabel(item.day)}</span>
							{times ? <span className="tabular-nums">{times}</span> : null}
						</p>
					</div>

					<div className="flex items-end justify-between gap-3">
						<div className="flex flex-col gap-1">
							<p className="font-heading font-semibold text-4xl tabular-nums leading-none tracking-tight">
								{formatSessionClock(item.seconds)}
							</p>
							<p className="text-muted-foreground text-xs">
								{formatActivityDuration(item.seconds)} of reading
							</p>
						</div>
						<Badge variant="secondary" className="shrink-0 gap-1">
							<ModeIcon className="size-3" aria-hidden />
							{methodText(item)}
						</Badge>
					</div>

					{targetShare != null && item.targetMinutes ? (
						<div className="flex flex-col gap-1">
							<div
								role="img"
								aria-label={`${Math.round(targetShare * 100)}% of the ${item.targetMinutes} minute target`}
								className="h-1.5 w-full overflow-hidden bg-muted"
							>
								<div
									className="h-full bg-primary/60"
									style={{ width: `${targetShare * 100}%` }}
								/>
							</div>
							<p className="text-muted-foreground text-xs">
								{item.targetMet
									? `Reached the ${item.targetMinutes} minute target`
									: `Stopped at ${Math.round(targetShare * 100)}% of the ${item.targetMinutes} minute target`}
							</p>
						</div>
					) : null}

					{span && item.percentFrom != null && item.percentTo != null ? (
						<div className="flex flex-col gap-1">
							<SpanBar
								from={item.percentFrom}
								to={item.percentTo}
								label={span}
							/>
							<p className="text-muted-foreground text-xs">{span}</p>
						</div>
					) : null}
				</div>
			</CardContent>
			{hasFacts ? (
				<CardFooter className="flex flex-wrap gap-1.5">
					{gain ? <Badge variant="outline">{gain}</Badge> : null}
					{item.speed != null ? (
						<Badge variant="outline" className="gap-1">
							<Gauge className="size-3" aria-hidden />
							{formatSpeed(item.speed)}
						</Badge>
					) : null}
					{item.format ? (
						<Badge variant="outline" className="gap-1">
							<FormatIcon format={item.format} />
							{ACTIVITY_FORMAT_LABELS[item.format]}
						</Badge>
					) : null}
					{item.finished ? (
						<Badge
							variant="outline"
							className="gap-1 border-success/30 bg-success/10 text-success-ink"
						>
							<Check className="size-3" aria-hidden />
							Finished the book
						</Badge>
					) : null}
				</CardFooter>
			) : null}
		</ClickCard>
	);
}
