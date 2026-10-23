"use client";

import {
	PEOPLE_ACTIVITY_FILTERS,
	PEOPLE_SORT_FIELDS,
	PEOPLE_STATUSES,
} from "@bbrc/api/modules/people/people.schema";
import { genres, RP_LEVEL_TIERS, XP_LEVEL_TIERS } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Field,
	FieldGroup,
	FieldLegend,
	FieldSet,
} from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { Label } from "@bbrc/ui/components/label";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";
import { ListingCheckboxList } from "@/components/listing/listing-checkbox-list";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingRangeFields } from "@/components/listing/listing-range-fields";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { authClient } from "@/lib/auth-client";
import {
	clearPeopleSheetFilters,
	countPeopleSheetFilters,
	type PeopleActivityFilter,
	peopleActivityLabels,
	peopleSortLabels,
	peopleStatusLabels,
	usePeopleListingSearchParams,
} from "@/lib/listing/people-listing";
import { orpc } from "@/utils/orpc";

const DAY_MS = 24 * 60 * 60 * 1000;

function toggle<T extends string>(
	current: readonly T[] | null,
	value: T,
	checked: boolean,
): T[] | null {
	const next = checked
		? [...new Set([...(current ?? []), value])]
		: (current ?? []).filter((item) => item !== value);
	return next.length > 0 ? next : null;
}

function MinimumField({
	id,
	label,
	value,
	onChange,
}: {
	id: string;
	label: string;
	value: number | null;
	onChange: (value: number | null) => void;
}) {
	return (
		<Field>
			<Label htmlFor={id}>{label}</Label>
			<Input
				id={id}
				type="number"
				min={1}
				inputMode="numeric"
				placeholder="Any"
				value={value ?? ""}
				onChange={(event) => {
					const parsed = Number.parseInt(event.target.value, 10);
					onChange(Number.isNaN(parsed) || parsed < 1 ? null : parsed);
				}}
			/>
		</Field>
	);
}

/** Lets people find who has read specific books; the selected books must all be read. */
function ReadBooksFilter({
	selected,
	onChange,
}: {
	selected: string[];
	onChange: (slugs: string[] | null) => void;
}) {
	const [search, setSearch] = useState("");
	const debounced = useDebouncedValue(search, 300).trim();
	const results = useQuery({
		...orpc.book.getBookList.queryOptions({
			input: {
				limit: 6,
				sortBy: "title",
				sortDirection: "asc",
				search: debounced,
			},
		}),
		enabled: debounced.length >= 2,
	});

	return (
		<FieldSet className="gap-3">
			<FieldLegend>Has read these books</FieldLegend>
			{selected.length > 0 ? (
				<ul className="flex flex-wrap gap-2">
					{selected.map((slug) => (
						<li key={slug}>
							<Button
								type="button"
								size="sm"
								variant="outline"
								className="gap-1.5"
								onClick={() => {
									const next = selected.filter((item) => item !== slug);
									onChange(next.length > 0 ? next : null);
								}}
							>
								{slug.replaceAll("_", " ")}
								<X className="size-3.5" aria-hidden />
								<span className="sr-only">Remove</span>
							</Button>
						</li>
					))}
				</ul>
			) : null}
			<Input
				value={search}
				onChange={(event) => setSearch(event.target.value)}
				placeholder="Search the library…"
				autoComplete="off"
				disabled={selected.length >= 6}
			/>
			{debounced.length >= 2 ? (
				<ul className="max-h-48 overflow-y-auto border border-border">
					{(results.data?.items ?? [])
						.filter((book) => !selected.includes(book.slug))
						.map((book) => (
							<li
								key={book.slug}
								className="border-border border-b last:border-b-0"
							>
								<button
									type="button"
									className="w-full p-2 text-left text-sm hover:bg-muted/50"
									onClick={() => {
										onChange([...selected, book.slug]);
										setSearch("");
									}}
								>
									{book.title}
								</button>
							</li>
						))}
					{results.isPending ? (
						<li className="p-2 text-muted-foreground text-sm">Searching…</li>
					) : null}
				</ul>
			) : null}
		</FieldSet>
	);
}

