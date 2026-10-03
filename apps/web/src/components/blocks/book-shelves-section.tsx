"use client";

import { Badge } from "@bbrc/ui/components/badge";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { BookAddToShelfDialog } from "@/components/blocks/book-add-to-shelf-dialog";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

type BookShelvesSectionProps = {
	bookSlug: string;
};

function statusLabel(
	status: "draft" | "active" | "archived",
	isOwner: boolean,
): string | null {
	if (status === "active") {
		return null;
	}
	if (!isOwner) {
		return null;
	}
	return status;
}

export function BookShelvesSection({ bookSlug }: BookShelvesSectionProps) {
	const { data: session, isPending: sessionPending } = authClient.useSession();

	const shelvesQuery = useQuery(
		orpc.shelf.listForBook.queryOptions({
			input: { bookSlug },
		}),
	);

	const username = session?.user.username;

	return (
		<section aria-labelledby="book-shelves-heading" className="space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 id="book-shelves-heading" className="font-semibold text-lg">
					Shelves
				</h2>
				{!sessionPending && username ? (
					<BookAddToShelfDialog bookSlug={bookSlug} username={username} />
				) : null}
			</div>

			{shelvesQuery.isPending ? (
				<Skeleton className="h-8 w-full max-w-md" />
			) : shelvesQuery.isError ? null : shelvesQuery.data.items.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Not on any public shelves yet.
					{username ? " Add it to one of yours with the button above." : ""}
				</p>
			) : (
				<ul className="flex flex-col gap-2">
					{shelvesQuery.data.items.map((shelf) => {
						const label = statusLabel(shelf.status, shelf.isOwner);
						return (
							<li key={`${shelf.ownerUsername}-${shelf.slug}`}>
								<Link
									href={
										`/users/${shelf.ownerUsername}/shelves/${shelf.slug}` as Route
									}
									className="flex flex-wrap items-center gap-2 text-sm hover:underline"
								>
									<span className="font-medium">{shelf.title}</span>
									<span className="text-muted-foreground">
										@{shelf.ownerUsername}
									</span>
									{label ? (
										<Badge variant="outline" className="capitalize">
											{label}
										</Badge>
									) : null}
								</Link>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}
