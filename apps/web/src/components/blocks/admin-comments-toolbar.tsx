"use client";

import { adminCommentSortableFields } from "@bbrc/api/modules/admin/admin-comment.listing";
import { commentRangeableFields } from "@bbrc/api/modules/comment/comment.listing";
import { Field, FieldLabel } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { ListingCheckboxList } from "@/components/listing/listing-checkbox-list";
import { ListingFeedbackMultiSelect } from "@/components/listing/listing-feedback-multi-select";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingMemberMultiSelect } from "@/components/listing/listing-member-multi-select";
import { ListingPostMultiSelect } from "@/components/listing/listing-post-multi-select";
import { ListingRangeFields } from "@/components/listing/listing-range-fields";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import { OverviewFiltersPin } from "@/components/listing/overview-filters-pin";
import {
	adminCommentContextLabels,
	adminCommentContextValues,
	adminCommentDepthOptions,
	adminCommentRangeByLabels,
	adminCommentSortByLabels,
	useAdminCommentsListingSearchParams,
} from "@/lib/listing/admin-comments-listing";
import { cn } from "@/lib/utils";

function parseOptionalInt(value: string): number | null {
	const trimmed = value.trim();
	if (trimmed === "") {
		return null;
	}
	const parsed = Number.parseInt(trimmed, 10);
	return Number.isFinite(parsed) ? parsed : null;
}

function countAdminCommentSheetFilters(
	params: ReturnType<typeof useAdminCommentsListingSearchParams>[0],
) {
	let count = 0;
	if (params.authorUsernames?.length) count += 1;
	if (params.contexts?.length) count += 1;
	if (params.postSlugs?.length || params.feedbackSlugs?.length) count += 1;
	if (params.rangeMin != null || params.rangeMax != null) count += 1;
	if (
		params.isReply != null ||
		params.depths?.length ||
		params.hasImage != null ||
		params.wasEdited != null
	) {
		count += 1;
	}
	if (
		params.minLikes != null ||
		params.minReplies != null ||
		params.minContentLength != null
	) {
		count += 1;
	}
	return count;
}

type AdminCommentsToolbarProps = {
	variant?: "list" | "overview";
};

export function AdminCommentsToolbar({
	variant = "list",
}: AdminCommentsToolbarProps) {
	const [params, setParams] = useAdminCommentsListingSearchParams();
	const sheetFilterCount = countAdminCommentSheetFilters(params);
	const resetPage = variant === "list" ? { page: 1 as const } : {};

	const filtersSheet = (
		<CommentFiltersSheet
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
					placeholder="Search content, slug, author, post…"
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
							sortByOptions={adminCommentSortableFields}
							sortByLabels={adminCommentSortByLabels}
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

function CommentFiltersSheet({
	params,
	setParams,
	resetPage,
	sheetFilterCount,
}: {
	params: ReturnType<typeof useAdminCommentsListingSearchParams>[0];
	setParams: ReturnType<typeof useAdminCommentsListingSearchParams>[1];
	resetPage: { page?: 1 };
	sheetFilterCount: number;
}) {
	const toggleContext = (
		context: (typeof adminCommentContextValues)[number],
		checked: boolean,
	) => {
		const current = params.contexts ?? [];
		const next = checked
			? [...new Set([...current, context])]
			: current.filter((value) => value !== context);

		void setParams({
			contexts: next.length > 0 ? next : null,
			...resetPage,
		});
	};

	const toggleDepth = (depth: number, checked: boolean) => {
		const current = params.depths ?? [];
		const next = checked
			? [...new Set([...current, depth])]
			: current.filter((value) => value !== depth);

		void setParams({
			depths: next.length > 0 ? next : null,
			...resetPage,
		});
	};

	return (
		<ListingFiltersSheet
			title="Comment filters"
			description="Context, thread depth, engagement, and dates."
			activeFilterCount={sheetFilterCount}
			onClear={() => {
				void setParams({
					authorUsernames: null,
					contexts: null,
					postSlugs: null,
					feedbackSlugs: null,
					rangeBy: null,
					rangeMin: null,
					rangeMax: null,
					isReply: null,
					depths: null,
					hasImage: null,
					wasEdited: null,
					minLikes: null,
					minReplies: null,
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
				legend="Context"
				options={adminCommentContextValues.map((context) => ({
					id: context,
					label: adminCommentContextLabels[context],
					checked: params.contexts?.includes(context) ?? false,
					onCheckedChange: (checked) => {
						toggleContext(context, checked);
					},
				}))}
			/>
			<ListingPostMultiSelect
				legend="On posts"
				selectedSlugs={params.postSlugs ?? []}
				onSelectedSlugsChange={(postSlugs) => {
					void setParams({
						postSlugs: postSlugs.length > 0 ? postSlugs : null,
						...resetPage,
					});
				}}
			/>
			<ListingFeedbackMultiSelect
				legend="On feedbacks"
				selectedSlugs={params.feedbackSlugs ?? []}
				onSelectedSlugsChange={(feedbackSlugs) => {
					void setParams({
						feedbackSlugs: feedbackSlugs.length > 0 ? feedbackSlugs : null,
						...resetPage,
					});
				}}
			/>
			<ListingCheckboxList
				legend="Thread"
				options={[
					{
						id: "topLevel",
						label: "Top-level only",
						checked: params.isReply === false,
						onCheckedChange: (checked) => {
							void setParams({
								isReply: checked ? false : null,
								...resetPage,
							});
						},
					},
					{
						id: "repliesOnly",
						label: "Replies only",
						checked: params.isReply === true,
						onCheckedChange: (checked) => {
							void setParams({
								isReply: checked ? true : null,
								...resetPage,
							});
						},
					},
					...adminCommentDepthOptions.map((depth) => ({
						id: `depth-${depth}`,
						label: `Depth ${depth}`,
						checked: params.depths?.includes(depth) ?? false,
						onCheckedChange: (checked: boolean) => {
							toggleDepth(depth, checked);
						},
					})),
				]}
			/>
			<ListingCheckboxList
				legend="Content flags"
				options={[
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
			<ListingRangeFields
				rangeBy={params.rangeBy}
				rangeMin={params.rangeMin}
				rangeMax={params.rangeMax}
				rangeByOptions={commentRangeableFields}
				rangeByLabels={adminCommentRangeByLabels}
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
					<FieldLabel>Min replies</FieldLabel>
					<Input
						type="number"
						min={0}
						placeholder="Any"
						value={params.minReplies ?? ""}
						onChange={(e) => {
							void setParams({
								minReplies: parseOptionalInt(e.target.value),
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