export function PeopleListingToolbar() {
	const [params, setParams] = usePeopleListingSearchParams();
	const { data: session } = authClient.useSession();
	const isAdmin = session?.user.isAdmin === true;
	const sheetFilterCount = countPeopleSheetFilters(params);

	const setJoinedWithin = (days: number | "year") => {
		const now = new Date();
		const min =
			days === "year"
				? new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
				: new Date(now.getTime() - days * DAY_MS);
		void setParams({ rangeMin: min, rangeMax: null });
	};

	return (
		<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
			<ListingSearch
				value={params.search ?? ""}
				onChange={(search) => {
					void setParams({ search });
				}}
				placeholder="Search people by name or username…"
			/>

			<div className="flex flex-wrap items-center gap-2 lg:shrink-0">
				<ListingSort
					sortBy={params.sortBy}
					sortDirection={params.sortDirection}
					onSortByChange={(sortBy) => {
						void setParams({ sortBy: sortBy ?? "xp" });
					}}
					onSortDirectionChange={(sortDirection) => {
						void setParams({ sortDirection: sortDirection ?? "desc" });
					}}
					sortByOptions={PEOPLE_SORT_FIELDS}
					sortByLabels={peopleSortLabels}
					appearance="library"
				/>

				<ListingFiltersSheet
					title="People filters"
					description="Narrow the grid by level, activity, reading habits and more."
					activeFilterCount={sheetFilterCount}
					onClear={() => clearPeopleSheetFilters(setParams)}
					appearance="library"
				>
					<ListingCheckboxList
						legend="Activity"
						options={PEOPLE_ACTIVITY_FILTERS.map((key) => ({
							id: `people-activity-${key}`,
							label: peopleActivityLabels[key],
							checked: params.activity?.includes(key) ?? false,
							onCheckedChange: (checked) => {
								void setParams({
									activity: toggle<PeopleActivityFilter>(
										params.activity,
										key,
										checked,
									),
								});
							},
						}))}
					/>

					<FieldSet className="gap-3">
						<FieldLegend>At least</FieldLegend>
						<FieldGroup className="grid grid-cols-2 gap-3">
							<MinimumField
								id="people-min-reads"
								label="Books read"
								value={params.minReads}
								onChange={(minReads) => void setParams({ minReads })}
							/>
							<MinimumField
								id="people-min-reviews"
								label="Reviews"
								value={params.minReviews}
								onChange={(minReviews) => void setParams({ minReviews })}
							/>
							<MinimumField
								id="people-min-joined"
								label="Sittings joined"
								value={params.minJoined}
								onChange={(minJoined) => void setParams({ minJoined })}
							/>
							<MinimumField
								id="people-min-sittings"
								label="Sittings finished"
								value={params.minSittings}
								onChange={(minSittings) => void setParams({ minSittings })}
							/>
						</FieldGroup>
					</FieldSet>

					<ReadBooksFilter
						selected={params.readBooks ?? []}
						onChange={(readBooks) => void setParams({ readBooks })}
					/>

					<ListingCheckboxList
						legend="Experience level"
						options={XP_LEVEL_TIERS.map((tier) => ({
							id: `people-xp-${tier.label}`,
							label: `${tier.label} (${tier.rangeLabel} XP)`,
							checked: params.xpLevels?.includes(tier.label) ?? false,
							onCheckedChange: (checked) => {
								void setParams({
									xpLevels: toggle(params.xpLevels, tier.label, checked),
								});
							},
						}))}
					/>

					<ListingCheckboxList
						legend="Reading level"
						options={RP_LEVEL_TIERS.map((tier) => ({
							id: `people-rp-${tier.label}`,
							label: `${tier.label} (${tier.rangeLabel} RP)`,
							checked: params.rpLevels?.includes(tier.label) ?? false,
							onCheckedChange: (checked) => {
								void setParams({
									rpLevels: toggle(params.rpLevels, tier.label, checked),
								});
							},
						}))}
					/>

					<div className="flex flex-col gap-3">
						<ListingRangeFields
							legend="Joined"
							rangeBy="createdAt"
							rangeMin={params.rangeMin}
							rangeMax={params.rangeMax}
							onRangeByChange={() => {}}
							onRangeMinChange={(rangeMin) => void setParams({ rangeMin })}
							onRangeMaxChange={(rangeMax) => void setParams({ rangeMax })}
							rangeByOptions={["createdAt"] as const}
							rangeByLabels={{ createdAt: "Join date" }}
						/>
						<div className="flex flex-wrap gap-2">
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => setJoinedWithin(30)}
							>
								Last 30 days
							</Button>
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => setJoinedWithin("year")}
							>
								This year
							</Button>
						</div>
					</div>

					<Field>
						<Label htmlFor="people-location">Location</Label>
						<Input
							id="people-location"
							placeholder="City or country"
							value={params.location ?? ""}
							onChange={(event) =>
								void setParams({ location: event.target.value || null })
							}
						/>
					</Field>

					<ListingCheckboxList
						legend="Favorite genres"
						options={genres.map((genre) => ({
							id: `people-genre-${genre.slug}`,
							label: genre.name,
							checked: params.genres?.includes(genre.slug) ?? false,
							onCheckedChange: (checked) => {
								void setParams({
									genres: toggle(params.genres, genre.slug, checked),
								});
							},
						}))}
					/>

					<ListingCheckboxList
						legend="Role"
						options={[
							{
								id: "people-admins",
								label: "Administrators only",
								checked: params.isAdmin === true,
								onCheckedChange: (checked) => {
									void setParams({ isAdmin: checked ? true : null });
								},
							},
						]}
					/>

					{isAdmin ? (
						<ListingCheckboxList
							legend="Status"
							options={PEOPLE_STATUSES.map((status) => ({
								id: `people-status-${status}`,
								label: peopleStatusLabels[status],
								checked: params.statuses?.includes(status) ?? false,
								onCheckedChange: (checked) => {
									void setParams({
										statuses: toggle(params.statuses, status, checked),
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
