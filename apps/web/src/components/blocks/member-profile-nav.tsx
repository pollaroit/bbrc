"use client";

import { Tabs, TabsList, TabsTrigger } from "@bbrc/ui/components/tabs";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

type MemberProfileNavProps = {
	username: string;
	isOwnProfile?: boolean;
};

type ProfileSegment =
	| "sittings"
	| "reads"
	| "posts"
	| "feedbacks"
	| "shelves"
	| "reels";

function profileTabHref(username: string, segment: ProfileSegment) {
	if (segment === "sittings") {
		return `/users/${username}` as Route;
	}
	return `/users/${username}/${segment}` as Route;
}

function activeTab(pathname: string, username: string): string {
	const base = `/users/${username}`;
	if (pathname === base || pathname === `${base}/`) {
		return "sittings";
	}
	if (pathname.startsWith(`${base}/reads`)) {
		return "reads";
	}
	if (pathname.startsWith(`${base}/posts`)) {
		return "posts";
	}
	if (pathname.startsWith(`${base}/feedbacks`)) {
		return "feedbacks";
	}
	if (pathname.startsWith(`${base}/shelves`)) {
		return "shelves";
	}
	if (pathname.startsWith(`${base}/reels`)) {
		return "reels";
	}
	return "sittings";
}

export function MemberProfileNav({
	username,
	isOwnProfile = false,
}: MemberProfileNavProps) {
	const pathname = usePathname();
	const current = activeTab(pathname, username);

	return (
		<nav
			aria-label="Member profile sections"
			className="sticky top-14 z-20 border border-border bg-background/95 px-1 py-1 backdrop-blur-sm supports-backdrop-filter:bg-background/80"
		>
			<Tabs value={current}>
				<TabsList
					variant="line"
					className="h-auto w-full justify-start gap-0 overflow-x-auto"
				>
					<TabsTrigger
						value="sittings"
						nativeButton={false}
						render={<Link href={profileTabHref(username, "sittings")} />}
					>
						Sittings
					</TabsTrigger>
					<TabsTrigger
						value="reads"
						nativeButton={false}
						render={<Link href={profileTabHref(username, "reads")} />}
					>
						Reads
					</TabsTrigger>
					<TabsTrigger
						value="posts"
						nativeButton={false}
						render={<Link href={profileTabHref(username, "posts")} />}
					>
						Feed
					</TabsTrigger>
					<TabsTrigger
						value="feedbacks"
						nativeButton={false}
						render={<Link href={profileTabHref(username, "feedbacks")} />}
					>
						Feedbacks
					</TabsTrigger>
					<TabsTrigger
						value="shelves"
						nativeButton={false}
						render={<Link href={profileTabHref(username, "shelves")} />}
					>
						Shelves
					</TabsTrigger>
					{isOwnProfile ? (
						<TabsTrigger
							value="reels"
							nativeButton={false}
							render={<Link href={profileTabHref(username, "reels")} />}
						>
							Reels
						</TabsTrigger>
					) : null}
				</TabsList>
			</Tabs>
		</nav>
	);
}
