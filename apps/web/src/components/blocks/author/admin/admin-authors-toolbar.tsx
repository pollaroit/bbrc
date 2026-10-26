"use client";

import { Field, FieldLabel } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { useQuery } from "@tanstack/react-query";
import { ListingCheckboxList } from "@/components/listing/listing-checkbox-list";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingRangeFields } from "@/components/listing/listing-range-fields";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import { OverviewFiltersPin } from "@/components/listing/overview-filters-pin";
import {
	adminAuthorEnrichmentLabels,
	adminAuthorEnrichmentStatuses,
	adminAuthorFieldLabels,
	adminAuthorGenderLabels,
	adminAuthorGenders,
	adminAuthorMissingFieldOptions,
	adminAuthorRangeByLabels,
	adminAuthorRangeByOptions,
	adminAuthorSortableFields,
	adminAuthorSortByLabels,
	adminAuthorSourceLabels,
	adminAuthorSources,
	adminAuthorStatuses,
	adminAuthorStatusLabels,
	clearedAdminAuthorFilters,
	countAdminAuthorFilters,
	useAdminAuthorsListingSearchParams,
} from "@/lib/listing/admin-authors-listing";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type Params = ReturnType<typeof useAdminAuthorsListingSearchParams>[0];
type SetParams = ReturnType<typeof useAdminAuthorsListingSearchParams>[1];

