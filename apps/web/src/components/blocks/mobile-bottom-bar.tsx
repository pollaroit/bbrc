"use client";

import { BookOpen, Home, LayoutList, Sofa, User } from "lucide-react";
import type { Route } from "next";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useRef, useState } from "react";
import { CreateMenu } from "@/components/blocks/create-menu";
import { MobileNavTab } from "@/components/blocks/mobile-nav-tab";
import { mobileChromeBottomClass } from "@/components/blocks/mobile-shell-chrome";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { UserMenuDrawer } from "@/components/blocks/user-menu-drawer";
import { authPageHref, currentPageCallbackUrl } from "@/lib/auth-callback-url";
import { authClient } from "@/lib/auth-client";
import { isMobileNavActive } from "@/lib/mobile-nav-active";
import { useLiveUserImage } from "@/lib/user-avatar-broadcast";
import { cn } from "@/lib/utils";

const LONG_PRESS_MS = 500;

type TabConfig = {
	label: string;
	href: Route;
	icon: typeof Home;
};

function MobileBottomBarInner() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { data: session, isPending } = authClient.useSession();
	const liveAvatarUrl = useLiveUserImage(session?.user.image);
	const [accountOpen, setAccountOpen] = useState(false);
	const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const longPressTriggeredRef = useRef(false);

	const signedIn = !isPending && session?.user;
	const user = session?.user
		? { ...session.user, image: liveAvatarUrl }
		: undefined;

	const callbackUrl = currentPageCallbackUrl(pathname, searchParams.toString());
	const signInHref = authPageHref("/sign-in", callbackUrl);

	const guestTabs: TabConfig[] = [
		{ label: "Home", href: "/", icon: Home },
		{ label: "Library", href: "/books", icon: BookOpen },
		{ label: "Shelves", href: "/shelves", icon: LayoutList },
		{ label: "Sittings", href: "/sittings", icon: Sofa },
	];

	const clearLongPress = useCallback(() => {
		if (longPressRef.current) {
			clearTimeout(longPressRef.current);
			longPressRef.current = null;
		}
	}, []);

	const startLongPress = useCallback(() => {
		longPressTriggeredRef.current = false;
		clearLongPress();
		longPressRef.current = setTimeout(() => {
			longPressTriggeredRef.current = true;
			setAccountOpen(true);
		}, LONG_PRESS_MS);
	}, [clearLongPress]);

	const handleUserPointerUp = useCallback(
		(event: React.PointerEvent<HTMLAnchorElement>) => {
			clearLongPress();
			if (longPressTriggeredRef.current) {
				event.preventDefault();
			}
		},
		[clearLongPress],
	);

	const navGridClass = "mx-auto grid max-w-lg grid-cols-5";

	if (isPending) {
		return (
			<nav className={mobileChromeBottomClass} aria-hidden="true">
				<div className={cn(navGridClass, "h-16")} />
			</nav>
		);
	}

	if (!signedIn || !user) {
		return (
			<nav className={mobileChromeBottomClass} aria-label="Main">
				<div className={navGridClass}>
					{guestTabs.map((tab) => (
						<MobileNavTab
							key={tab.href}
							href={tab.href}
							label={tab.label}
							icon={tab.icon}
							active={isMobileNavActive(pathname, tab.href)}
						/>
					))}
					<MobileNavTab
						href={signInHref}
						label="Sign in"
						icon={User}
						active={false}
					/>
				</div>
			</nav>
		);
	}

	const profileHref = `/users/${user.username}` as Route;
	const profileActive = pathname.startsWith(`/users/${user.username}`);

	const homeTab = { label: "Home", href: "/" as Route, icon: Home };
	const libraryTab = {
		label: "Library",
		href: "/books" as Route,
		icon: BookOpen,
	};
	const shelvesTab = {
		label: "Shelves",
		href: "/shelves" as Route,
		icon: LayoutList,
	};

	return (
		<>
			<nav className={mobileChromeBottomClass} aria-label="Main">
				<div className={cn(navGridClass, "items-end pt-1")}>
					<MobileNavTab
						href={homeTab.href}
						label={homeTab.label}
						icon={homeTab.icon}
						active={isMobileNavActive(pathname, homeTab.href)}
					/>
					<MobileNavTab
						href={libraryTab.href}
						label={libraryTab.label}
						icon={libraryTab.icon}
						active={isMobileNavActive(pathname, libraryTab.href)}
					/>
					<div
						className="flex min-h-14 items-end justify-center pb-1"
						aria-hidden={false}
					>
						<CreateMenu variant="fab" />
					</div>
					<MobileNavTab
						href={shelvesTab.href}
						label={shelvesTab.label}
						icon={shelvesTab.icon}
						active={isMobileNavActive(pathname, shelvesTab.href)}
					/>
					<MobileNavTab
						href={profileHref}
						label="You"
						active={profileActive}
						onPointerDown={startLongPress}
						onPointerUp={handleUserPointerUp}
						onPointerLeave={clearLongPress}
						onPointerCancel={clearLongPress}
						onContextMenu={(event) => {
							event.preventDefault();
							setAccountOpen(true);
						}}
						onKeyDown={(event) => {
							if (event.key === "ArrowUp") {
								event.preventDefault();
								setAccountOpen(true);
							}
						}}
						aria-label="Your profile. Long-press or press Arrow up for account menu."
						iconSlot={<UserAvatar user={user} className="size-6" />}
					/>
				</div>
			</nav>
			<UserMenuDrawer
				open={accountOpen}
				onOpenChange={setAccountOpen}
				user={user}
			/>
		</>
	);
}

export function MobileBottomBar() {
	return (
		<Suspense
			fallback={
				<nav className={mobileChromeBottomClass} aria-hidden="true">
					<div className="mx-auto h-16 max-w-lg" />
				</nav>
			}
		>
			<MobileBottomBarInner />
		</Suspense>
	);
}
