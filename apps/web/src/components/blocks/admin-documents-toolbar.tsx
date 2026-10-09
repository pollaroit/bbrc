"use client";

import {
	adminDocumentRangeableFields,
	adminDocumentSortableFields,
} from "@bbrc/api/modules/admin/admin-document.listing";
import { ListingBookMultiSelect } from "@/components/listing/listing-book-multi-select";
import { ListingCheckboxList } from "@/components/listing/listing-checkbox-list";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingMemberMultiSelect } from "@/components/listing/listing-member-multi-select";
import { ListingRangeFields } from "@/components/listing/listing-range-fields";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import { OverviewFiltersPin } from "@/components/listing/overview-filters-pin";
import {
	adminDocumentRangeByLabels,
	adminDocumentSortByLabels,
	adminDocumentStatuses,
	adminDocumentStatusLabels,
	DOCUMENT_LANGUAGE_CODES,
	DOCUMENT_LANGUAGE_LABELS,
	useAdminDocumentsListingSearchParams,
} from "@/lib/listing/admin-documents-listing";
import { cn } from "@/lib/utils";

function countAdminDocumentSheetFilters(
	params: ReturnType<typeof useAdminDocumentsListingSearchParams>[0],
) {
	let count = 0;
	if (params.statuses?.length) count += 1;
	if (params.languages?.length) count += 1;
	if (params.bookSlugs?.length) count += 1;
	if (params.submitterUsernames?.length) count += 1;
	if (params.rangeMin != null || params.rangeMax != null) count += 1;
	if (params.hasAcceptanceNotes != null || params.hasRejectionReason != null) {
		count += 1;
	}
	return count;
}

type AdminDocumentsToolbarProps = {
	variant?: "list" | "overview";
};

export function AdminDocumentsToolbar({
	variant = "list",
}: AdminDocumentsToolbarProps) {
	const [params, setParams] = useAdminDocumentsListingSearchParams();
	const sheetFilterCount = countAdminDocumentSheetFilters(params);
	const resetPage = variant === "list" ? { page: 1 as const } : {};

	const filtersSheet = (
		<DocumentFiltersSheet
			params={params}
			setParams={setParams}
			resetPage={resetPage}
			sheetFilterCount={sheetFilterCount}
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
					placeholder="Search name, slug, book, submitter…"
					className={variant === "overview" ? "w-full max-w-2xl" : "max-w-md"}
				/>
				<div
					className={cn(
						"flex flex-wrap items-center gap-2",
						variant === "overview" && "w-full",
					)}
				>
					{variant === "list" ? (
						<ListingSort
							sortBy={params.sortBy}
							sortDirection={params.sortDirection}
							sortByOptions={adminDocumentSortableFields}
							sortByLabels={adminDocumentSortByLabels}
							onSortByChange={(sortBy) => {
								void setParams({ sortBy, page: 1 });
							}}
							onSortDirectionChange={(sortDirection) => {
								void setParams({ sortDirection, page: 1 });
							}}
						/>
					) : null}
					{variant === "overview" ? (
						<OverviewFiltersPin>{filtersSheet}</OverviewFiltersPin>
					) : (
						filtersSheet
					)}
				</div>
			</div>
		</div>
	);
}

function DocumentFiltersSheet({
	params,
	setParams,
	resetPage,
	sheetFilterCount,
}: {
	params: ReturnType<typeof useAdminDocumentsListingSearchParams>[0];
	setParams: ReturnType<typeof useAdminDocumentsListingSearchParams>[1];
	resetPage: { page?: 1 };
	sheetFilterCount: number;
}) {
	const toggleStatus = (
		status: (typeof adminDocumentStatuses)[number],
		checked: boolean,
	) => {
		const current = params.statuses ?? [];
		const next = checked
			? [...new Set([...current, status])]
			: current.filter((value) => value !== status);

		void setParams({
			statuses: next.length > 0 ? next : null,
			...resetPage,
		});
	};

	const toggleLanguage = (
		language: (typeof DOCUMENT_LANGUAGE_CODES)[number],
		checked: boolean,
	) => {
		const current = params.languages ?? [];
		const next = checked
			? [...new Set([...current, language])]
			: current.filter((value) => value !== language);

		void setParams({
			languages: next.length > 0 ? next : null,
			...resetPage,
		});
	};

	return (
		<ListingFiltersSheet
			title="Document filters"
			description="Review status, language, books, submitters, and dates."
			activeFilterCount={sheetFilterCount}
			onClear={() => {
				void setParams({
					statuses: null,
					languages: null,
					bookSlugs: null,
					submitterUsernames: null,
					rangeBy: null,
					rangeMin: null,
					rangeMax: null,
					hasAcceptanceNotes: null,
					hasRejectionReason: null,
					...resetPage,
				});
			}}
		>
			<ListingCheckboxList
				legend="Status"
				options={adminDocumentStatuses.map((status) => ({
					id: status,
					label: adminDocumentStatusLabels[status],
					checked: params.statuses?.includes(status) ?? false,
					onCheckedChange: (checked) => {
						toggleStatus(status, checked);
					},
				}))}
			/>
			<ListingCheckboxList
				legend="Language"
				options={DOCUMENT_LANGUAGE_CODES.map((language) => ({
					id: language,
					label: DOCUMENT_LANGUAGE_LABELS[language],
					checked: params.languages?.includes(language) ?? false,
					onCheckedChange: (checked) => {
						toggleLanguage(language, checked);
					},
				}))}
			/>
			<ListingBookMultiSelect
				legend="Books"
				selectedSlugs={params.bookSlugs ?? []}
				onSelectedSlugsChange={(bookSlugs) => {
					void setParams({
						bookSlugs: bookSlugs.length > 0 ? bookSlugs : null,
						...resetPage,
					});
				}}
			/>
			<ListingMemberMultiSelect
				legend="Submitters"
				selectedUsernames={params.submitterUsernames ?? []}
				onSelectedUsernamesChange={(submitterUsernames) => {
					void setParams({
						submitterUsernames:
							submitterUsernames.length > 0 ? submitterUsernames : null,
						...resetPage,
					});
				}}
			/>
			<ListingCheckboxList
				legend="Review notes"
				options={[
					{
						id: "hasAcceptanceNotes",
						label: "Has acceptance notes",
						checked: params.hasAcceptanceNotes === true,
						onCheckedChange: (checked) => {
							void setParams({
								hasAcceptanceNotes: checked ? true : null,
								...resetPage,
							});
						},
					},
					{
						id: "hasRejectionReason",
						label: "Has rejection reason",
						checked: params.hasRejectionReason === true,
						onCheckedChange: (checked) => {
							void setParams({
								hasRejectionReason: checked ? true : null,
								...resetPage,
							});
						},
					},
				]}
			/>
			<ListingRangeFields
				rangeBy={params.rangeBy}
				rangeMin={params.rangeMin}
				rangeMax={params.rangeMax}
				rangeByOptions={adminDocumentRangeableFields}
				rangeByLabels={adminDocumentRangeByLabels}
				onRangeByChange={(rangeBy) => {
					void setParams({ rangeBy, ...resetPage });
				}}
				onRangeMinChange={(rangeMin) => {
					void setParams({ rangeMin, ...resetPage });
				}}
				onRangeMaxChange={(rangeMax) => {
					void setParams({ rangeMax, ...resetPage });
				}}
			/>
		</ListingFiltersSheet>
	);
}
