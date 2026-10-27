"use client";

import {
	Field,
	FieldGroup,
	FieldLegend,
	FieldSet,
} from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { Label } from "@bbrc/ui/components/label";
import { useTranslations } from "next-intl";
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
	type AuthorSortField,
	authorDirectorySortFieldsList,
	authorStatusLabels,
	clearAuthorSheetFilters,
	countAuthorSheetFilters,
	toAuthorNationalityFacetsInput,
	useAuthorsListingSearchParams,
} from "@/lib/listing/authors-listing";

const MINIMUMS = [
	{ key: "minBooks", id: "author-min-books" },
	{ key: "minReaders", id: "author-min-readers" },
	{ key: "minReads", id: "author-min-reads" },
	{ key: "minReviews", id: "author-min-reviews" },
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
	const t = useTranslations("authors");
	const sortByLabels = Object.fromEntries(
		authorDirectorySortFieldsList.map((field) => [field, t(`sort.${field}`)]),
	) as Record<AuthorSortField, string>;
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
				placeholder={t("toolbar.search")}
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
					sortByLabels={sortByLabels}
					appearance="library"
				/>

				<ListingFiltersSheet
					title={t("toolbar.filtersTitle")}
					description={t("toolbar.filtersDescription")}
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
						legend={t("toolbar.gender")}
						options={AUTHOR_GENDER_FILTERS.map((key) => ({
							id: `author-gender-${key}`,
							label: t(`toolbar.genderOption.${key}`),
							checked: params.genders?.includes(key) ?? false,
							onCheckedChange: (checked) => {
								void setParams({
									genders: toggled(params.genders, key, checked),
								});
							},
						}))}
					/>

					<ListingCheckboxList
						legend={t("toolbar.photo")}
						options={[
							{
								id: "author-has-photo",
								label: t("toolbar.hasPhoto"),
								checked: params.hasPhoto === true,
								onCheckedChange: (checked) => {
									void setParams({ hasPhoto: checked ? true : null });
								},
							},
						]}
					/>

					<FieldSet className="gap-3">
						<FieldLegend>{t("toolbar.atLeast")}</FieldLegend>
						<FieldGroup className="grid grid-cols-2 gap-3">
							{MINIMUMS.map(({ key, id }) => (
								<Field key={key}>
									<Label htmlFor={id}>{t(`toolbar.${key}`)}</Label>
									<Input
										id={id}
										type="number"
										min={1}
										inputMode="numeric"
										placeholder={t("toolbar.any")}
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
						legend={t("toolbar.totalPages")}
						minId="author-min-pages"
						maxId="author-max-pages"
						min={params.minPages}
						max={params.maxPages}
						minLabel={t("toolbar.fewest")}
						maxLabel={t("toolbar.most")}
						onMinChange={(minPages) => {
							void setParams({ minPages });
						}}
						onMaxChange={(maxPages) => {
							void setParams({ maxPages });
						}}
					/>

					<FieldSet className="gap-3">
						<FieldLegend>{t("toolbar.averageRating")}</FieldLegend>
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
							legend={t("toolbar.statusAdmins")}
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
