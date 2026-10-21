"use client";

import {
	userFeedbackRangeableFields,
	userFeedbackSortableFields,
} from "@bbrc/api/modules/feedback/user-feedback.listing";
import { Users } from "lucide-react";
import { ListingCheckboxList } from "@/components/listing/listing-checkbox-list";
import { ListingFiltersSheet } from "@/components/listing/listing-filters-sheet";
import { ListingRangeFields } from "@/components/listing/listing-range-fields";
import { ListingRatingRangeFields } from "@/components/listing/listing-rating-range-fields";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingSort } from "@/components/listing/listing-sort";
import { ListingToggleChip } from "@/components/listing/listing-toggle-chip";
import { authClient } from "@/lib/auth-client";
import {
	clearUserFeedbackSheetFilters,
	countUserFeedbackSheetFilters,
	userFeedbackRangeByLabels,
	userFeedbackReviewTypeLabels,
	userFeedbackReviewTypes,
	userFeedbackSortByLabels,
	userFeedbackSpoilerLabels,
	userFeedbackSpoilerModes,
	useUserFeedbackListingSearchParams,
} from "@/lib/listing/user-feedbacks-listing";

type UserFeedbacksListingToolbarProps = {
	isOwnProfile: boolean;
};

export function UserFeedbacksListingToolbar({
	isOwnProfile,
}: UserFeedbacksListingToolbarProps) {
	const { data: session } = authClient.useSession();
	const [params, setParams] = useUserFeedbackListingSearchParams();
	const showMutual = Boolean(session?.user) && !isOwnProfile;

	return (
		<div className="flex flex-col gap-3 md:flex-row md:items-center">
			<ListingSearch
				value={params.search ?? ""}
				onChange={(search) => {
					void setParams({ search });
				}}
				placeholder="Search by book or review…"
			/>

			<div className="flex flex-wrap items-center gap-2 md:shrink-0">
				{showMutual ? (
					<ListingToggleChip
						pressed={params.mutualOnly}
						onPressedChange={(mutualOnly) => {
							void setParams({ mutualOnly });
						}}
						icon={<Users data-icon="inline-start" />}
					>
						Only mutuals
					</ListingToggleChip>
				) : null}

				<ListingSort
					sortBy={params.sortBy}
					sortDirection={params.sortDirection}
					onSortByChange={(sortBy) => {
						void setParams({ sortBy });
					}}
					onSortDirectionChange={(sortDirection) => {
						void setParams({ sortDirection });
					}}
					sortByOptions={userFeedbackSortableFields}
					sortByLabels={userFeedbackSortByLabels}
					appearance="library"
				/>

				<ListingFiltersSheet
					title="Review filters"
					description="Narrow this member's reviews by rating, type, spoilers, or date."
					activeFilterCount={countUserFeedbackSheetFilters(params)}
					onClear={() => clearUserFeedbackSheetFilters(setParams)}
					appearance="library"
				>
					<ListingRatingRangeFields
						legend="Rating"
						minId="user-feedback-filter-min-rating"
						maxId="user-feedback-filter-max-rating"
						step={0.5}
						min={params.minRating}
						max={params.maxRating}
						onMinChange={(minRating) => {
							void setParams({ minRating });
						}}
						onMaxChange={(maxRating) => {
							void setParams({ maxRating });
						}}
					/>

					<ListingCheckboxList
						legend="Review type"
						options={userFeedbackReviewTypes.map((type) => ({
							id: type,
							label: userFeedbackReviewTypeLabels[type],
							checked: params.reviewType === type,
							onCheckedChange: (checked) => {
								void setParams({ reviewType: checked ? type : null });
							},
						}))}
					/>

					<ListingCheckboxList
						legend="Spoilers"
						options={userFeedbackSpoilerModes.map((mode) => ({
							id: mode,
							label: userFeedbackSpoilerLabels[mode],
							checked: params.spoilers === mode,
							onCheckedChange: (checked) => {
								void setParams({ spoilers: checked ? mode : null });
							},
						}))}
					/>

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
						rangeByOptions={userFeedbackRangeableFields}
						rangeByLabels={userFeedbackRangeByLabels}
					/>
				</ListingFiltersSheet>
			</div>
		</div>
	);
}
