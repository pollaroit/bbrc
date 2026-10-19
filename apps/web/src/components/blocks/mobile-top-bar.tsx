"use client";

import type { Route } from "next";
import Link from "next/link";
import { ActiveSittingTopChip } from "@/components/blocks/active-sitting-top-chip";
import { GlobalSearchMobileTrigger } from "@/components/blocks/global-search-trigger";
import { Logo } from "@/components/blocks/logo";
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
					"mx-auto flex h-14 w-full max-w-6xl items-center gap-2.5 pt-1",
					mobileChromeInsetClass,
					"pb-0",
				)}
			>
				<Link
					href={"/" as Route}
					className="flex shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
					aria-label="Home"
				>
					<Logo className="size-7" label="" />
				</Link>
				<ActiveSittingTopChip />
				<div className="ml-auto flex shrink-0 items-center gap-0.5">
					<GlobalSearchMobileTrigger />
					<ModeToggle />
					{!isPending && session ? <NotificationBell /> : null}
				</div>
			</div>
		</header>
	);
}
