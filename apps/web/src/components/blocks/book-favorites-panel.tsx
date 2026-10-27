"use client";

import type { ListBookFavoritesOutput } from "@bbrc/api/modules/favorite/favorite.schema";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@bbrc/ui/components/empty";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { UserPanel } from "@/components/blocks/user-panel";
import { Link } from "@/i18n/navigation";
import { formatDateTime } from "@/lib/format-datetime";
import { formatFavoriteSlots } from "@/lib/format-favorite-slots";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const favoritesGridClassName =
	"grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

type BookFavoritesPanelProps = {
	bookSlug: string;
	initialData?: ListBookFavoritesOutput;
};

function FavoritesCountLine({ total }: { total: number }) {
	const noun = total === 1 ? "member" : "members";
	return (
		<p className="text-muted-foreground text-sm tabular-nums">
			{total} {noun} favorited this book
		</p>
	);
}

function BookFavoritesGrid({ data }: { data: ListBookFavoritesOutput }) {
	if (data.items.length === 0) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyTitle>No favorites yet</EmptyTitle>
					<EmptyDescription>
						When members add this book to their favorites, they appear here.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<ul className={favoritesGridClassName}>
			{data.items.map((item) => (
				<li
					key={item.user.username}
					className="flex h-full flex-col gap-3 border border-border p-4"
				>
					<Link
						href={`/users/${item.user.username}` as Route}
						className="min-w-0 outline-offset-2"
					>
						<UserPanel user={item.user} className="min-w-0" />
					</Link>
					<div className="flex flex-col gap-1 text-sm">
						<p className="text-muted-foreground">
							Favorited {formatDateTime(item.favoritedAt)}
						</p>
						<p className="text-muted-foreground tabular-nums">
							{formatFavoriteSlots(item.slotsUsed, item.maxSlots)}
						</p>
					</div>
				</li>
			))}
		</ul>
	);
}

export function BookFavoritesPanel({
	bookSlug,
	initialData,
}: BookFavoritesPanelProps) {
	const favoritesQuery = useQuery({
		...orpc.favorite.listForBook.queryOptions({
			input: { bookSlug, limit: 100 },
		}),
		initialData,
		staleTime: 0,
	});

	if (favoritesQuery.isPending && !favoritesQuery.data) {
		return (
			<section aria-labelledby="book-favorites-heading" className="space-y-4">
				<Skeleton className="h-7 w-32" />
				<Skeleton className="h-5 w-48" />
				<div className={cn(favoritesGridClassName)} aria-hidden>
					{Array.from({ length: 3 }, (_, index) => (
						<Skeleton key={index} className="h-36 w-full" />
					))}
				</div>
			</section>
		);
	}

	if (favoritesQuery.isError) {
		return (
			<p className="text-muted-foreground text-sm">
				Could not load favorites. Refresh the page to try again.
			</p>
		);
	}

	const data = favoritesQuery.data;

	return (
		<section aria-labelledby="book-favorites-heading" className="space-y-4">
			<div className="flex flex-col gap-1">
				<h2 id="book-favorites-heading" className="font-semibold text-lg">
					Favorites
				</h2>
				<FavoritesCountLine total={data.total} />
			</div>
			<BookFavoritesGrid data={data} />
		</section>
	);
}
