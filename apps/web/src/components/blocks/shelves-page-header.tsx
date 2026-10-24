"use client";

import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { ShelvesListingToolbar } from "@/components/blocks/shelves-listing-toolbar";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

function Stat({
	label,
	value,
	hint,
	href,
}: {
	label: string;
	value: string;
	hint?: string;
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
			{hint ? (
				<span className="truncate text-muted-foreground text-xs">{hint}</span>
			) : null}
		</div>
	);
}

export function ShelvesPageHeader() {
	const overview = useQuery(orpc.shelf.overview.queryOptions());
	const { data: session } = authClient.useSession();
	const username = session?.user.username;
	const data = overview.data;

	return (
		<section className="flex flex-col border border-border bg-card">
			<div className="flex flex-col gap-5 border-border border-b px-4 py-6 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
				<div className="flex max-w-2xl flex-col gap-2">
					<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
						Shelves
					</h1>
					<p className="text-muted-foreground text-sm leading-relaxed">
						Reading lists from club members, some built by one person and some
						by a whole group. Search, filter and sort to find your next stack.
					</p>
				</div>
				{username ? (
					<div className="flex shrink-0 flex-wrap gap-2">
						<Button
							variant="outline"
							render={<Link href={`/users/${username}/shelves` as Route} />}
							nativeButton={false}
						>
							My shelves
						</Button>
						<Button
							render={<Link href={`/users/${username}/shelves/new` as Route} />}
							nativeButton={false}
						>
							<Plus data-icon="inline-start" aria-hidden />
							New shelf
						</Button>
					</div>
				) : null}
			</div>

			<div className="grid grid-cols-2 gap-4 border-border border-b px-4 py-4 sm:px-6 lg:grid-cols-4">
				{data ? (
					<>
						<Stat
							label="Shelves"
							value={data.shelves.toLocaleString()}
							hint={`${data.books.toLocaleString()} books on them`}
						/>
						<Stat
							label="Built together"
							value={data.sharedShelves.toLocaleString()}
							hint={
								data.collaborators > 0
									? `${data.collaborators.toLocaleString()} ${data.collaborators === 1 ? "member" : "members"} collaborating`
									: "No collaborations yet"
							}
						/>
						<Stat
							label="Books per shelf"
							value={
								data.shelves > 0 ? (data.books / data.shelves).toFixed(1) : "—"
							}
						/>
						<Stat
							label="Newest shelf"
							value={data.newest ? data.newest.title : "—"}
							href={
								data.newest
									? (`/users/${data.newest.ownerUsername}/shelves/${data.newest.slug}` as Route)
									: undefined
							}
						/>
					</>
				) : (
					Array.from({ length: 4 }, (_, index) => (
						<Skeleton key={index} className="h-12 w-full" aria-hidden />
					))
				)}
			</div>

			<div className="bg-muted/20 px-4 py-5 sm:px-6">
				<ShelvesListingToolbar />
			</div>
		</section>
	);
}
