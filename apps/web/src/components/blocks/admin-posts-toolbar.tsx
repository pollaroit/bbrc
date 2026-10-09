"use client";

import { adminPostSortableFields } from "@bbrc/api/modules/admin/admin-post.listing";
import { postRangeableFields } from "@bbrc/api/modules/post/post.listing";
import { Field, FieldLabel } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { ListingCheckboxList } from "@/components/listing/listing-checkbox-list";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingMemberMultiSelect } from "@/components/listing/listing-member-multi-select";
import { ListingRangeFields } from "@/components/listing/listing-range-fields";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import { OverviewFiltersPin } from "@/components/listing/overview-filters-pin";
import {
	adminPostAttachmentKindLabels,
	adminPostRangeByLabels,
	adminPostSortByLabels,
	postAttachmentKindValues,
	useAdminPostsListingSearchParams,
} from "@/lib/listing/admin-posts-listing";
import { cn } from "@/lib/utils";

function parseOptionalInt(value: string): number | null {
	const trimmed = value.trim();
	if (trimmed === "") {
		return null;
	}
	const parsed = Number.parseInt(trimmed, 10);
	return Number.isFinite(parsed) ? parsed : null;
}

function countAdminPostSheetFilters(
	params: ReturnType<typeof useAdminPostsListingSearchParams>[0],
) {
	let count = 0;
	if (params.authorUsernames?.length) count += 1;
	if (params.rangeMin != null || params.rangeMax != null) count += 1;
	if (
		params.hasAttachedBook != null ||
		params.hasImage != null ||
		params.hasAttachment != null ||
		params.wasEdited != null
	) {
		count += 1;
	}
	if (params.attachmentKinds?.length) count += 1;
	if (
		params.minLikes != null ||
		params.minComments != null ||
		params.minContentLength != null
	) {
		count += 1;
	}
	return count;
}

type AdminPostsToolbarProps = {
	variant?: "list" | "overview";
};

export function AdminPostsToolbar({
	variant = "list",
}: AdminPostsToolbarProps) {
	const [params, setParams] = useAdminPostsListingSearchParams();
	const sheetFilterCount = countAdminPostSheetFilters(params);
	const resetPage = variant === "list" ? { page: 1 as const } : {};

	const toggleAttachmentKind = (
		kind: (typeof postAttachmentKindValues)[number],
		checked: boolean,
	) => {
		const current = params.attachmentKinds ?? [];
		const next = checked
			? [...new Set([...current, kind])]
			: current.filter((value) => value !== kind);

		void setParams({
			attachmentKinds: next.length > 0 ? next : null,
			...resetPage,
		});
	};

	const filtersSheet = (
		<PostFiltersSheet
			params={params}
			setParams={setParams}
			resetPage={resetPage}
			sheetFilterCount={sheetFilterCount}
			toggleAttachmentKind={toggleAttachmentKind}
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
					placeholder="Search content, slug, author…"
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
							sortByOptions={adminPostSortableFields}
							sortByLabels={adminPostSortByLabels}
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

function PostFiltersSheet({
	params,
	setParams,
	resetPage,
	sheetFilterCount,
	toggleAttachmentKind,
}: {
	params: ReturnType<typeof useAdminPostsListingSearchParams>[0];
	setParams: ReturnType<typeof useAdminPostsListingSearchParams>[1];
	resetPage: { page?: 1 };
	sheetFilterCount: number;
	toggleAttachmentKind: (
		kind: (typeof postAttachmentKindValues)[number],
		checked: boolean,
	) => void;
}) {
	return (
		<ListingFiltersSheet
			title="Post filters"
			description="Authors, media, attachments, engagement, and dates."
			activeFilterCount={sheetFilterCount}
			onClear={() => {
				void setParams({
					authorUsernames: null,
					rangeBy: null,
					rangeMin: null,
					rangeMax: null,
					hasAttachedBook: null,
					hasImage: null,
					hasAttachment: null,
					attachmentKinds: null,
					minLikes: null,
					minComments: null,
					wasEdited: null,
					minContentLength: null,
					...resetPage,
				});
			}}
		>
			<ListingMemberMultiSelect
				legend="Authors"
				selectedUsernames={params.authorUsernames ?? []}
				onSelectedUsernamesChange={(authorUsernames) => {
					void setParams({
						authorUsernames:
							authorUsernames.length > 0 ? authorUsernames : null,
						...resetPage,
					});
				}}
			/>
			<ListingCheckboxList
				legend="Content flags"
				options={[
					{
						id: "hasAttachedBook",
						label: "Has attached book",
						checked: params.hasAttachedBook === true,
						onCheckedChange: (checked) => {
							void setParams({
								hasAttachedBook: checked ? true : null,
								...resetPage,
							});
						},
					},
					{
						id: "hasImage",
						label: "Has image",
						checked: params.hasImage === true,
						onCheckedChange: (checked) => {
							void setParams({
								hasImage: checked ? true : null,
								...resetPage,
							});
						},
					},
					{
						id: "hasAttachment",
						label: "Has club attachment",
						checked: params.hasAttachment === true,
						onCheckedChange: (checked) => {
							void setParams({
								hasAttachment: checked ? true : null,
								...resetPage,
							});
						},
					},
					{
						id: "wasEdited",
						label: "Was edited",
						checked: params.wasEdited === true,
						onCheckedChange: (checked) => {
							void setParams({
								wasEdited: checked ? true : null,
								...resetPage,
							});
						},
					},
				]}
			/>
			<ListingCheckboxList
				legend="Attachment kinds"
				options={postAttachmentKindValues.map((kind) => ({
					id: kind,
					label: adminPostAttachmentKindLabels[kind],
					checked: params.attachmentKinds?.includes(kind) ?? false,
					onCheckedChange: (checked) => {
						toggleAttachmentKind(kind, checked);
					},
				}))}
			/>
			<ListingRangeFields
				rangeBy={params.rangeBy}
				rangeMin={params.rangeMin}
				rangeMax={params.rangeMax}
				rangeByOptions={postRangeableFields}
				rangeByLabels={adminPostRangeByLabels}
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
			<div className="grid gap-3 sm:grid-cols-2">
				<Field>
					<FieldLabel>Min likes</FieldLabel>
					<Input
						type="number"
						min={0}
						placeholder="Any"
						value={params.minLikes ?? ""}
						onChange={(e) => {
							void setParams({
								minLikes: parseOptionalInt(e.target.value),
								...resetPage,
							});
						}}
					/>
				</Field>
				<Field>
					<FieldLabel>Min comments</FieldLabel>
					<Input
						type="number"
						min={0}
						placeholder="Any"
						value={params.minComments ?? ""}
						onChange={(e) => {
							void setParams({
								minComments: parseOptionalInt(e.target.value),
								...resetPage,
							});
						}}
					/>
				</Field>
				<Field className="sm:col-span-2">
					<FieldLabel>Min content length (characters)</FieldLabel>
					<Input
						type="number"
						min={1}
						placeholder="Any"
						value={params.minContentLength ?? ""}
						onChange={(e) => {
							void setParams({
								minContentLength: parseOptionalInt(e.target.value),
								...resetPage,
							});
						}}
					/>
				</Field>
			</div>
		</ListingFiltersSheet>
	);
}
