"use client";

import type { Route } from "next";
import Link from "next/link";
import { GlobalSearchMobileTrigger } from "@/components/blocks/global-search-trigger";
import { LeaderboardMobileNavTrigger } from "@/components/blocks/leaderboard-nav-trigger";
import { Logo } from "@/components/blocks/logo";
import { MobileReadSittingsControl } from "@/components/blocks/mobile-read-sittings-control";
import {
	mobileChromeInsetClass,
	mobileChromeTopClass,
} from "@/components/blocks/mobile-shell-chrome";
import { NotificationBell } from "@/components/blocks/notification-bell";
import { ModeToggle } from "@/components/mode-toggle";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function MobileTopBar() {
	const { data: session, isPending } = authClient.useSession();

	return (
		<header className={mobileChromeTopClass}>
			<div
				className={cn(
					"mx-auto grid h-14 w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2 pt-1",
					mobileChromeInsetClass,
					"pb-0",
				)}
			>
				<div className="flex min-w-0 items-center justify-start">
					<MobileReadSittingsControl />
				</div>
				<Link
					href={"/" as Route}
					className="flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
					aria-label="Home"
				>
					<Logo className="size-7" label="" />
				</Link>
				<div className="flex items-center justify-end gap-0.5">
					<GlobalSearchMobileTrigger />
					<LeaderboardMobileNavTrigger />
					<ModeToggle />
					{!isPending && session ? <NotificationBell /> : null}
				</div>
			</div>
		</header>
	);
}
