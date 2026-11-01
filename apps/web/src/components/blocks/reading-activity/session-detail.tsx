"use client";

import type { ActivitySessionItem } from "@bbrc/api/modules/reading-activity/reading-activity.schema";
import {
	ACTIVITY_FORMAT_LABELS,
	formatActivityDuration,
	formatSessionClock,
} from "@bbrc/shared";
import { Badge } from "@bbrc/ui/components/badge";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@bbrc/ui/components/sheet";
import { Check } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { useMediaQuery } from "@/lib/reading-mode/use-media-query";
import { formatClockTime, formatDayLabel, formatSpeed, plural } from "./format";
import {
	Cover,
	FormatIcon,
	gainText,
	MODE_ICONS,
	methodText,
	SpanBar,
	spanText,
} from "./session-card";

function Row({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
			<dt className="text-muted-foreground">{label}</dt>
			<dd className="text-right font-medium tabular-nums">{children}</dd>
		</div>
	);
}

/**
 * One session in full. Everyone gets the day, length, method and (when shown)
 * pages and speed; only the member and admins get clock times, how it compares
 * with their usual speed, and the day's other sessions.
 */
export function SessionDetail({
	item,
	usualSpeed,
	onClose,
}: {
	item: ActivitySessionItem | null;
	usualSpeed: number | null;
	onClose: () => void;
}) {
	const wide = useMediaQuery("(min-width: 768px)");
	const detail = item?.detail ?? null;
	const gain = item ? gainText(item) : null;
	const span = item ? spanText(item) : null;
	const ModeIcon = item ? MODE_ICONS[item.mode] : null;
	const versus =
		item?.speed != null && usualSpeed
			? Math.round(((item.speed - usualSpeed) / usualSpeed) * 100)
			: null;

	return (
		<Sheet
			open={item != null}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<SheetContent
				side={wide ? "right" : "bottom"}
				className="max-h-[90dvh] overflow-y-auto md:max-h-none md:sm:max-w-md"
			>
				{item ? (
					<>
						<SheetHeader>
							<div className="flex items-start gap-4">
								<Cover coverId={item.coverId} className="w-20" sizes="80px" />
								<div className="flex min-w-0 flex-col gap-1">
									<SheetTitle className="font-heading leading-snug">
										<Link
											href={`/books/${item.bookSlug}` as Route}
											className="hover:underline"
										>
											{item.title}
										</Link>
									</SheetTitle>
									<SheetDescription>
										{item.authors.length > 0 ? item.authors.join(", ") : ""}
									</SheetDescription>
									<p className="text-muted-foreground text-xs">
										{formatDayLabel(item.day)}
										{detail
											? `, ${formatClockTime(detail.startedAt)} to ${formatClockTime(detail.endedAt)}`
											: ""}
									</p>
								</div>
							</div>
						</SheetHeader>

						<div className="flex flex-col gap-5 px-4 pb-6">
							<div className="flex items-end justify-between gap-3">
								<div className="flex flex-col gap-1">
									<p className="font-heading font-semibold text-5xl tabular-nums leading-none tracking-tight">
										{formatSessionClock(item.seconds)}
									</p>
									<p className="text-muted-foreground text-xs">
										{formatActivityDuration(item.seconds)} of reading
									</p>
								</div>
								<Badge variant="secondary" className="gap-1">
									{ModeIcon ? (
										<ModeIcon className="size-3" aria-hidden />
									) : null}
									{methodText(item)}
								</Badge>
							</div>

							{span && item.percentFrom != null && item.percentTo != null ? (
								<div className="flex flex-col gap-1.5">
									<SpanBar
										from={item.percentFrom}
										to={item.percentTo}
										label={span}
									/>
									<p className="text-muted-foreground text-xs">{span}</p>
								</div>
							) : null}

							<dl className="divide-y divide-border border-border border-y">
								{item.targetMet != null ? (
									<Row label="Countdown">
										{item.targetMet ? "Reached the target" : "Stopped early"}
									</Row>
								) : null}
								{gain ? <Row label="Progress">{gain}</Row> : null}
								{item.speed != null ? (
									<Row label="Reading speed">
										{formatSpeed(item.speed)}
										{versus != null ? (
											<span className="block font-normal text-muted-foreground text-xs">
												{versus === 0
													? "Your usual speed"
													: `${Math.abs(versus)}% ${versus > 0 ? "faster" : "slower"} than usual`}
											</span>
										) : null}
									</Row>
								) : null}
								{item.format ? (
									<Row label="Edition">
										<span className="inline-flex items-center gap-1.5">
											<FormatIcon format={item.format} />
											{ACTIVITY_FORMAT_LABELS[item.format]}
										</span>
									</Row>
								) : null}
								{item.finished ? (
									<Row label="Book">
										<span className="inline-flex items-center gap-1 text-success-ink">
											<Check className="size-3.5" aria-hidden />
											Finished
										</span>
									</Row>
								) : null}
							</dl>

							{detail && detail.sameDay.length > 0 ? (
								<section className="flex flex-col gap-2">
									<h3 className="font-heading font-semibold text-sm">
										{plural(detail.sameDay.length, "other session")} that day
									</h3>
									<ul className="divide-y divide-border border border-border text-sm">
										{detail.sameDay.map((other) => (
											<li
												key={other.id}
												className="flex items-baseline justify-between gap-3 p-2.5"
											>
												<span className="min-w-0 truncate">{other.title}</span>
												<span className="shrink-0 text-muted-foreground tabular-nums">
													{formatClockTime(other.startedAt)},{" "}
													{formatActivityDuration(other.seconds)}
												</span>
											</li>
										))}
									</ul>
								</section>
							) : null}
						</div>
					</>
				) : null}
			</SheetContent>
		</Sheet>
	);
}
