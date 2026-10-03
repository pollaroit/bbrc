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

export function BookShelvesSection({ bookSlug }: BookShelvesSectionProps) {
	const { data: session, isPending: sessionPending } = authClient.useSession();

	const shelvesQuery = useQuery({
		...orpc.shelf.listForBook.queryOptions({
			input: { bookSlug },
		}),
		enabled: !sessionPending && Boolean(session?.user),
	});

	if (sessionPending || !session?.user) {
		return null;
	}

	const username = session.user.username;

	return (
		<section aria-labelledby="book-shelves-heading" className="space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 id="book-shelves-heading" className="font-semibold text-lg">
					On your shelves
				</h2>
				<BookAddToShelfDialog bookSlug={bookSlug} username={username} />
			</div>

			{shelvesQuery.isPending ? (
				<Skeleton className="h-8 w-full max-w-md" />
			) : shelvesQuery.isError ? null : shelvesQuery.data.items.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Not on any of your shelves yet.
				</p>
			) : (
				<ul className="flex flex-wrap gap-2">
					{shelvesQuery.data.items.map((shelf) => (
						<li key={shelf.slug}>
							<Link href={`/users/${username}/shelves/${shelf.slug}` as Route}>
								<Badge variant="secondary" className="hover:bg-secondary/80">
									{shelf.title}
									{shelf.status === "draft" ? " (draft)" : ""}
								</Badge>
							</Link>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
