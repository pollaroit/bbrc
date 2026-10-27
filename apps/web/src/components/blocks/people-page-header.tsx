"use client";

import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { PeopleListingToolbar } from "@/components/blocks/people-listing-toolbar";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

const joinedFormat = new Intl.DateTimeFormat("en", {
	month: "short",
	day: "numeric",
	year: "numeric",
	timeZone: "UTC",
});

function OverviewStat({
	label,
	value,
	href,
}: {
	label: string;
	value: string;
	href?: Route;
}) {
	return (
		<div className="flex min-w-0 flex-col gap-0.5">
			<span className="text-muted-foreground text-xs">{label}</span>
			{href ? (
				<Link
					href={href}
					className="truncate font-semibold text-base hover:underline"
				>
					{value}
				</Link>
			) : (
				<span className="truncate font-semibold text-base tabular-nums">
					{value}
				</span>
			)}
		</div>
	);
}

export function PeoplePageHeader() {
	const overview = useQuery(orpc.people.overview.queryOptions());
	const { data: session } = authClient.useSession();
	const username = session?.user.username;

	return (
		<section className="flex flex-col border border-border bg-card">
			<div className="flex flex-col gap-5 border-border border-b px-4 py-6 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
				<div className="flex max-w-2xl flex-col gap-2">
					<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
						People
					</h1>
					<p className="text-muted-foreground text-sm leading-relaxed">
						Everyone in the club. Search, filter and sort to find a reading
						buddy.
					</p>
				</div>
				{username ? (
					<Link
						href={`/users/${username}` as Route}
						className="inline-flex h-9 shrink-0 items-center justify-center border border-border px-4 font-medium text-sm hover:bg-muted"
					>
						My profile
					</Link>
				) : null}
			</div>

			<div className="grid grid-cols-1 gap-4 border-border border-b px-4 py-4 sm:grid-cols-3 sm:px-6">
				{overview.data ? (
					<>
						<OverviewStat
							label="People in the club"
							value={overview.data.total.toLocaleString()}
						/>
						<OverviewStat
							label="Active in the last 30 days"
							value={overview.data.activeLast30Days.toLocaleString()}
						/>
						<OverviewStat
							label="Newest member"
							value={
								overview.data.newest
									? `${overview.data.newest.name} · ${joinedFormat.format(new Date(overview.data.newest.createdAt))}`
									: "—"
							}
							href={
								overview.data.newest
									? (`/users/${overview.data.newest.username}` as Route)
									: undefined
							}
						/>
					</>
				) : (
					<>
						<Skeleton className="h-10 w-full" aria-hidden />
						<Skeleton className="h-10 w-full" aria-hidden />
						<Skeleton className="h-10 w-full" aria-hidden />
					</>
				)}
			</div>

			<div className="bg-muted/20 px-4 py-5 sm:px-6">
				<PeopleListingToolbar />
			</div>
		</section>
	);
}
