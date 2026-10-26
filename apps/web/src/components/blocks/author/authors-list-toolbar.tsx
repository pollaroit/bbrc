"use client";

import {
	Field,
	FieldGroup,
	FieldLegend,
	FieldSet,
} from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { Label } from "@bbrc/ui/components/label";
import { useMemo } from "react";
import { ListingAuthorCountryMultiSelect } from "@/components/listing/listing-author-country-multi-select";
import { ListingCheckboxList } from "@/components/listing/listing-checkbox-list";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingIntegerRangeFields } from "@/components/listing/listing-integer-range-fields";
import { ListingOpenLibraryRatingSlider } from "@/components/listing/listing-open-library-rating-slider";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import { authClient } from "@/lib/auth-client";
import {
	AUTHOR_GENDER_FILTERS,
	AUTHOR_STATUS_FILTERS,
	authorDirectorySortFieldsList,
	authorGenderLabels,
	authorSortByLabels,
	authorStatusLabels,
	clearAuthorSheetFilters,
	countAuthorSheetFilters,
	toAuthorNationalityFacetsInput,
	useAuthorsListingSearchParams,
} from "@/lib/listing/authors-listing";

const MINIMUMS = [
	{ key: "minBooks", id: "author-min-books", label: "Books" },
	{ key: "minReaders", id: "author-min-readers", label: "Readers" },
	{ key: "minReads", id: "author-min-reads", label: "Reads" },
	{ key: "minReviews", id: "author-min-reviews", label: "Reviews" },
] as const;

function toggled<T extends string>(
	current: readonly T[] | null,
	value: T,
	checked: boolean,
): T[] | null {
	const next = checked
		? [...(current ?? []), value]
		: (current ?? []).filter((entry) => entry !== value);
	return next.length > 0 ? next : null;
}

export function AuthorsListToolbar() {
	const [params, setParams] = useAuthorsListingSearchParams();
	const { data: session } = authClient.useSession();
	const isAdmin = session?.user.isAdmin === true;
	const facetsInput = useMemo(
		() => toAuthorNationalityFacetsInput(params),
		[params],
	);

	return (
		<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
			<ListingSearch
				value={params.search ?? ""}
				onChange={(search) => {
					void setParams({ search });
				}}
				placeholder="Search authors by name…"
			/>

			<div className="flex flex-wrap items-center gap-2 lg:shrink-0">
				<ListingSort
					sortBy={params.sortBy}
					sortDirection={params.sortDirection}
					onSortByChange={(sortBy) => {
						void setParams({ sortBy: sortBy ?? "bookCount" });
					}}
					onSortDirectionChange={(sortDirection) => {
						void setParams({ sortDirection: sortDirection ?? "desc" });
					}}
					sortByOptions={authorDirectorySortFieldsList}
					sortByLabels={authorSortByLabels}
					appearance="library"
				/>

				<ListingFiltersSheet
					title="Author filters"
					description="Narrow the list by nationality, gender, photo, size, readers, reviews and rating."
					activeFilterCount={countAuthorSheetFilters(params)}
					onClear={() => clearAuthorSheetFilters(setParams)}
					appearance="library"
				>
					<ListingAuthorCountryMultiSelect
						selectedAlpha2={params.countries ?? []}
						onSelectedAlpha2Change={(countries) => {
							void setParams({
								countries: countries.length > 0 ? countries : null,
							});
						}}
						facetInput={facetsInput}
					/>

					<ListingCheckboxList
						legend="Gender"
						options={AUTHOR_GENDER_FILTERS.map((key) => ({
							id: `author-gender-${key}`,
							label: authorGenderLabels[key],
							checked: params.genders?.includes(key) ?? false,
							onCheckedChange: (checked) => {
								void setParams({
									genders: toggled(params.genders, key, checked),
								});
							},
						}))}
					/>

					<ListingCheckboxList
						legend="Photo"
						options={[
							{
								id: "author-has-photo",
								label: "Has a photo",
								checked: params.hasPhoto === true,
								onCheckedChange: (checked) => {
									void setParams({ hasPhoto: checked ? true : null });
								},
							},
						]}
					/>

					<FieldSet className="gap-3">
						<FieldLegend>At least</FieldLegend>
						<FieldGroup className="grid grid-cols-2 gap-3">
							{MINIMUMS.map(({ key, id, label }) => (
								<Field key={key}>
									<Label htmlFor={id}>{label}</Label>
									<Input
										id={id}
										type="number"
										min={1}
										inputMode="numeric"
										placeholder="Any"
										value={params[key] ?? ""}
										onChange={(event) => {
											const parsed = Number.parseInt(event.target.value, 10);
											void setParams({
												[key]:
													Number.isNaN(parsed) || parsed < 1 ? null : parsed,
											});
										}}
									/>
								</Field>
							))}
						</FieldGroup>
					</FieldSet>

					<ListingIntegerRangeFields
						legend="Total pages"
						minId="author-min-pages"
						maxId="author-max-pages"
						min={params.minPages}
						max={params.maxPages}
						minLabel="Fewest"
						maxLabel="Most"
						onMinChange={(minPages) => {
							void setParams({ minPages });
						}}
						onMaxChange={(maxPages) => {
							void setParams({ maxPages });
						}}
					/>

					<FieldSet className="gap-3">
						<FieldLegend>Average rating</FieldLegend>
						<ListingOpenLibraryRatingSlider
							min={params.minRating}
							max={params.maxRating}
							onMinChange={(minRating) => {
								void setParams({ minRating });
							}}
							onMaxChange={(maxRating) => {
								void setParams({ maxRating });
							}}
						/>
					</FieldSet>

					{isAdmin ? (
						<ListingCheckboxList
							legend="Review status (admins)"
							options={AUTHOR_STATUS_FILTERS.map((key) => ({
								id: `author-status-${key}`,
								label: authorStatusLabels[key],
								checked: params.statuses?.includes(key) ?? false,
								onCheckedChange: (checked) => {
									void setParams({
										statuses: toggled(params.statuses, key, checked),
									});
								},
							}))}
						/>
					) : null}
				</ListingFiltersSheet>
			</div>
		</div>
	);
}
