"use client";

import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { Tabs, TabsList, TabsTrigger } from "@bbrc/ui/components/tabs";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

type SittingHubNavProps = {
	sitting: GetSittingBySlugOutput;
};

function sittingTabHref(slug: string, segment: "overview" | "vote"): Route {
	if (segment === "overview") {
		return `/sittings/${slug}` as Route;
	}
	return `/sittings/${slug}/vote` as Route;
}

function activeTab(
	pathname: string,
	slug: string,
): "overview" | "vote" | "participants" {
	const base = `/sittings/${slug}`;
	if (pathname.startsWith(`${base}/vote`)) {
		return "vote";
	}
	if (pathname.startsWith(`${base}/participants`)) {
		return "participants";
	}
	return "overview";
}

export function SittingHubNav({ sitting }: SittingHubNavProps) {
	const pathname = usePathname();
	const current = activeTab(pathname, sitting.slug);
	const hasPoll = sitting.poll != null;
	const pollLabel =
		sitting.status === "voting" ? "Vote" : hasPoll ? "Voting results" : "Vote";

	if (!hasPoll) {
		return null;
	}

	return (
		<nav aria-label="Sitting sections">
			<Tabs value={current}>
				<TabsList variant="line" className="h-auto w-full justify-start gap-0">
					<TabsTrigger
						value="overview"
						nativeButton={false}
						render={<Link href={sittingTabHref(sitting.slug, "overview")} />}
					>
						Overview
					</TabsTrigger>
					<TabsTrigger
						value="vote"
						nativeButton={false}
						render={<Link href={sittingTabHref(sitting.slug, "vote")} />}
					>
						{pollLabel}
					</TabsTrigger>
				</TabsList>
			</Tabs>
		</nav>
	);
}
