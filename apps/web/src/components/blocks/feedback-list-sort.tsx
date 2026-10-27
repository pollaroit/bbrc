"use client";

import { useTranslations } from "next-intl";
import { ListingSort } from "@/components/listing/listing-sort";
import {
	DEFAULT_FEEDBACK_LIST_SORT,
	DEFAULT_FEEDBACK_LIST_SORT_DIRECTION,
	type FeedbackListSortDirection,
	type FeedbackListSortField,
	feedbackListSortFields,
} from "@/lib/feedback/list-sort";

type FeedbackListSortProps = {
	sortBy: FeedbackListSortField;
	sortDirection: FeedbackListSortDirection;
	onSortByChange: (value: FeedbackListSortField) => void;
	onSortDirectionChange: (value: FeedbackListSortDirection) => void;
};

export function FeedbackListSort({
	sortBy,
	sortDirection,
	onSortByChange,
	onSortDirectionChange,
}: FeedbackListSortProps) {
	const t = useTranslations("books");
	return (
		<ListingSort
			sortBy={sortBy}
			sortDirection={sortDirection}
			onSortByChange={(value) => {
				onSortByChange(value ?? DEFAULT_FEEDBACK_LIST_SORT);
			}}
			onSortDirectionChange={(value) => {
				onSortDirectionChange(value ?? DEFAULT_FEEDBACK_LIST_SORT_DIRECTION);
			}}
			sortByOptions={feedbackListSortFields}
			sortByLabels={{
				createdAt: t("feedback.sortBy.createdAt"),
				rating: t("feedback.sortBy.rating"),
			}}
		/>
	);
}
