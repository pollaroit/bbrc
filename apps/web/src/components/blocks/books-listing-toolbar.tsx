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
import { useTranslations } from "next-intl";
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
import type { BooksTranslator } from "@/lib/books/books-translator";
import { useBookStatusLabels } from "@/lib/i18n/use-labels";
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
import { useBookListingLabels } from "@/lib/listing/books-listing-labels";
import { cn } from "@/lib/utils";

const viewerFilterKeys = [
	"viewerFavorite",
	"viewerReviewed",
	"viewerWishlist",
	"viewerReading",
] as const;

function viewerReadFilterLabel(
	value: ViewerReadFilter | null | undefined,
	t: BooksTranslator,
) {
	if (value === "read") {
		return t("toolbar.read");
	}
	if (value === "unread") {
		return t("toolbar.unread");
	}
	return t("toolbar.any");
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
	const t = useTranslations("books");
	const labels = useBookListingLabels();
	const statusLabels = useBookStatusLabels().label;
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
				sortByLabels={labels.sortBy}
				appearance={isLibraryChrome ? "library" : "default"}
			/>
			<BooksListExportMenu
				appearance={isLibraryChrome ? "library" : "default"}
			/>
			<ListingFiltersSheet
				title={t("toolbar.title")}
				description={t("toolbar.description")}
				activeFilterCount={sheetFilterCount}
				onClear={() => clearBookSheetFilters(setParams)}
				appearance={isLibraryChrome ? "library" : "default"}
			>
				{session?.user
					? filterSection(
							t("toolbar.yourLibrary"),
							t("toolbar.yourLibraryHint"),
							<>
								<Field className="min-w-0">
									{isLibraryChrome ? null : (
										<FieldLabel>{t("toolbar.yourReads")}</FieldLabel>
									)}
									{isLibraryChrome ? (
										<FieldLabel className="text-muted-foreground text-xs">
											{t("toolbar.readStatus")}
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
											aria-label={t("toolbar.readFilterAria")}
										>
											<SelectValue placeholder={t("toolbar.any")}>
												{viewerReadFilterLabel(params.viewerRead, t)}
											</SelectValue>
										</SelectTrigger>
										<SelectContent alignItemWithTrigger={false}>
											<SelectGroup>
												<SelectItem value="any">{t("toolbar.any")}</SelectItem>
												{viewerReadFilterValues.map((value) => (
													<SelectItem key={value} value={value}>
														{value === "read"
															? t("toolbar.read")
															: t("toolbar.unread")}
													</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
								<ListingCheckboxList
									legend={
										isLibraryChrome ? undefined : t("toolbar.yourLibrary")
									}
									options={viewerFilterKeys.map((key) => ({
										id: key,
										label: labels.viewer[key],
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
					t("toolbar.catalogStatus"),
					t("toolbar.catalogStatusHint"),
					<ListingCheckboxList
						legend={isLibraryChrome ? undefined : t("toolbar.status")}
						options={bookStatuses.map((status) => ({
							id: status,
							label: statusLabels[status],
							checked: params.statuses?.includes(status) ?? false,
							onCheckedChange: (checked) => {
								toggleStatus(status, checked);
							},
						}))}
					/>,
				)}

				{filterSection(
					t("toolbar.ratingsSize"),
					t("toolbar.ratingsSizeHint"),
					<div className="flex flex-col gap-3">
						{isLibraryChrome ? (
							<ListingFilterPanel title={t("toolbar.openLibraryRating")}>
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
							<ListingFilterPanel title={t("toolbar.pageCount")}>
								<ListingIntegerRangeFields
									minId="book-filter-min-pages"
									maxId="book-filter-max-pages"
									min={params.minPages}
									max={params.maxPages}
									minLabel={t("toolbar.minPages")}
									maxLabel={t("toolbar.maxPages")}
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
								legend={t("toolbar.pageCount")}
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
							<ListingFilterPanel title={t("toolbar.firstPublished")}>
								<ListingIntegerRangeFields
									minId="book-filter-min-published"
									maxId="book-filter-max-published"
									min={params.minPublishedIn}
									max={params.maxPublishedIn}
									inputMin={0}
									minLabel={t("toolbar.fromYear")}
									maxLabel={t("toolbar.toYear")}
									placeholderMin={t("toolbar.placeholderFrom")}
									placeholderMax={t("toolbar.placeholderTo", {
										year: new Date().getFullYear(),
									})}
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
								legend={t("toolbar.firstPublishedYear")}
								minId="book-filter-min-published"
								maxId="book-filter-max-published"
								min={params.minPublishedIn}
								max={params.maxPublishedIn}
								inputMin={0}
								placeholderMin={t("toolbar.placeholderFrom")}
								placeholderMax={t("toolbar.placeholderTo", {
									year: new Date().getFullYear(),
								})}
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
					t("toolbar.clubActivity"),
					t("toolbar.clubActivityHint"),
					isLibraryChrome ? (
						<ListingFilterPanel title={t("toolbar.memberReads")}>
							<ListingIntegerRangeFields
								minId="book-filter-min-reads"
								maxId="book-filter-max-reads"
								min={params.minReads}
								max={params.maxReads}
								minLabel={t("toolbar.minReads")}
								maxLabel={t("toolbar.maxReads")}
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
							legend={t("toolbar.memberReads")}
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
					t("toolbar.reviewsRating"),
					t("toolbar.reviewsRatingHint"),
					<>
						<ListingIntegerRangeFields
							legend={t("toolbar.clubReviews")}
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
							legend={t("toolbar.clubRating")}
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
							t("toolbar.peoplePlaces"),
							params.authors && params.authors.length > 0
								? t("toolbar.peoplePlacesLinked")
								: t("toolbar.peoplePlacesHint"),
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
					t("toolbar.catalogDates"),
					t("toolbar.catalogDatesHint"),
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
						rangeByLabels={labels.rangeBy}
						legend={isLibraryChrome ? undefined : t("toolbar.dateRange")}
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
