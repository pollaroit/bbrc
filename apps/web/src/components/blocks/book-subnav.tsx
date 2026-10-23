"use client";

import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	BOOK_DETAIL_TABS,
	bookDetailTabFromPathname,
} from "@/lib/book-detail-tabs";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export type BookTabCounts = {
	documents?: number;
	shelves?: number;
	reviews?: number;
	reads?: number;
	favorites?: number;
	sittings?: number;
};

type BookSubnavProps = {
	slug: string;
	counts?: BookTabCounts;
};

function tabLabel(
	tab: (typeof BOOK_DETAIL_TABS)[number],
	counts?: BookTabCounts,
): string {
	if (!counts) {
		return tab.label;
	}

	const count =
		tab.id === "documents"
			? counts.documents
			: tab.id === "shelves"
				? counts.shelves
				: tab.id === "reviews"
					? counts.reviews
					: tab.id === "reads"
						? counts.reads
						: tab.id === "favorites"
							? counts.favorites
							: tab.id === "sittings"
								? counts.sittings
								: undefined;

	if (count == null || count < 1) {
		return tab.label;
	}

	return `${tab.label} (${count})`;
}

export function BookSubnav({ slug, counts }: BookSubnavProps) {
	const pathname = usePathname() ?? "";
	const active = bookDetailTabFromPathname(slug, pathname);

	const readsCountQuery = useQuery(
		orpc.read.listForBook.queryOptions({
			input: { bookSlug: slug, limit: 1 },
		}),
	);

	const favoritesCountQuery = useQuery(
		orpc.favorite.listForBook.queryOptions({
			input: { bookSlug: slug, limit: 1 },
		}),
	);

	const effectiveCounts: BookTabCounts | undefined = counts
		? {
				...counts,
				reads: readsCountQuery.data?.total ?? counts.reads,
				favorites: favoritesCountQuery.data?.total ?? counts.favorites,
			}
		: undefined;

	return (
		<nav
			className="flex flex-wrap gap-1 border-border border-b pb-0"
			aria-label="Book sections"
		>
			{BOOK_DETAIL_TABS.map((tab) => {
				const href = tab.href(slug);
				const isActive = tab.id === active;

				return (
					<Link
						key={tab.id}
						href={href as Route}
						className={cn(
							"-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
							isActive
								? "border-foreground font-medium text-foreground"
								: "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground",
						)}
					>
						{tabLabel(tab, effectiveCounts)}
					</Link>
				);
			})}
		</nav>
	);
}
