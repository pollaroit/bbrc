"use client";

import { type Locale, regionName } from "@bbrc/i18n";
import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import { Input } from "@bbrc/ui/components/input";
import { ScrollArea } from "@bbrc/ui/components/scroll-area";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@bbrc/ui/components/toggle-group";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import type { AuthorFilterChip } from "@/components/blocks/author/author-filter-bar";
import { ListingIntegerRangeFields } from "@/components/listing/listing-integer-range-fields";
import { ListingRatingRangeFields } from "@/components/listing/listing-rating-range-fields";
import {
	type AuthorBookFilterParams,
	type AuthorBookFilterSetter,
	toAuthorBookFacetsInput,
} from "@/lib/listing/author-activity-listing";
import { subjectSlugToLabel } from "@/lib/listing/subject-search";
import { orpc } from "@/utils/orpc";

type FacetRow = { value: string; label: string; count: number };

export function AuthorFilterFacetList({
	label,
	rows,
	selected,
	onChange,
	isPending,
	searchPlaceholder,
	emptyText,
}: {
	label: string;
	rows: FacetRow[];
	selected: string[];
	onChange: (values: string[]) => void;
	isPending: boolean;
	searchPlaceholder: string;
	emptyText: string;
}) {
	const t = useTranslations("authors");
	const [search, setSearch] = useState("");

	// A pick stays listed even when other filters leave it with no books.
	const all = useMemo(() => {
		const known = new Set(rows.map((row) => row.value));
		const missing = selected
			.filter((value) => !known.has(value))
			.map((value) => ({ value, label: value, count: 0 }));
		return [...missing, ...rows];
	}, [rows, selected]);

	const visible = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return all;
		return all.filter((row) => row.label.toLowerCase().includes(query));
	}, [all, search]);

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between gap-2">
				<p className="font-medium text-sm">{label}</p>
				{selected.length > 0 ? (
					<Button
						type="button"
						variant="ghost"
						size="xs"
						onClick={() => onChange([])}
					>
						{t("filters.clearCount", { count: selected.length })}
					</Button>
				) : null}
			</div>
			<div className="relative">
				<SearchIcon className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
				<Input
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder={searchPlaceholder}
					className="pl-9"
					aria-label={t("filters.search", { label: label.toLowerCase() })}
				/>
			</div>
			<ScrollArea className="max-h-44 border border-border">
				{isPending ? (
					<div className="flex flex-col gap-1 p-1" aria-hidden>
						{Array.from({ length: 4 }, (_, index) => (
							<Skeleton key={index} className="h-8 w-full" />
						))}
					</div>
				) : visible.length === 0 ? (
					<p className="px-3 py-4 text-center text-muted-foreground text-sm">
						{emptyText}
					</p>
				) : (
					<ul className="flex flex-col p-1">
						{visible.map((row) => {
							const checked = selected.includes(row.value);
							return (
								<li key={row.value}>
									{/* biome-ignore lint/a11y/noLabelWithoutControl: the checkbox sits inside the label */}
									<label className="flex min-w-0 cursor-pointer items-center gap-2.5 px-2 py-1.5 hover:bg-muted/60">
										<Checkbox
											checked={checked}
											onCheckedChange={(value) => {
												onChange(
													value === true
														? [...selected, row.value]
														: selected.filter((item) => item !== row.value),
												);
											}}
										/>
										<span className="min-w-0 flex-1 truncate text-sm">
											{row.label}
										</span>
										<Badge variant="outline" className="tabular-nums">
											{row.count}
										</Badge>
									</label>
								</li>
							);
						})}
					</ul>
				)}
			</ScrollArea>
		</div>
	);
}

type AuthorFilterBooksProps = {
	/** The author's slug (the facets are scoped to their books). */
	slug: string;
	params: AuthorBookFilterParams;
	setParams: AuthorBookFilterSetter;
	/** Keeps input ids unique when two groups are on a page. */
	idPrefix?: string;
};

/**
 * The book filters of /books that make sense for one author's books: subjects, literary
 * origin, page count, first published year and club rating. Reads and Reviews use it to
 * narrow down which books the rows are about.
 */
