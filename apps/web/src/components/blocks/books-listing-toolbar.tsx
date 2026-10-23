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
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef } from "react";
import { BooksListExportMenu } from "@/components/blocks/books-list-export-menu";
import {
	BooksListingSubjectSearch,
	type BooksListingSubjectSearchHandle,
} from "@/components/blocks/books-listing-subject-search";
import { ListingAuthorMultiSelect } from "@/components/listing/listing-author-multi-select";
import { ListingCheckboxList } from "@/components/listing/listing-checkbox-list";
import { ListingCountryMultiSelect } from "@/components/listing/listing-country-multi-select";
import { ListingFilterPanel } from "@/components/listing/listing-filter-panel";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingIntegerRangeFields } from "@/components/listing/listing-integer-range-fields";
import { ListingOpenLibraryRatingSlider } from "@/components/listing/listing-open-library-rating-slider";
import { ListingRangeFields } from "@/components/listing/listing-range-fields";
import { ListingRatingRangeFields } from "@/components/listing/listing-rating-range-fields";
import { ListingSideSheetSection } from "@/components/listing/listing-side-sheet";
import { ListingSort } from "@/components/listing/listing-sort";
import { authClient } from "@/lib/auth-client";
import {
	type BookListingStatus,
	bookRangeByLabels,
	bookSortByLabels,
	bookStatuses,
	bookStatusFilterLabels,
	clearBookSheetFilters,
	countBookSheetFilters,
	toBookListAuthorFacetsInput,
	toBookListCountryFacetsInput,
	useBookListingSearchParams,
	type ViewerReadFilter,
	viewerBookFilterLabels,
	viewerReadFilterValues,
} from "@/lib/listing/books-listing";
import { cn } from "@/lib/utils";

const viewerFilterKeys = ["viewerFavorite", "viewerReviewed"] as const;

function viewerReadFilterLabel(value: ViewerReadFilter | null | undefined) {
	if (value === "read") {
		return "Read";
	}
	if (value === "unread") {
		return "Not read";
	}
	return "Any";
}

type BooksListingToolbarProps = {
	/** Author profile: no author or country filters in the sheet. */
	variant?: "library" | "author";
	appearance?: "default" | "library";
};

