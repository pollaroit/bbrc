"use client";

import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { BookAddToShelfDialog } from "@/components/blocks/book-add-to-shelf-dialog";
import {
	ShelfGridCard,
	shelvesGridClassName,
} from "@/components/blocks/shelf-grid-card";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

type BookShelvesSectionProps = {
	bookSlug: string;
};

export function BookShelvesSection({ bookSlug }: BookShelvesSectionProps) {
	const { data: session, isPending: sessionPending } = authClient.useSession();

	const shelvesQuery = useQuery(
		orpc.shelf.listForBook.queryOptions({
			input: { bookSlug },
		}),
	);

	const username = session?.user.username;

	return (
		<section aria-labelledby="book-shelves-heading" className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 id="book-shelves-heading" className="font-semibold text-lg">
					Shelves
				</h2>
				{!sessionPending && username ? (
					<BookAddToShelfDialog bookSlug={bookSlug} username={username} />
				) : null}
			</div>

			{shelvesQuery.isPending ? (
				<div className={shelvesGridClassName} aria-hidden>
					{Array.from({ length: 3 }, (_, index) => (
						<Skeleton key={index} className="h-40 w-full" />
					))}
				</div>
			) : shelvesQuery.isError ? null : shelvesQuery.data.items.length === 0 ? (
				<p className="border border-border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
					Not on any public shelves yet.
					{username ? " Add it to one of yours with the button above." : ""}
				</p>
			) : (
				<ul className={shelvesGridClassName}>
					{shelvesQuery.data.items.map((shelf) => (
						<li key={shelf.id}>
							<ShelfGridCard shelf={shelf} showOwnerStatus />
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
