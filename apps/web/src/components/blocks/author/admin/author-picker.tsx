"use client";

import { Input } from "@bbrc/ui/components/input";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { AuthorCardPortrait } from "@/components/blocks/author/author-card";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { orpc } from "@/utils/orpc";

export type PickedAuthor = {
	id: string;
	slug: string;
	name: string;
	photoUrl: string | null;
	lifespan: string | null;
	bookCount: number;
};

/** Finds one of our authors by name (admins: it needs ids, and shows authors without books). */
export function AuthorPicker({
	onPick,
	excludeId,
	placeholder = "Search authors by name…",
	autoFocus,
}: {
	onPick: (author: PickedAuthor) => void;
	excludeId?: string;
	placeholder?: string;
	autoFocus?: boolean;
}) {
	const [query, setQuery] = useState("");
	const debounced = useDebouncedValue(query, 250).trim();
	const results = useQuery(
		orpc.authorAdmin.search.queryOptions({ input: { query: debounced } }),
	);
	const authors = (results.data?.authors ?? []).filter(
		(author) => author.id !== excludeId,
	);

	return (
		<div className="flex flex-col gap-2">
			<div className="relative">
				<Search
					className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
					aria-hidden
				/>
				<Input
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder={placeholder}
					className="ps-8"
					autoComplete="off"
					autoFocus={autoFocus}
					aria-label="Search authors"
				/>
			</div>
			{results.isPending ? (
				<Skeleton className="h-24 w-full" aria-hidden />
			) : authors.length === 0 ? (
				<p className="px-1 text-muted-foreground text-sm">
					No authors match that name.
				</p>
			) : (
				<ul className="max-h-64 divide-y divide-border overflow-y-auto border border-border">
					{authors.map((author) => (
						<li key={author.id}>
							<button
								type="button"
								className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
								onClick={() => onPick(author)}
							>
								<AuthorCardPortrait
									name={author.name}
									photoUrl={author.photoUrl}
									className="w-8"
								/>
								<span className="flex min-w-0 flex-1 flex-col">
									<span className="truncate font-medium text-sm">
										{author.name}
									</span>
									<span className="truncate text-muted-foreground text-xs tabular-nums">
										{[
											author.lifespan,
											`${author.bookCount} ${author.bookCount === 1 ? "book" : "books"}`,
										]
											.filter(Boolean)
											.join(" · ")}
									</span>
								</span>
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
