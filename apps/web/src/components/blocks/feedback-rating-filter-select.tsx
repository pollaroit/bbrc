"use client";

import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { FEEDBACK_MIN_RATING_FILTER_OPTIONS } from "@/lib/feedback/rating-filter";

type FeedbackRatingFilterSelectProps = {
	value: string;
	onValueChange: (value: string) => void;
};

export function FeedbackRatingFilterSelect({
	value,
	onValueChange,
}: FeedbackRatingFilterSelectProps) {
	return (
		<Select
			value={value}
			onValueChange={(next) => {
				if (next) {
					onValueChange(next);
				}
			}}
		>
			<SelectTrigger className="w-[11rem]" aria-label="Filter by rating">
				<SelectValue placeholder="All ratings" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					{FEEDBACK_MIN_RATING_FILTER_OPTIONS.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
