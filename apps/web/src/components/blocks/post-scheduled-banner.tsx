"use client";

import { Button } from "@bbrc/ui/components/button";
import { CalendarClock } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { RelativeTime } from "@/components/blocks/relative-time";

type PostScheduledBannerProps = {
	slug: string;
	authorUsername: string;
	scheduledAt: Date | null;
	/** Hide actions (e.g. on the edit screen). */
	compact?: boolean;
};

export function PostScheduledBanner({
	slug,
	authorUsername,
	scheduledAt,
	compact = false,
}: PostScheduledBannerProps) {
	const queueHref = `/users/${authorUsername}/posts/scheduled` as Route;
	const editHref = `/posts/${slug}/edit` as Route;

	return (
		<div className="flex flex-col gap-3 border border-info/30 bg-info/10 px-4 py-3 text-sm">
			<div className="flex gap-3">
				<CalendarClock
					className="mt-0.5 size-5 shrink-0 text-info-ink"
					aria-hidden
				/>
				<div className="min-w-0 flex-1">
					<p className="font-medium text-foreground">Scheduled post</p>
					<p className="mt-0.5 text-muted-foreground">
						Only you can see this until it goes live
						{scheduledAt ? (
							<>
								{" "}
								<RelativeTime date={scheduledAt} />
							</>
						) : (
							"."
						)}
					</p>
				</div>
			</div>
			{compact ? null : (
				<div className="flex flex-wrap gap-2 ps-8">
					<Button
						size="sm"
						variant="outline"
						render={<Link href={editHref} />}
						nativeButton={false}
					>
						Edit
					</Button>
					<Button
						size="sm"
						variant="ghost"
						render={<Link href={queueHref} />}
						nativeButton={false}
					>
						All scheduled
					</Button>
				</div>
			)}
		</div>
	);
}
