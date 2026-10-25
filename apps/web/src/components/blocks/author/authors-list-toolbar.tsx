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
					description="Narrow the list by nationality, gender, photo and how many books they have here."
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
							<Field>
								<Label htmlFor="author-min-books">Books in the library</Label>
								<Input
									id="author-min-books"
									type="number"
									min={1}
									inputMode="numeric"
									placeholder="Any"
									value={params.minBooks ?? ""}
									onChange={(event) => {
										const parsed = Number.parseInt(event.target.value, 10);
										void setParams({
											minBooks:
												Number.isNaN(parsed) || parsed < 1 ? null : parsed,
										});
									}}
								/>
							</Field>
						</FieldGroup>
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
