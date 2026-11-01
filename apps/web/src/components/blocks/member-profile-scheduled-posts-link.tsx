"use client";

import { Button } from "@bbrc/ui/components/button";
import { CalendarClock } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

type MemberProfileScheduledPostsLinkProps = {
	username: string;
};

/** Small link between published feed and the owner's scheduled queue. */
export function MemberProfileScheduledPostsLink({
	username,
}: MemberProfileScheduledPostsLinkProps) {
	const pathname = usePathname();
	const feedHref = `/users/${username}/posts` as Route;
	const scheduledHref = `/users/${username}/posts/scheduled` as Route;
	const onScheduled = pathname.startsWith(scheduledHref);

	if (onScheduled) {
		return (
			<Button
				variant="ghost"
				size="sm"
				className="h-8 gap-1.5 px-2 text-muted-foreground"
				nativeButton={false}
				render={<Link href={feedHref} />}
			>
				Back to feed
			</Button>
		);
	}

	return (
		<Button
			variant="ghost"
			size="sm"
			className="h-8 gap-1.5 px-2 text-muted-foreground"
			nativeButton={false}
			render={<Link href={scheduledHref} />}
		>
			<CalendarClock className="size-4" aria-hidden />
			Scheduled
		</Button>
	);
}
