"use client";

import type { Route } from "next";
import { Suspense } from "react";
import { ActiveSittingTopChip } from "@/components/blocks/active-sitting-top-chip";
import { BrowseMenuDropdown } from "@/components/blocks/browse-menu-dropdown";
import { CreateMenu } from "@/components/blocks/create-menu";
import { GlobalSearchTrigger } from "@/components/blocks/global-search-trigger";
import { HeaderAuthLinks } from "@/components/blocks/header-auth-links";
import { Logo } from "@/components/blocks/logo";
import { NotificationBell } from "@/components/blocks/notification-bell";
import { UserMenu } from "@/components/blocks/user-menu";
import { ModeToggle } from "@/components/mode-toggle";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { headerToolbarControlClass } from "@/lib/header-toolbar";
import { useLiveUserImage } from "@/lib/user-avatar-broadcast";

const navLinks = [
	{ label: "Library", href: "/books" },
	{ label: "Sittings", href: "/sittings" },
	{ label: "Leaderboard", href: "/leaderboard/overview" },
];

export default function Header() {
	const { data: session, isPending } = authClient.useSession();
	const liveAvatarUrl = useLiveUserImage(session?.user.image);
	const headerUser = session?.user
		? { ...session.user, image: liveAvatarUrl }
		: undefined;

	return (
		<header className="sticky top-0 z-30 hidden w-full border-border border-b bg-background/80 backdrop-blur md:block">
			<div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-6">
				<div className="flex shrink-0 items-center gap-2">
					<Link href="/" className="flex items-center gap-2.5">
						<Logo className="size-7" label="" />
					</Link>
				</div>

				<nav className="flex shrink-0 items-center gap-6">
					{navLinks.map((link) => (
						<Link
							key={link.label}
							href={link.href as Route}
							className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
						>
							{link.label}
						</Link>
					))}
					<BrowseMenuDropdown />
				</nav>

				<ActiveSittingTopChip className="hidden min-w-0 max-w-md flex-1 md:flex" />

				<div
					className={`ml-auto flex items-center gap-1 ${headerToolbarControlClass}`}
				>
					<CreateMenu />
					<GlobalSearchTrigger variant="desktop" />
					<ModeToggle />
					{isPending ? null : session ? (
						<>
							<NotificationBell />
							<UserMenu user={headerUser ?? session.user} />
						</>
					) : (
						<Suspense fallback={null}>
							<HeaderAuthLinks variant="desktop" />
						</Suspense>
					)}
				</div>
			</div>
		</header>
	);
}
