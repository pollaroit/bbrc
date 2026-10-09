"use client";

import { Button } from "@bbrc/ui/components/button";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import {
	Field,
	FieldLabel,
	FieldLegend,
	FieldSet,
	FieldTitle,
} from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { ScrollArea } from "@bbrc/ui/components/scroll-area";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { orpc } from "@/utils/orpc";

type ListingBookMultiSelectProps = {
	legend?: string;
	selectedSlugs: string[];
	onSelectedSlugsChange: (slugs: string[]) => void;
};

export function ListingBookMultiSelect({
	legend = "Books",
	selectedSlugs,
	onSelectedSlugsChange,
}: ListingBookMultiSelectProps) {
	const [search, setSearch] = useState("");

	const booksQuery = useQuery(
		orpc.admin.listBooks.queryOptions({
			input: {
				limit: 60,
				page: 1,
				sortBy: "title",
				sortDirection: "asc",
				statuses: ["completed"],
				search: search.trim() || undefined,
			},
		}),
	);

	const books = booksQuery.data?.items ?? [];

	const visibleBooks = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) {
			return books;
		}
		return books.filter(
			(book) =>
				book.title.toLowerCase().includes(query) ||
				book.slug.toLowerCase().includes(query),
		);
	}, [books, search]);

	const toggle = (slug: string, checked: boolean) => {
		const next = checked
			? [...new Set([...selectedSlugs, slug])]
			: selectedSlugs.filter((value) => value !== slug);
		onSelectedSlugsChange(next);
	};

	return (
		<FieldSet>
			<FieldLegend>{legend}</FieldLegend>
			<Field>
				<FieldLabel className="sr-only">Search books</FieldLabel>
				<div className="relative">
					<SearchIcon className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search completed books…"
						className="pl-9"
						aria-label="Search books in list"
					/>
				</div>
			</Field>
			{selectedSlugs.length > 0 ? (
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => onSelectedSlugsChange([])}
				>
					Clear books ({selectedSlugs.length})
				</Button>
			) : null}
			<ScrollArea className="h-48 border border-border">
				{booksQuery.isPending ? (
					<div className="flex flex-col gap-2 p-3">
						<Skeleton className="h-8 w-full" />
						<Skeleton className="h-8 w-full" />
					</div>
				) : booksQuery.isError ? (
					<p className="p-3 text-destructive text-sm">
						{booksQuery.error.message}
					</p>
				) : visibleBooks.length === 0 ? (
					<p className="p-3 text-muted-foreground text-sm">
						No completed books match.
					</p>
				) : (
					<ul className="divide-y divide-border">
						{visibleBooks.map((book) => (
							<li key={book.slug}>
								<div className="flex cursor-pointer items-start gap-3 p-3 hover:bg-muted/40">
									<Checkbox
										checked={selectedSlugs.includes(book.slug)}
										onCheckedChange={(checked) => {
											toggle(book.slug, checked === true);
										}}
									/>
									<span className="min-w-0 flex-1">
										<FieldTitle className="line-clamp-2 text-sm">
											{book.title}
										</FieldTitle>
										<span className="font-mono text-muted-foreground text-xs">
											{book.slug}
										</span>
									</span>
								</div>
							</li>
						))}
					</ul>
				)}
			</ScrollArea>
		</FieldSet>
	);
}