function parseOptionalInt(value: string): number | null {
	const trimmed = value.trim();
	if (trimmed === "") {
		return null;
	}
	const parsed = Number.parseInt(trimmed, 10);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/** Toggles one value of a multi-value filter, clearing the filter when nothing is left. */
function toggled<T extends string>(
	current: readonly T[] | null,
	value: T,
	checked: boolean,
): T[] | null {
	const next = checked
		? [...new Set([...(current ?? []), value])]
		: (current ?? []).filter((item) => item !== value);
	return next.length > 0 ? next : null;
}

const TRI_ANY = "any";

function TriStateField({
	label,
	value,
	yesLabel,
	noLabel,
	onChange,
}: {
	label: string;
	value: boolean | null;
	yesLabel: string;
	noLabel: string;
	onChange: (value: boolean | null) => void;
}) {
	const current = value === null ? TRI_ANY : value ? "yes" : "no";

	return (
		<Field>
			<FieldLabel>{label}</FieldLabel>
			<Select
				value={current}
				onValueChange={(next) =>
					onChange(next === "yes" ? true : next === "no" ? false : null)
				}
			>
				<SelectTrigger aria-label={label}>
					<SelectValue />
				</SelectTrigger>
				<SelectContent alignItemWithTrigger={false}>
					<SelectItem value={TRI_ANY}>Any</SelectItem>
					<SelectItem value="yes">{yesLabel}</SelectItem>
					<SelectItem value="no">{noLabel}</SelectItem>
				</SelectContent>
			</Select>
		</Field>
	);
}

function NumberField({
	label,
	value,
	onChange,
}: {
	label: string;
	value: number | null;
	onChange: (value: number | null) => void;
}) {
	return (
		<Field>
			<FieldLabel>{label}</FieldLabel>
			<Input
				type="number"
				min={0}
				placeholder="Any"
				value={value ?? ""}
				onChange={(event) => onChange(parseOptionalInt(event.target.value))}
			/>
		</Field>
	);
}

function NationalityList({
	params,
	setParams,
	resetPage,
}: {
	params: Params;
	setParams: SetParams;
	resetPage: { page?: 1 };
}) {
	const facets = useQuery(
		orpc.author.nationalityFacets.queryOptions({
			input: { includeEmpty: true },
		}),
	);
	const countries = facets.data?.countries ?? [];

	if (countries.length === 0) {
		return null;
	}

	return (
		<div className="max-h-64 overflow-y-auto">
			<ListingCheckboxList
				legend="Nationality"
				options={countries.map((country) => ({
					id: country.alpha2,
					label: `${country.name} (${country.authorCount})`,
					checked: params.nationalities?.includes(country.alpha2) ?? false,
					onCheckedChange: (checked) => {
						void setParams({
							nationalities: toggled(
								params.nationalities,
								country.alpha2,
								checked,
							),
							...resetPage,
						});
					},
				}))}
			/>
		</div>
	);
}

function AuthorFiltersSheet({
	params,
	setParams,
	resetPage,
}: {
	params: Params;
	setParams: SetParams;
	resetPage: { page?: 1 };
}) {
	return (
		<ListingFiltersSheet
			title="Author filters"
			description="Status, lookup, what is missing, nationality, counts and dates."
			activeFilterCount={countAdminAuthorFilters(params)}
			onClear={() => {
				void setParams({ ...clearedAdminAuthorFilters, ...resetPage });
			}}
		>
			<ListingCheckboxList
				legend="Status"
				options={adminAuthorStatuses.map((status) => ({
					id: status,
					label: adminAuthorStatusLabels[status],
					checked: params.statuses?.includes(status) ?? false,
					onCheckedChange: (checked) => {
						void setParams({
							statuses: toggled(params.statuses, status, checked),
							...resetPage,
						});
					},
				}))}
			/>
			<ListingCheckboxList
				legend="Lookup"
				options={adminAuthorEnrichmentStatuses.map((status) => ({
					id: status,
					label: adminAuthorEnrichmentLabels[status],
					checked: params.enrichmentStatuses?.includes(status) ?? false,
					onCheckedChange: (checked) => {
						void setParams({
							enrichmentStatuses: toggled(
								params.enrichmentStatuses,
								status,
								checked,
							),
							...resetPage,
						});
					},
				}))}
			/>
			<ListingCheckboxList
				legend="Missing"
				options={adminAuthorMissingFieldOptions.map((field) => ({
					id: field,
					label: adminAuthorFieldLabels[field],
					checked: params.missingFields?.includes(field) ?? false,
					onCheckedChange: (checked) => {
						void setParams({
							missingFields: toggled(params.missingFields, field, checked),
							...resetPage,
						});
					},
				}))}
			/>
			<ListingCheckboxList
				legend="Has a value from"
				options={adminAuthorSources.map((source) => ({
					id: source,
					label: adminAuthorSourceLabels[source],
					checked: params.sources?.includes(source) ?? false,
					onCheckedChange: (checked) => {
						void setParams({
							sources: toggled(params.sources, source, checked),
							...resetPage,
						});
					},
				}))}
			/>
			<ListingCheckboxList
				legend="Gender"
				options={adminAuthorGenders.map((gender) => ({
					id: gender,
					label: adminAuthorGenderLabels[gender],
					checked: params.genders?.includes(gender) ?? false,
					onCheckedChange: (checked) => {
						void setParams({
							genders: toggled(params.genders, gender, checked),
							...resetPage,
						});
					},
				}))}
			/>
			<NationalityList
				params={params}
				setParams={setParams}
				resetPage={resetPage}
			/>
			<div className="grid gap-3 sm:grid-cols-2">
				<TriStateField
					label="Photo"
					yesLabel="Has a photo"
					noLabel="No photo"
					value={params.hasPhoto}
					onChange={(hasPhoto) => void setParams({ hasPhoto, ...resetPage })}
				/>
				<TriStateField
					label="Bio"
					yesLabel="Has a bio"
					noLabel="No bio"
					value={params.hasBio}
					onChange={(hasBio) => void setParams({ hasBio, ...resetPage })}
				/>
				<TriStateField
					label="Locked fields"
					yesLabel="Has locked fields"
					noLabel="None locked"
					value={params.hasLocks}
					onChange={(hasLocks) => void setParams({ hasLocks, ...resetPage })}
				/>
				<TriStateField
					label="Books"
					yesLabel="Without books"
					noLabel="With books"
					value={params.withoutBooks}
					onChange={(withoutBooks) =>
						void setParams({ withoutBooks, ...resetPage })
					}
				/>
			</div>
			<div className="grid gap-3 sm:grid-cols-2">
				<NumberField
					label="Min books"
					value={params.minBooks}
					onChange={(minBooks) => void setParams({ minBooks, ...resetPage })}
				/>
				<NumberField
					label="Max books"
					value={params.maxBooks}
					onChange={(maxBooks) => void setParams({ maxBooks, ...resetPage })}
				/>
				<NumberField
					label="Min readers"
					value={params.minReaders}
					onChange={(minReaders) =>
						void setParams({ minReaders, ...resetPage })
					}
				/>
				<NumberField
					label="Min followers"
					value={params.minFollowers}
					onChange={(minFollowers) =>
						void setParams({ minFollowers, ...resetPage })
					}
				/>
			</div>
			<ListingRangeFields
				rangeBy={params.rangeBy}
				rangeMin={params.rangeMin}
				rangeMax={params.rangeMax}
				rangeByOptions={adminAuthorRangeByOptions}
				rangeByLabels={adminAuthorRangeByLabels}
				onRangeByChange={(rangeBy) => void setParams({ rangeBy, ...resetPage })}
				onRangeMinChange={(rangeMin) =>
					void setParams({ rangeMin, ...resetPage })
				}
				onRangeMaxChange={(rangeMax) =>
					void setParams({ rangeMax, ...resetPage })
				}
			/>
		</ListingFiltersSheet>
	);
}

type AdminAuthorsToolbarProps = {
	/** `list` adds sorting and resets the page on every change; `overview` pins the filters on scroll. */
	variant?: "list" | "overview" | "stats";
};

export function AdminAuthorsToolbar({
	variant = "list",
}: AdminAuthorsToolbarProps) {
	const [params, setParams] = useAdminAuthorsListingSearchParams();
	const resetPage = variant === "list" ? { page: 1 as const } : {};

	const sheet = (
		<AuthorFiltersSheet
			params={params}
			setParams={setParams}
			resetPage={resetPage}
		/>
	);

	return (
		<div className="flex w-full flex-col gap-3">
			<div
				className={cn(
					"flex w-full flex-col gap-3",
					variant === "list" && "lg:flex-row lg:items-end lg:justify-between",
				)}
			>
				<ListingSearch
					value={params.search ?? ""}
					onChange={(search) => {
						void setParams({ search: search || null, ...resetPage });
					}}
					placeholder="Search name, address or other spelling…"
					className={variant === "list" ? "max-w-md" : "w-full max-w-2xl"}
				/>
				<div
					className={cn(
						"flex flex-wrap items-center gap-2",
						variant !== "list" && "w-full",
					)}
				>
					{variant === "list" ? (
						<ListingSort
							sortBy={params.sortBy}
							sortDirection={params.sortDirection}
							sortByOptions={adminAuthorSortableFields}
							sortByLabels={adminAuthorSortByLabels}
							onSortByChange={(sortBy) => {
								void setParams({ sortBy, page: 1 });
							}}
							onSortDirectionChange={(sortDirection) => {
								void setParams({ sortDirection, page: 1 });
							}}
						/>
					) : null}
					{variant === "list" ? (
						sheet
					) : (
						<OverviewFiltersPin>{sheet}</OverviewFiltersPin>
					)}
				</div>
			</div>
		</div>
	);
}
