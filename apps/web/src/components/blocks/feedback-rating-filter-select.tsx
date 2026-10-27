"use client";

import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { useTranslations } from "next-intl";
import { FEEDBACK_MIN_RATING_FILTER_OPTIONS } from "@/lib/feedback/rating-filter";
import { useFormatters } from "@/lib/i18n/use-formatters";

type FeedbackRatingFilterSelectProps = {
	value: string;
	onValueChange: (value: string) => void;
};

export function FeedbackRatingFilterSelect({
	value,
	onValueChange,
}: FeedbackRatingFilterSelectProps) {
	const t = useTranslations("books");
	const f = useFormatters();
	return (
		<Select
			value={value}
			onValueChange={(next) => {
				if (next) {
					onValueChange(next);
				}
			}}
		>
			<SelectTrigger
				className="w-[11rem]"
				aria-label={t("feedback.filter.label")}
			>
				<SelectValue placeholder={t("feedback.filter.all")} />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					{FEEDBACK_MIN_RATING_FILTER_OPTIONS.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.value === "all"
								? t("feedback.filter.all")
								: option.value === "5"
									? t("feedback.filter.fiveOnly")
									: t("feedback.filter.atLeast", {
											rating: f.rating(Number(option.value)),
										})}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
