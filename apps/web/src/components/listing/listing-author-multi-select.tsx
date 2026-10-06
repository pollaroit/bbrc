"use client";

import type { GetBookListAuthorFacetsInput } from "@bbrc/api/modules/book/book.schema";
import { Button } from "@bbrc/ui/components/button";
import { Card } from "@bbrc/ui/components/card";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import { FieldLegend, FieldSet } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { ScrollArea } from "@bbrc/ui/components/scroll-area";
import { Separator } from "@bbrc/ui/components/separator";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { orpc } from "@/utils/orpc";

type ListingAuthorMultiSelectProps = {
	legend?: string;
	selectedSlugs: string[];
	onSelectedSlugsChange: (slugs: string[]) => void;
	facetInput: Partial<GetBookListAuthorFacetsInput>;
};

export function ListingAuthorMultiSelect({
	legend = "Authors",
	selectedSlugs,
	onSelectedSlugsChange,
	facetInput,
}: ListingAuthorMultiSelectProps) {
	const [search, setSearch] = useState("");

	const facetsQuery = useQuery({
		...orpc.book.getBookListAuthorFacets.queryOptions({
			input: facetInput,
		}),
	});

	const authors = facetsQuery.data?.authors ?? [];

	const filteredAuthors = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) {
			return authors;
		}

		return authors.filter(
			(author) =>
				author.name.toLowerCase().includes(query) ||
				author.slug.includes(query),
		);
	}, [authors, search]);

	const selectedSet = useMemo(() => new Set(selectedSlugs), [selectedSlugs]);

	function toggleAuthor(slug: string, checked: boolean) {
		if (checked) {
			if (selectedSet.has(slug)) {
				return;
			}

			onSelectedSlugsChange([...selectedSlugs, slug]);
			return;
		}

		onSelectedSlugsChange(selectedSlugs.filter((value) => value !== slug));
	}

	const legendLabel =
		selectedSlugs.length > 0
			? `${legend} (${selectedSlugs.length} selected)`
			: legend;

	return (
		<FieldSet className="gap-3">
			<div className="flex items-center justify-between gap-2">
				<FieldLegend className="mb-0">{legendLabel}</FieldLegend>
				{selectedSlugs.length > 0 ? (
					<Button
						type="button"
						variant="ghost"
						size="xs"
						className="h-auto shrink-0 px-2 py-1 text-xs"
						onClick={() => {
							onSelectedSlugsChange([]);
						}}
					>
						Clear authors
					</Button>
				) : null}
			</div>
			<div className="relative">
				<SearchIcon
					className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
					aria-hidden
				/>
				<Input
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder="Search authors…"
					className="ps-8"
					autoComplete="off"
					aria-label="Search authors in list"
				/>
			</div>
			<Card className="w-full p-0">
				<ScrollArea className="h-48">
					{facetsQuery.isPending ? (
						<div className="flex flex-col gap-2 p-3" aria-hidden>
							{Array.from({ length: 5 }, (_, index) => (
								<Skeleton key={index} className="h-8 w-full" />
							))}
						</div>
					) : facetsQuery.isError ? (
						<p className="p-3 text-destructive text-sm">
							{facetsQuery.error.message}
						</p>
					) : filteredAuthors.length === 0 ? (
						<p className="p-3 text-muted-foreground text-sm">
							{authors.length === 0
								? "No authors match the current filters."
								: "No authors match your search."}
						</p>
					) : (
						<ul className="flex flex-col">
							{filteredAuthors.map((author, index) => (
								<Fragment key={author.slug}>
									{index > 0 ? <Separator /> : null}
									<li>
										<Field orientation="horizontal" className="gap-0">
											<FieldLabel className="w-full px-4 py-3 hover:bg-muted/40">
												<Checkbox
													checked={selectedSet.has(author.slug)}
													onCheckedChange={(value) => {
														toggleAuthor(author.slug, value === true);
													}}
												/>
												<FieldTitle className="flex min-w-0 flex-1 items-baseline gap-2 font-normal text-foreground text-sm">
													<span className="shrink-0 text-muted-foreground tabular-nums">
														{author.bookCount}
													</span>
													<span className="min-w-0">{author.name}</span>
												</FieldTitle>
											</FieldLabel>
										</Field>
									</li>
								</Fragment>
							))}
						</ul>
					)}
				</ScrollArea>
			</Card>
		</FieldSet>
	);
}
