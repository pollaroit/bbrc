"use client";

import {
	bookRangeableFields,
	bookSortableFields,
} from "@bbrc/api/modules/book/book.listing";
import { Field, FieldLabel } from "@bbrc/ui/components/field";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
	AuthorFilterBar,
	type AuthorFilterChip,
} from "@/components/blocks/author/author-filter-bar";
import { AuthorFilterFacetList } from "@/components/blocks/author/author-filter-books";
import { BooksListingSubjectSearch } from "@/components/blocks/books-listing-subject-search";
import { ListingCheckboxList } from "@/components/listing/listing-checkbox-list";
import { ListingFilterPanel } from "@/components/listing/listing-filter-panel";
import { ListingIntegerRangeFields } from "@/components/listing/listing-integer-range-fields";
import { ListingOpenLibraryRatingSlider } from "@/components/listing/listing-open-library-rating-slider";
import { ListingRangeFields } from "@/components/listing/listing-range-fields";
import { ListingRatingRangeFields } from "@/components/listing/listing-rating-range-fields";
import { ListingSideSheetSection } from "@/components/listing/listing-side-sheet";
import { ListingSort } from "@/components/listing/listing-sort";
import { authClient } from "@/lib/auth-client";
import { useFormatters } from "@/lib/i18n/use-formatters";
import {
	bookRangeByLabels,
	bookSortByLabels,
	bookStatuses,
	bookStatusFilterLabels,
	clearBookSheetFilters,
	countBookSheetFilters,
	toBookListCatalogFilterInput,
	useBookListingSearchParams,
	type ViewerReadFilter,
	viewerBookFilterLabels,
	viewerReadFilterValues,
} from "@/lib/listing/books-listing";
import { subjectSlugToLabel } from "@/lib/listing/subject-search";
import { orpc } from "@/utils/orpc";

const viewerFilterKeys = [
	"viewerFavorite",
	"viewerReviewed",
	"viewerWishlist",
	"viewerReading",
] as const;

const regionNames =
	typeof Intl !== "undefined" && "DisplayNames" in Intl
		? new Intl.DisplayNames(["en"], { type: "region" })
		: null;

function span(name: string, min: number | null, max: number | null) {
	if (min != null && max != null) return `${name} ${min}–${max}`;
	if (min != null) return `${name} ${min}+`;
	return `${name} up to ${max}`;
}

/**
 * Search, sort and filters of the author's Books tab. The same filters as /books (this is
 * the same URL state), minus the author filter, with the country list scoped to this
 * author's books.
 */
