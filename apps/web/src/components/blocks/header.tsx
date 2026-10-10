"use client";

import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CreateMenu } from "@/components/blocks/create-menu";
import { GlobalSearchTrigger } from "@/components/blocks/global-search-trigger";
import { HeaderAuthLinks } from "@/components/blocks/header-auth-links";
import { HeaderOngoingReadButton } from "@/components/blocks/header-ongoing-read-button";
import { Logo } from "@/components/blocks/logo";
import { NotificationBell } from "@/components/blocks/notification-bell";
import { UserMenu } from "@/components/blocks/user-menu";
import { ModeToggle } from "@/components/mode-toggle";
import { authClient } from "@/lib/auth-client";
import { useLiveUserImage } from "@/lib/user-avatar-broadcast";

const navLinks = [
	{ label: "Library", href: "/books" },
	{ label: "Shelves", href: "/shelves" },
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
			<div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-6">
				<div className="flex shrink-0 items-center gap-2">
					<Link href="/" className="flex items-center gap-2.5">
						<Logo className="size-7" label="" />
					</Link>
				</div>

				<nav className="flex items-center gap-7">
					{navLinks.map((link) => (
						<Link
							key={link.label}
							href={link.href as Route}
							className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
						>
							{link.label}
						</Link>
					))}
					<HeaderOngoingReadButton />
				</nav>

				<div className="ml-auto flex items-center gap-2">
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