export function BooksListingToolbar({
	variant = "library",
	appearance = "default",
}: BooksListingToolbarProps) {
	const isLibraryChrome = appearance === "library";
	const [params, setParams] = useBookListingSearchParams();
	const { data: session } = authClient.useSession();
	const sheetFilterCount = countBookSheetFilters(params);
	const authorFacetsInput = useMemo(
		() => toBookListAuthorFacetsInput(params),
		[params],
	);
	const countryFacetsInput = useMemo(
		() => toBookListCountryFacetsInput(params),
		[params],
	);
	const librarySearchRef = useRef<BooksListingSubjectSearchHandle>(null);

	useEffect(() => {
		if (!isLibraryChrome) {
			return;
		}

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "/") {
				return;
			}

			if (event.metaKey || event.ctrlKey || event.altKey) {
				return;
			}

			const target = event.target;
			if (
				target instanceof HTMLElement &&
				(target.isContentEditable ||
					target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.tagName === "SELECT")
			) {
				return;
			}

			event.preventDefault();
			librarySearchRef.current?.focusSearch();
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isLibraryChrome]);

	const toggleViewerFilter = (
		key: (typeof viewerFilterKeys)[number],
		checked: boolean,
	) => {
		void setParams({
			[key]: checked ? true : null,
		});
	};

	const toggleStatus = (status: BookListingStatus, checked: boolean) => {
		const current = params.statuses ?? [];
		const next = checked
			? [...new Set([...current, status])]
			: current.filter((value) => value !== status);

		void setParams({
			statuses: next.length > 0 ? next : null,
		});
	};

	const filterSection = (
		title: string,
		description: string | undefined,
		content: ReactNode,
	) =>
		isLibraryChrome ? (
			<ListingSideSheetSection title={title} description={description}>
				{content}
			</ListingSideSheetSection>
		) : (
			content
		);

	const refineControls = (
		<>
			<ListingSort
				sortBy={params.sortBy}
				sortDirection={params.sortDirection}
				onSortByChange={(sortBy) => {
					void setParams({ sortBy });
				}}
				onSortDirectionChange={(sortDirection) => {
					void setParams({ sortDirection });
				}}
				sortByOptions={bookSortableFields}
				sortByLabels={bookSortByLabels}
				appearance={isLibraryChrome ? "library" : "default"}
			/>
			<BooksListExportMenu
				appearance={isLibraryChrome ? "library" : "default"}
			/>
			<ListingFiltersSheet
				title="Book filters"
				description="Filter by author, status, rating, pages, date, or your library."
				activeFilterCount={sheetFilterCount}
				onClear={() => clearBookSheetFilters(setParams)}
				appearance={isLibraryChrome ? "library" : "default"}
			>
				{session?.user
					? filterSection(
							"Your library",
							"Limit the list to books you have read, favorited, or reviewed.",
							<>
								<Field className="min-w-0">
									{isLibraryChrome ? null : <FieldLabel>Your reads</FieldLabel>}
									{isLibraryChrome ? (
										<FieldLabel className="text-muted-foreground text-xs">
											Read status
										</FieldLabel>
									) : null}
									<Select
										value={params.viewerRead ?? "any"}
										onValueChange={(value) => {
											void setParams({
												viewerRead:
													value === "any"
														? null
														: value === "read" || value === "unread"
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
												{viewerReadFilterLabel(params.viewerRead)}
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
									legend={isLibraryChrome ? undefined : "Your library"}
									options={viewerFilterKeys.map((key) => ({
										id: key,
										label: viewerBookFilterLabels[key],
										checked: params[key] === true,
										onCheckedChange: (checked) => {
											toggleViewerFilter(key, checked);
										},
									}))}
								/>
							</>,
						)
					: null}

				{filterSection(
					"Catalog status",
					"Club reading phase for each title.",
					<ListingCheckboxList
						legend={isLibraryChrome ? undefined : "Status"}
						options={bookStatuses.map((status) => ({
							id: status,
							label: bookStatusFilterLabels[status],
							checked: params.statuses?.includes(status) ?? false,
							onCheckedChange: (checked) => {
								toggleStatus(status, checked);
							},
						}))}
					/>,
				)}

				{filterSection(
					"Ratings & size",
					"Open Library score, page count, and publication year.",
					<div className="flex flex-col gap-3">
						{isLibraryChrome ? (
							<ListingFilterPanel title="Open Library rating">
								<ListingOpenLibraryRatingSlider
									min={params.minOpenLibraryRating}
									max={params.maxOpenLibraryRating}
									onMinChange={(minOpenLibraryRating) => {
										void setParams({ minOpenLibraryRating });
									}}
									onMaxChange={(maxOpenLibraryRating) => {
										void setParams({ maxOpenLibraryRating });
									}}
								/>
							</ListingFilterPanel>
						) : (
							<ListingOpenLibraryRatingSlider
								min={params.minOpenLibraryRating}
								max={params.maxOpenLibraryRating}
								onMinChange={(minOpenLibraryRating) => {
									void setParams({ minOpenLibraryRating });
								}}
								onMaxChange={(maxOpenLibraryRating) => {
									void setParams({ maxOpenLibraryRating });
								}}
							/>
						)}
						{isLibraryChrome ? (
							<ListingFilterPanel title="Page count">
								<ListingIntegerRangeFields
									minId="book-filter-min-pages"
									maxId="book-filter-max-pages"
									min={params.minPages}
									max={params.maxPages}
									minLabel="Minimum pages"
									maxLabel="Maximum pages"
									onMinChange={(minPages) => {
										void setParams({ minPages });
									}}
									onMaxChange={(maxPages) => {
										void setParams({ maxPages });
									}}
								/>
							</ListingFilterPanel>
						) : (
							<ListingIntegerRangeFields
								legend="Page count"
								minId="book-filter-min-pages"
								maxId="book-filter-max-pages"
								min={params.minPages}
								max={params.maxPages}
								onMinChange={(minPages) => {
									void setParams({ minPages });
								}}
								onMaxChange={(maxPages) => {
									void setParams({ maxPages });
								}}
							/>
						)}
						{isLibraryChrome ? (
							<ListingFilterPanel title="First published">
								<ListingIntegerRangeFields
									minId="book-filter-min-published"
									maxId="book-filter-max-published"
									min={params.minPublishedIn}
									max={params.maxPublishedIn}
									inputMin={0}
									minLabel="From year"
									maxLabel="To year"
									placeholderMin="e.g. 1900"
									placeholderMax={`e.g. ${new Date().getFullYear()}`}
									onMinChange={(minPublishedIn) => {
										void setParams({ minPublishedIn });
									}}
									onMaxChange={(maxPublishedIn) => {
										void setParams({ maxPublishedIn });
									}}
								/>
							</ListingFilterPanel>
						) : (
							<ListingIntegerRangeFields
								legend="First published (year)"
								minId="book-filter-min-published"
								maxId="book-filter-max-published"
								min={params.minPublishedIn}
								max={params.maxPublishedIn}
								inputMin={0}
								placeholderMin="e.g. 1900"
								placeholderMax={`e.g. ${new Date().getFullYear()}`}
								onMinChange={(minPublishedIn) => {
									void setParams({ minPublishedIn });
								}}
								onMaxChange={(maxPublishedIn) => {
									void setParams({ maxPublishedIn });
								}}
							/>
						)}
					</div>,
				)}

				{filterSection(
					"Club activity",
					"How many members have finished each book.",
					isLibraryChrome ? (
						<ListingFilterPanel title="Member reads">
							<ListingIntegerRangeFields
								minId="book-filter-min-reads"
								maxId="book-filter-max-reads"
								min={params.minReads}
								max={params.maxReads}
								minLabel="Minimum reads"
								maxLabel="Maximum reads"
								onMinChange={(minReads) => {
									void setParams({ minReads });
								}}
								onMaxChange={(maxReads) => {
									void setParams({ maxReads });
								}}
							/>
						</ListingFilterPanel>
					) : (
						<ListingIntegerRangeFields
							legend="Member reads"
							minId="book-filter-min-reads"
							maxId="book-filter-max-reads"
							min={params.minReads}
							max={params.maxReads}
							onMinChange={(minReads) => {
								void setParams({ minReads });
							}}
							onMaxChange={(maxReads) => {
								void setParams({ maxReads });
							}}
						/>
					),
				)}

				{filterSection(
					"Reviews & club rating",
					"How many club reviews a book has, and how members rated it.",
					<>
						<ListingIntegerRangeFields
							legend="Club reviews"
							minId="book-filter-min-feedbacks"
							maxId="book-filter-max-feedbacks"
							inputMin={0}
							min={params.minFeedbacks}
							max={params.maxFeedbacks}
							onMinChange={(minFeedbacks) => {
								void setParams({ minFeedbacks });
							}}
							onMaxChange={(maxFeedbacks) => {
								void setParams({ maxFeedbacks });
							}}
						/>
						<ListingRatingRangeFields
							legend="Club rating"
							minId="book-filter-min-club-rating"
							maxId="book-filter-max-club-rating"
							min={params.minAverageRating}
							max={params.maxAverageRating}
							onMinChange={(minAverageRating) => {
								void setParams({ minAverageRating });
							}}
							onMaxChange={(maxAverageRating) => {
								void setParams({ maxAverageRating });
							}}
						/>
					</>,
				)}

				{variant === "library"
					? filterSection(
							"People & places",
							params.authors && params.authors.length > 0
								? "Countries update to match selected authors. Author options ignore country filters."
								: "Authors and countries represented in the catalog.",
							<>
								<ListingAuthorMultiSelect
									selectedSlugs={params.authors ?? []}
									onSelectedSlugsChange={(authors) => {
										void setParams({
											authors: authors.length > 0 ? authors : null,
										});
									}}
									facetInput={authorFacetsInput}
								/>
								<ListingCountryMultiSelect
									selectedAlpha2={params.countries ?? []}
									onSelectedAlpha2Change={(countries) => {
										void setParams({
											countries: countries.length > 0 ? countries : null,
										});
									}}
									facetInput={countryFacetsInput}
								/>
							</>,
						)
					: null}

				{filterSection(
					"Catalog dates",
					"When titles were added or last updated.",
					<ListingRangeFields
						rangeBy={params.rangeBy}
						rangeMin={params.rangeMin}
						rangeMax={params.rangeMax}
						onRangeByChange={(rangeBy) => {
							void setParams({ rangeBy });
						}}
						onRangeMinChange={(rangeMin) => {
							void setParams({ rangeMin });
						}}
						onRangeMaxChange={(rangeMax) => {
							void setParams({ rangeMax });
						}}
						rangeByOptions={bookRangeableFields}
						rangeByLabels={bookRangeByLabels}
						legend={isLibraryChrome ? undefined : "Date range"}
					/>,
				)}
			</ListingFiltersSheet>
		</>
	);

	if (isLibraryChrome) {
		return (
			<div className="flex flex-col gap-4">
				<BooksListingSubjectSearch
					ref={librarySearchRef}
					search={params.search}
					subjects={params.subjects ?? []}
					subjectsMatch={params.subjectsMatch}
					onSearchChange={(search) => {
						void setParams({ search });
					}}
					onSubjectsChange={(subjects) => {
						void setParams({
							subjects,
							subjectsMatch:
								subjects != null && subjects.length > 1
									? (params.subjectsMatch ?? "any")
									: null,
						});
					}}
					onSubjectsMatchChange={(subjectsMatch) => {
						void setParams({ subjectsMatch });
					}}
				/>
				<div className="flex flex-wrap items-center justify-end gap-2">
					{refineControls}
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
			<BooksListingSubjectSearch
				search={params.search}
				subjects={params.subjects ?? []}
				subjectsMatch={params.subjectsMatch}
				onSearchChange={(search) => {
					void setParams({ search });
				}}
				onSubjectsChange={(subjects) => {
					void setParams({
						subjects,
						subjectsMatch:
							subjects != null && subjects.length > 1
								? (params.subjectsMatch ?? "any")
								: null,
					});
				}}
				onSubjectsMatchChange={(subjectsMatch) => {
					void setParams({ subjectsMatch });
				}}
			/>
			<div className={cn("flex flex-wrap items-center gap-2 lg:shrink-0")}>
				{refineControls}
			</div>
		</div>
	);
}