export function AuthorPageBooksToolbar({
	slug,
	total,
}: {
	slug: string;
	total: number | undefined;
}) {
	const f = useFormatters();
	const [params, setParams] = useBookListingSearchParams();
	const { data: session } = authClient.useSession();
	const activeCount = countBookSheetFilters({ ...params, authors: null });
	const filtered = activeCount > 0 || Boolean(params.search?.trim());

	const facetInput = useMemo(() => {
		const { countries: _countries, ...rest } = toBookListCatalogFilterInput({
			...params,
			authors: null,
		});
		return { ...rest, slug };
	}, [params, slug]);

	const facetsQuery = useQuery(
		orpc.author.bookFacets.queryOptions({
			input: facetInput,
			placeholderData: (previous) => previous,
		}),
	);

	const clearAll = () => {
		clearBookSheetFilters(setParams);
		void setParams({ search: null, subjects: null, subjectsMatch: null });
	};

	const chips: AuthorFilterChip[] = [
		...(params.subjects ?? []).map((subject) => ({
			id: `subject:${subject}`,
			label: subjectSlugToLabel(subject),
			onRemove: () => {
				const next = (params.subjects ?? []).filter((item) => item !== subject);
				void setParams({
					subjects: next.length > 0 ? next : null,
					subjectsMatch: next.length > 1 ? params.subjectsMatch : null,
				});
			},
		})),
		...(params.countries ?? []).map((code) => ({
			id: `country:${code}`,
			label: regionNames?.of(code.toUpperCase()) ?? code,
			onRemove: () => {
				const next = (params.countries ?? []).filter((item) => item !== code);
				void setParams({ countries: next.length > 0 ? next : null });
			},
		})),
		...(params.statuses ?? []).map((status) => ({
			id: `status:${status}`,
			label: bookStatusFilterLabels[status],
			onRemove: () => {
				const next = (params.statuses ?? []).filter((item) => item !== status);
				void setParams({ statuses: next.length > 0 ? next : null });
			},
		})),
		...(params.viewerRead
			? [
					{
						id: "viewer-read",
						label:
							params.viewerRead === "read" ? "Read by me" : "Not read by me",
						onRemove: () => void setParams({ viewerRead: null }),
					},
				]
			: []),
		...viewerFilterKeys
			.filter((key) => params[key] === true)
			.map((key) => ({
				id: key,
				label: viewerBookFilterLabels[key],
				onRemove: () => void setParams({ [key]: null }),
			})),
		...(params.minPages != null || params.maxPages != null
			? [
					{
						id: "pages",
						label: span("Pages", params.minPages, params.maxPages),
						onRemove: () => void setParams({ minPages: null, maxPages: null }),
					},
				]
			: []),
		...(params.minPublishedIn != null || params.maxPublishedIn != null
			? [
					{
						id: "published",
						label: span(
							"Published",
							params.minPublishedIn,
							params.maxPublishedIn,
						),
						onRemove: () =>
							void setParams({ minPublishedIn: null, maxPublishedIn: null }),
					},
				]
			: []),
		...(params.minReads != null || params.maxReads != null
			? [
					{
						id: "reads",
						label: span("Reads", params.minReads, params.maxReads),
						onRemove: () => void setParams({ minReads: null, maxReads: null }),
					},
				]
			: []),
		...(params.minFeedbacks != null || params.maxFeedbacks != null
			? [
					{
						id: "reviews",
						label: span("Reviews", params.minFeedbacks, params.maxFeedbacks),
						onRemove: () =>
							void setParams({ minFeedbacks: null, maxFeedbacks: null }),
					},
				]
			: []),
		...(params.minAverageRating != null || params.maxAverageRating != null
			? [
					{
						id: "club-rating",
						label: span(
							"Club rating",
							params.minAverageRating,
							params.maxAverageRating,
						),
						onRemove: () =>
							void setParams({
								minAverageRating: null,
								maxAverageRating: null,
							}),
					},
				]
			: []),
		...(params.minOpenLibraryRating != null ||
		params.maxOpenLibraryRating != null
			? [
					{
						id: "ol-rating",
						label: span(
							"Open Library",
							params.minOpenLibraryRating,
							params.maxOpenLibraryRating,
						),
						onRemove: () =>
							void setParams({
								minOpenLibraryRating: null,
								maxOpenLibraryRating: null,
							}),
					},
				]
			: []),
		...(params.rangeMin || params.rangeMax
			? [
					{
						id: "catalog-dates",
						label: "Added or updated in a date range",
						onRemove: () =>
							void setParams({ rangeBy: null, rangeMin: null, rangeMax: null }),
					},
				]
			: []),
	];

	const toggleStatus = (status: (typeof bookStatuses)[number], on: boolean) => {
		const current = params.statuses ?? [];
		const next = on
			? [...new Set([...current, status])]
			: current.filter((value) => value !== status);
		void setParams({ statuses: next.length > 0 ? next : null });
	};

	const resultLabel =
		total == null
			? null
			: `${f.number(total)} ${total === 1 ? "book" : "books"}${filtered ? " match" : ""}`;

	return (
		<AuthorFilterBar
			searchSlot={
				<BooksListingSubjectSearch
					search={params.search}
					subjects={params.subjects ?? []}
					subjectsMatch={params.subjectsMatch}
					onSearchChange={(search) => void setParams({ search })}
					onSubjectsChange={(subjects) => {
						void setParams({
							subjects,
							subjectsMatch:
								subjects != null && subjects.length > 1
									? (params.subjectsMatch ?? "any")
									: null,
						});
					}}
					onSubjectsMatchChange={(subjectsMatch) =>
						void setParams({ subjectsMatch })
					}
				/>
			}
			sort={
				<ListingSort
					sortBy={params.sortBy ?? "publishedIn"}
					sortDirection={params.sortDirection ?? "asc"}
					onSortByChange={(sortBy) => void setParams({ sortBy })}
					onSortDirectionChange={(sortDirection) =>
						void setParams({ sortDirection })
					}
					sortByOptions={bookSortableFields}
					sortByLabels={bookSortByLabels}
				/>
			}
			sheetTitle="Book filters"
			sheetDescription="Filter this author's books by status, rating, pages, year or your own library."
			sheetContent={
				<>
					{session?.user ? (
						<ListingSideSheetSection
							title="Your library"
							description="Limit the list to books you have read, favorited or reviewed."
						>
							<Field className="min-w-0">
								<FieldLabel className="text-muted-foreground text-xs">
									Read status
								</FieldLabel>
								<Select
									value={params.viewerRead ?? "any"}
									onValueChange={(value) => {
										void setParams({
											viewerRead:
												value === "read" || value === "unread"
													? (value as ViewerReadFilter)
													: null,
										});
									}}
								>
									<SelectTrigger
										className="w-full bg-background"
										aria-label="Filter by whether you have read the book"
									>
										<SelectValue placeholder="Any">
											{params.viewerRead === "read"
												? "Read"
												: params.viewerRead === "unread"
													? "Not read"
													: "Any"}
										</SelectValue>
									</SelectTrigger>
									<SelectContent alignItemWithTrigger={false}>
										<SelectGroup>
											<SelectItem value="any">Any</SelectItem>
											{viewerReadFilterValues.map((value) => (
												<SelectItem key={value} value={value}>
													{value === "read" ? "Read" : "Not read"}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
							</Field>
							<ListingCheckboxList
								options={viewerFilterKeys.map((key) => ({
									id: key,
									label: viewerBookFilterLabels[key],
									checked: params[key] === true,
									onCheckedChange: (checked) =>
										void setParams({ [key]: checked ? true : null }),
								}))}
							/>
						</ListingSideSheetSection>
					) : null}

					<ListingSideSheetSection
						title="Catalog status"
						description="Club reading phase for each title."
					>
						<ListingCheckboxList
							options={bookStatuses.map((status) => ({
								id: status,
								label: bookStatusFilterLabels[status],
								checked: params.statuses?.includes(status) ?? false,
								onCheckedChange: (checked) => toggleStatus(status, checked),
							}))}
						/>
					</ListingSideSheetSection>

					<ListingSideSheetSection
						title="Literary origin"
						description="Countries of this author's books."
					>
						<AuthorFilterFacetList
							label="Countries"
							searchPlaceholder="Search countries…"
							emptyText="No countries to choose from."
							isPending={facetsQuery.isPending}
							rows={(facetsQuery.data?.countries ?? []).map((country) => ({
								value: country.alpha2,
								label: country.name,
								count: country.bookCount,
							}))}
							selected={params.countries ?? []}
							onChange={(next) =>
								void setParams({ countries: next.length > 0 ? next : null })
							}
						/>
					</ListingSideSheetSection>

					<ListingSideSheetSection
						title="Ratings & size"
						description="Open Library score, page count and publication year."
					>
						<div className="flex flex-col gap-3">
							<ListingFilterPanel title="Open Library rating">
								<ListingOpenLibraryRatingSlider
									min={params.minOpenLibraryRating}
									max={params.maxOpenLibraryRating}
									onMinChange={(minOpenLibraryRating) =>
										void setParams({ minOpenLibraryRating })
									}
									onMaxChange={(maxOpenLibraryRating) =>
										void setParams({ maxOpenLibraryRating })
									}
								/>
							</ListingFilterPanel>
							<ListingFilterPanel title="Page count">
								<ListingIntegerRangeFields
									minId="author-books-min-pages"
									maxId="author-books-max-pages"
									min={params.minPages}
									max={params.maxPages}
									minLabel="Minimum pages"
									maxLabel="Maximum pages"
									placeholderMin={
										facetsQuery.data?.ranges.pages
											? String(facetsQuery.data.ranges.pages.min)
											: undefined
									}
									placeholderMax={
										facetsQuery.data?.ranges.pages
											? String(facetsQuery.data.ranges.pages.max)
											: undefined
									}
									onMinChange={(minPages) => void setParams({ minPages })}
									onMaxChange={(maxPages) => void setParams({ maxPages })}
								/>
							</ListingFilterPanel>
							<ListingFilterPanel title="First published">
								<ListingIntegerRangeFields
									minId="author-books-min-published"
									maxId="author-books-max-published"
									min={params.minPublishedIn}
									max={params.maxPublishedIn}
									inputMin={0}
									minLabel="From year"
									maxLabel="To year"
									placeholderMin={
										facetsQuery.data?.ranges.publishedIn
											? String(facetsQuery.data.ranges.publishedIn.min)
											: undefined
									}
									placeholderMax={
										facetsQuery.data?.ranges.publishedIn
											? String(facetsQuery.data.ranges.publishedIn.max)
											: undefined
									}
									onMinChange={(minPublishedIn) =>
										void setParams({ minPublishedIn })
									}
									onMaxChange={(maxPublishedIn) =>
										void setParams({ maxPublishedIn })
									}
								/>
							</ListingFilterPanel>
						</div>
					</ListingSideSheetSection>

					<ListingSideSheetSection
						title="Club activity"
						description="How many members finished each book."
					>
						<ListingFilterPanel title="Member reads">
							<ListingIntegerRangeFields
								minId="author-books-min-reads"
								maxId="author-books-max-reads"
								min={params.minReads}
								max={params.maxReads}
								minLabel="Minimum reads"
								maxLabel="Maximum reads"
								onMinChange={(minReads) => void setParams({ minReads })}
								onMaxChange={(maxReads) => void setParams({ maxReads })}
							/>
						</ListingFilterPanel>
					</ListingSideSheetSection>

					<ListingSideSheetSection
						title="Reviews & club rating"
						description="How many club reviews a book has, and how members rated it."
					>
						<ListingIntegerRangeFields
							legend="Club reviews"
							minId="author-books-min-feedbacks"
							maxId="author-books-max-feedbacks"
							inputMin={0}
							min={params.minFeedbacks}
							max={params.maxFeedbacks}
							onMinChange={(minFeedbacks) => void setParams({ minFeedbacks })}
							onMaxChange={(maxFeedbacks) => void setParams({ maxFeedbacks })}
						/>
						<ListingRatingRangeFields
							legend="Club rating"
							minId="author-books-min-club-rating"
							maxId="author-books-max-club-rating"
							min={params.minAverageRating}
							max={params.maxAverageRating}
							onMinChange={(minAverageRating) =>
								void setParams({ minAverageRating })
							}
							onMaxChange={(maxAverageRating) =>
								void setParams({ maxAverageRating })
							}
						/>
					</ListingSideSheetSection>

					<ListingSideSheetSection
						title="Catalog dates"
						description="When titles were added or last updated."
					>
						<ListingRangeFields
							rangeBy={params.rangeBy}
							rangeMin={params.rangeMin}
							rangeMax={params.rangeMax}
							onRangeByChange={(rangeBy) => void setParams({ rangeBy })}
							onRangeMinChange={(rangeMin) => void setParams({ rangeMin })}
							onRangeMaxChange={(rangeMax) => void setParams({ rangeMax })}
							rangeByOptions={bookRangeableFields}
							rangeByLabels={bookRangeByLabels}
							legend={undefined}
						/>
					</ListingSideSheetSection>
				</>
			}
			activeCount={activeCount}
			onClearAll={clearAll}
			chips={chips}
			resultLabel={resultLabel}
		/>
	);
}
