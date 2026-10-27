"use client";

import { BookOpen, Compass, Home, User } from "lucide-react";
import type { Route } from "next";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { BrowseMenuDrawer } from "@/components/blocks/browse-menu-drawer";
import { CreateMenu } from "@/components/blocks/create-menu";
import {
	MobileNavTab,
	MobileNavTabButton,
} from "@/components/blocks/mobile-nav-tab";
import {
	mobileChromeBottomClass,
	mobileChromeInsetClass,
} from "@/components/blocks/mobile-shell-chrome";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { UserMenuDrawer } from "@/components/blocks/user-menu-drawer";
import { usePathname } from "@/i18n/navigation";
import { authPageHref, currentPageCallbackUrl } from "@/lib/auth-callback-url";
import { authClient } from "@/lib/auth-client";
import { isBrowseNavActive } from "@/lib/browse-nav";
import { isMobileNavActive } from "@/lib/mobile-nav-active";
import { useLiveUserImage } from "@/lib/user-avatar-broadcast";
import { cn } from "@/lib/utils";

type TabConfig = {
	label: string;
	href: Route;
	icon: typeof Home;
};

const homeTab = { label: "Home", href: "/" as Route, icon: Home };
const libraryTab = {
	label: "Library",
	href: "/books" as Route,
	icon: BookOpen,
};

function MobileBottomBarInner() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { data: session, isPending } = authClient.useSession();
	const liveAvatarUrl = useLiveUserImage(session?.user.image);
	const [accountOpen, setAccountOpen] = useState(false);
	const [browseOpen, setBrowseOpen] = useState(false);

	const signedIn = !isPending && session?.user;
	const user = session?.user
		? { ...session.user, image: liveAvatarUrl }
		: undefined;

	const callbackUrl = currentPageCallbackUrl(pathname, searchParams.toString());
	const signInHref = authPageHref("/sign-in", callbackUrl);

	const guestTabs: TabConfig[] = [homeTab, libraryTab];

	const navGridClassSignedIn = "mx-auto grid max-w-lg grid-cols-5";
	const navGridClassGuest = "mx-auto grid max-w-lg grid-cols-4";

	if (isPending) {
		return (
			<nav className={mobileChromeBottomClass} aria-hidden="true">
				<div
					className={cn(navGridClassSignedIn, mobileChromeInsetClass, "h-16")}
				/>
			</nav>
		);
	}

	if (!signedIn || !user) {
		return (
			<>
				<nav className={mobileChromeBottomClass} aria-label="Main">
					<div className={cn(navGridClassGuest, mobileChromeInsetClass)}>
						{guestTabs.map((tab) => (
							<MobileNavTab
								key={tab.href}
								href={tab.href}
								label={tab.label}
								icon={tab.icon}
								active={isMobileNavActive(pathname, tab.href)}
							/>
						))}
						<MobileNavTabButton
							label="Browse"
							icon={Compass}
							active={isBrowseNavActive(pathname)}
							onClick={() => setBrowseOpen(true)}
							aria-label="Browse club sections"
						/>
						<MobileNavTab
							href={signInHref}
							label="Sign in"
							icon={User}
							active={false}
						/>
					</div>
				</nav>
				<BrowseMenuDrawer open={browseOpen} onOpenChange={setBrowseOpen} />
			</>
		);
	}

	const profileActive = pathname.startsWith(`/users/${user.username}`);
	const browseActive = isBrowseNavActive(pathname);

	return (
		<>
			<nav className={mobileChromeBottomClass} aria-label="Main">
				<div
					className={cn(
						navGridClassSignedIn,
						mobileChromeInsetClass,
						"items-end pt-1",
					)}
				>
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
					<MobileNavTabButton
						label="Browse"
						icon={Compass}
						active={browseActive}
						onClick={() => setBrowseOpen(true)}
						aria-label="Browse club sections"
					/>
					<MobileNavTabButton
						label="You"
						active={profileActive}
						onClick={() => setAccountOpen(true)}
						aria-label="Account menu"
						iconSlot={<UserAvatar user={user} className="size-6" />}
					/>
				</div>
			</nav>
			<BrowseMenuDrawer open={browseOpen} onOpenChange={setBrowseOpen} />
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
					<div
						className={cn("mx-auto h-16 max-w-lg", mobileChromeInsetClass)}
					/>
				</nav>
			}
		>
			<MobileBottomBarInner />
		</Suspense>
	);
}
