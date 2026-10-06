"use client";

import type { PostFeedRange } from "@bbrc/shared";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import {
	feedRangeToQueryRange,
	feedSortToQuerySort,
	type PostFeedSortUi,
	postFeedRangeLabels,
	postFeedSortLabels,
	queryRangeToFeedRange,
	querySortToFeedSort,
	usePostFeedSearchParams,
} from "@/lib/listing/post-feed-listing";

const sortOptions: PostFeedSortUi[] = ["hot", "top", "recent"];
const rangeOptions: PostFeedRange[] = ["all", "year", "month", "week", "day"];

export function PostFeedToolbar() {
	const [params, setParams] = usePostFeedSearchParams();
	const feedSort = querySortToFeedSort(params.sort);
	const feedRange = queryRangeToFeedRange(params.range);

	return (
		<div className="flex flex-wrap items-center gap-2">
			<Select
				value={feedSort}
				onValueChange={(value) => {
					const next = value as PostFeedSortUi;
					void setParams({
						sort: feedSortToQuerySort(next),
					});
				}}
			>
				<SelectTrigger className="w-[9.5rem]" aria-label="Feed sort">
					<SelectValue>{postFeedSortLabels[feedSort]}</SelectValue>
				</SelectTrigger>
				<SelectContent>
					{sortOptions.map((option) => (
						<SelectItem key={option} value={option}>
							{postFeedSortLabels[option]}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{feedSort !== "hot" ? (
				<Select
					value={feedRange}
					onValueChange={(value) => {
						const next = value as PostFeedRange;
						void setParams({
							range: feedRangeToQueryRange(next),
						});
					}}
				>
					<SelectTrigger className="w-[9.5rem]" aria-label="Feed time range">
						<SelectValue>{postFeedRangeLabels[feedRange]}</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{rangeOptions.map((option) => (
							<SelectItem key={option} value={option}>
								{postFeedRangeLabels[option]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			) : null}
		</div>
	);
}