export function AuthorFilterBooks({
	slug,
	params,
	setParams,
	idPrefix = "author-books",
}: AuthorFilterBooksProps) {
	const t = useTranslations("authors");
	const facetsQuery = useQuery(
		orpc.author.bookFacets.queryOptions({
			input: toAuthorBookFacetsInput(slug, params),
			placeholderData: (previous) => previous,
		}),
	);
	const facets = facetsQuery.data;
	const subjects = params.subjects ?? [];
	const countries = params.countries ?? [];

	return (
		<div className="flex flex-col gap-5">
			<div className="flex flex-col gap-2">
				<AuthorFilterFacetList
					label={t("filters.subjects")}
					searchPlaceholder={t("filters.searchSubjects")}
					emptyText={t("filters.noSubjects")}
					isPending={facetsQuery.isPending}
					rows={(facets?.subjects ?? []).map((subject) => ({
						value: subject.slug,
						label: subject.name,
						count: subject.bookCount,
					}))}
					selected={subjects}
					onChange={(next) => {
						void setParams({
							subjects: next.length > 0 ? next : null,
							subjectsMatch:
								next.length > 1 ? (params.subjectsMatch ?? "any") : null,
						});
					}}
				/>
				{subjects.length > 1 ? (
					<ToggleGroup
						value={[params.subjectsMatch ?? "any"]}
						onValueChange={(value) => {
							const next = value[0];
							if (next === "any" || next === "all") {
								void setParams({ subjectsMatch: next });
							}
						}}
						variant="outline"
						size="sm"
						aria-label={t("filters.subjectsMatch")}
					>
						<ToggleGroupItem value="any">
							{t("filters.anySubject")}
						</ToggleGroupItem>
						<ToggleGroupItem value="all">
							{t("filters.allSubjects")}
						</ToggleGroupItem>
					</ToggleGroup>
				) : null}
			</div>

			<AuthorFilterFacetList
				label={t("filters.origin")}
				searchPlaceholder={t("filters.searchCountries")}
				emptyText={t("filters.noCountries")}
				isPending={facetsQuery.isPending}
				rows={(facets?.countries ?? []).map((country) => ({
					value: country.alpha2,
					label: country.name,
					count: country.bookCount,
				}))}
				selected={countries}
				onChange={(next) => {
					void setParams({ countries: next.length > 0 ? next : null });
				}}
			/>

			<ListingIntegerRangeFields
				legend={t("filters.pageCount")}
				minId={`${idPrefix}-min-pages`}
				maxId={`${idPrefix}-max-pages`}
				min={params.minPages}
				max={params.maxPages}
				placeholderMin={
					facets?.ranges.pages ? String(facets.ranges.pages.min) : undefined
				}
				placeholderMax={
					facets?.ranges.pages ? String(facets.ranges.pages.max) : undefined
				}
				onMinChange={(minPages) => {
					void setParams({ minPages });
				}}
				onMaxChange={(maxPages) => {
					void setParams({ maxPages });
				}}
			/>

			<ListingIntegerRangeFields
				legend={t("filters.firstPublished")}
				minId={`${idPrefix}-min-published`}
				maxId={`${idPrefix}-max-published`}
				inputMin={0}
				min={params.minPublishedIn}
				max={params.maxPublishedIn}
				placeholderMin={
					facets?.ranges.publishedIn
						? String(facets.ranges.publishedIn.min)
						: undefined
				}
				placeholderMax={
					facets?.ranges.publishedIn
						? String(facets.ranges.publishedIn.max)
						: undefined
				}
				onMinChange={(minPublishedIn) => {
					void setParams({ minPublishedIn });
				}}
				onMaxChange={(maxPublishedIn) => {
					void setParams({ maxPublishedIn });
				}}
			/>

			<ListingRatingRangeFields
				legend={t("filters.clubRating")}
				minId={`${idPrefix}-min-club-rating`}
				maxId={`${idPrefix}-max-club-rating`}
				min={params.minAverageRating}
				max={params.maxAverageRating}
				onMinChange={(minAverageRating) => {
					void setParams({ minAverageRating });
				}}
				onMaxChange={(maxAverageRating) => {
					void setParams({ maxAverageRating });
				}}
			/>
		</div>
	);
}

type AuthorsT = ReturnType<typeof useTranslations<"authors">>;

function rangeLabel(
	t: AuthorsT,
	name: string,
	min: number | null,
	max: number | null,
) {
	if (min != null && max != null) {
		return t("filters.rangeBetween", { name, min, max });
	}
	if (min != null) return t("filters.rangeMin", { name, min });
	return t("filters.rangeMax", { name, max: max ?? 0 });
}

/** One removable chip per active book filter, for the strip under the search box. */
export function useAuthorBookFilterChips(
	params: AuthorBookFilterParams,
	setParams: AuthorBookFilterSetter,
): AuthorFilterChip[] {
	const t = useTranslations("authors");
	const locale = useLocale() as Locale;
	const chips: AuthorFilterChip[] = [];

	for (const slug of params.subjects ?? []) {
		chips.push({
			id: `subject:${slug}`,
			label: subjectSlugToLabel(slug),
			onRemove: () => {
				const next = (params.subjects ?? []).filter((item) => item !== slug);
				void setParams({
					subjects: next.length > 0 ? next : null,
					subjectsMatch: next.length > 1 ? params.subjectsMatch : null,
				});
			},
		});
	}

	for (const code of params.countries ?? []) {
		chips.push({
			id: `country:${code}`,
			label: regionName(locale, code) ?? code,
			onRemove: () => {
				const next = (params.countries ?? []).filter((item) => item !== code);
				void setParams({ countries: next.length > 0 ? next : null });
			},
		});
	}

	if (params.minPages != null || params.maxPages != null) {
		chips.push({
			id: "pages",
			label: rangeLabel(
				t,
				t("filters.chipPages"),
				params.minPages,
				params.maxPages,
			),
			onRemove: () => void setParams({ minPages: null, maxPages: null }),
		});
	}

	if (params.minPublishedIn != null || params.maxPublishedIn != null) {
		chips.push({
			id: "published",
			label: rangeLabel(
				t,
				t("filters.chipPublished"),
				params.minPublishedIn,
				params.maxPublishedIn,
			),
			onRemove: () =>
				void setParams({ minPublishedIn: null, maxPublishedIn: null }),
		});
	}

	if (params.minAverageRating != null || params.maxAverageRating != null) {
		chips.push({
			id: "club-rating",
			label: rangeLabel(
				t,
				t("filters.chipClubRating"),
				params.minAverageRating,
				params.maxAverageRating,
			),
			onRemove: () =>
				void setParams({ minAverageRating: null, maxAverageRating: null }),
		});
	}

	return chips;
}
