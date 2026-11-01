"use client";

import {
	AUDIT_SORT_FIELDS,
	AUDIT_TARGET_TYPES,
	type AuditActionKey,
	groupedAuditActions,
} from "@bbrc/shared";
import { ListingCheckboxList } from "@/components/listing/listing-checkbox-list";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingMemberMultiSelect } from "@/components/listing/listing-member-multi-select";
import { ListingRangeFields } from "@/components/listing/listing-range-fields";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import {
	auditSortByLabels,
	auditTargetTypeLabels,
	useAuditListingSearchParams,
} from "@/lib/listing/audit-listing";

type Params = ReturnType<typeof useAuditListingSearchParams>[0];

function countSheetFilters(params: Params) {
	let count = 0;
	if (params.actions?.length) count += 1;
	if (params.actors?.length) count += 1;
	if (params.targetType) count += 1;
	if (params.rangeMin != null || params.rangeMax != null) count += 1;
	return count;
}

const rangeByLabels = { createdAt: "When" } as const;

export function AuditToolbar() {
	const [params, setParams] = useAuditListingSearchParams();
	const groups = groupedAuditActions();

	return (
		<div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center">
			<ListingSearch
				value={params.search ?? ""}
				onChange={(search) => {
					void setParams({ search, page: 1 });
				}}
				placeholder="Search by who did it or what it was done to…"
			/>
			<div className="flex flex-wrap items-center gap-2 lg:shrink-0">
				<ListingSort
					sortBy={params.sortBy}
					sortDirection={params.sortDirection}
					onSortByChange={(sortBy) => {
						void setParams({ sortBy, page: 1 });
					}}
					onSortDirectionChange={(sortDirection) => {
						void setParams({ sortDirection, page: 1 });
					}}
					sortByOptions={AUDIT_SORT_FIELDS}
					sortByLabels={auditSortByLabels}
				/>
				<ListingFiltersSheet
					title="Audit filters"
					description="Narrow the log by who acted, what they did, what it touched, and when."
					activeFilterCount={countSheetFilters(params)}
					onClear={() => {
						void setParams({
							actions: null,
							actors: null,
							targetType: null,
							rangeBy: null,
							rangeMin: null,
							rangeMax: null,
							page: 1,
						});
					}}
				>
					<ListingMemberMultiSelect
						legend="Done by"
						selectedUsernames={params.actors ?? []}
						onSelectedUsernamesChange={(usernames) => {
							void setParams({
								actors: usernames.length > 0 ? usernames : null,
								page: 1,
							});
						}}
					/>

					{groups.map((group) => (
						<ListingCheckboxList
							key={group.domain}
							legend={group.label}
							options={group.actions.map((action) => ({
								id: `audit-action-${action.key}`,
								label: action.label,
								checked: params.actions?.includes(action.key) ?? false,
								onCheckedChange: (checked) => {
									const current = params.actions ?? [];
									const next: AuditActionKey[] = checked
										? [...new Set([...current, action.key])]
										: current.filter((key) => key !== action.key);
									void setParams({
										actions: next.length > 0 ? next : null,
										page: 1,
									});
								},
							}))}
						/>
					))}

					<ListingCheckboxList
						legend="Done to"
						options={AUDIT_TARGET_TYPES.map((type) => ({
							id: `audit-target-${type}`,
							label: auditTargetTypeLabels[type],
							checked: params.targetType === type,
							onCheckedChange: (checked) => {
								void setParams({
									targetType: checked ? type : null,
									page: 1,
								});
							},
						}))}
					/>

					<ListingRangeFields
						legend="When"
						rangeBy={params.rangeBy}
						rangeMin={params.rangeMin}
						rangeMax={params.rangeMax}
						onRangeByChange={(rangeBy) => {
							void setParams({ rangeBy, page: 1 });
						}}
						onRangeMinChange={(rangeMin) => {
							void setParams({ rangeMin, page: 1 });
						}}
						onRangeMaxChange={(rangeMax) => {
							void setParams({ rangeMax, page: 1 });
						}}
						rangeByOptions={["createdAt"] as const}
						rangeByLabels={rangeByLabels}
					/>
				</ListingFiltersSheet>
			</div>
		</div>
	);
}
