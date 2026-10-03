"use client";

import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@bbrc/ui/components/tabs";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const ownerStatuses = ["active", "draft", "archived"] as const;

type OwnerStatus = (typeof ownerStatuses)[number];

const statusParser = parseAsStringLiteral(ownerStatuses).withDefault("active");

type UserShelvesListProps = {
	username: string;
};

function shelfHref(username: string, slug: string) {
	return `/users/${username}/shelves/${slug}` as Route;
}

function newShelfHref(username: string) {
	return `/users/${username}/shelves/new` as Route;
}

export function UserShelvesList({ username }: UserShelvesListProps) {
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const [status, setStatus] = useQueryState("status", statusParser);

	const isOwner = !sessionPending && session?.user.username === username;

	const listQuery = useQuery(
		orpc.shelf.listByUsername.queryOptions({
			input: {
				username,
				status: isOwner ? status : undefined,
			},
		}),
	);

	if (listQuery.isPending) {
		return (
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 3 }, (_, i) => (
					<Skeleton key={i} className="h-36 w-full" />
				))}
			</div>
		);
	}

	if (listQuery.isError) {
		return (
			<p className="text-destructive text-sm" role="alert">
				{listQuery.error.message ?? "Could not load shelves."}
			</p>
		);
	}

	const { items, isOwner: ownerFromApi } = listQuery.data;
	const showOwnerChrome = isOwner && ownerFromApi;

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				{showOwnerChrome ? (
					<Tabs
						value={status}
						onValueChange={(value) => {
							void setStatus(value as OwnerStatus);
						}}
					>
						<TabsList
							variant="line"
							className="h-auto w-full justify-start sm:w-auto"
						>
							<TabsTrigger value="active">Active</TabsTrigger>
							<TabsTrigger value="draft">Draft</TabsTrigger>
							<TabsTrigger value="archived">Archived</TabsTrigger>
						</TabsList>
					</Tabs>
				) : (
					<p className="text-muted-foreground text-sm">
						Public reading lists from this member.
					</p>
				)}

				{showOwnerChrome ? (
					<Button
						render={<Link href={newShelfHref(username)} />}
						nativeButton={false}
						size="sm"
					>
						New shelf
					</Button>
				) : null}
			</div>

			{items.length === 0 ? (
				<div className="border border-border border-dashed px-6 py-12 text-center">
					<p className="font-medium">No shelves here yet</p>
					<p className="mt-1 text-muted-foreground text-sm">
						{showOwnerChrome
							? "Create a shelf to group books you want to share or revisit."
							: "This member has not published any shelves."}
					</p>
					{showOwnerChrome ? (
						<Button
							className="mt-4"
							render={<Link href={newShelfHref(username)} />}
							nativeButton={false}
						>
							Create your first shelf
						</Button>
					) : null}
				</div>
			) : (
				<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{items.map((shelf) => (
						<li key={shelf.id}>
							<Link
								href={shelfHref(username, shelf.slug)}
								className={cn(
									"flex h-full flex-col gap-2 border border-border p-4 transition-colors",
									"hover:bg-muted/40",
								)}
							>
								<div className="flex flex-wrap items-center gap-2">
									<h2 className="font-semibold leading-snug">{shelf.title}</h2>
									{shelf.type === "ordered" ? (
										<Badge variant="secondary">Ranked</Badge>
									) : (
										<Badge variant="outline">List</Badge>
									)}
									{showOwnerChrome && shelf.status !== "active" ? (
										<Badge variant="outline" className="capitalize">
											{shelf.status}
										</Badge>
									) : null}
								</div>
								{shelf.description ? (
									<p className="line-clamp-2 text-muted-foreground text-sm">
										{shelf.description}
									</p>
								) : null}
								<p className="mt-auto text-muted-foreground text-xs tabular-nums">
									{shelf.bookCount} {shelf.bookCount === 1 ? "book" : "books"}
								</p>
							</Link>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
