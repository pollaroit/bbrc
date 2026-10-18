"use client";

import { Button } from "@bbrc/ui/components/button";
import { Card } from "@bbrc/ui/components/card";
import { FieldLegend, FieldSet } from "@bbrc/ui/components/field";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@bbrc/ui/components/popover";
import type { DateSelectorValue } from "@bbrc/ui/components/reui/date-selector";
import {
	DateSelector,
	formatDateValue,
} from "@bbrc/ui/components/reui/date-selector";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { Separator } from "@bbrc/ui/components/separator";
import { CalendarIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { type FieldLabels, labelForField } from "@/lib/listing/labels";
import { cn } from "@/lib/utils";

type ListingRangeFieldsProps<TRangeBy extends string> = {
	rangeBy: TRangeBy | null;
	rangeMin: Date | null;
	rangeMax: Date | null;
	onRangeByChange: (value: TRangeBy | null) => void;
	onRangeMinChange: (value: Date | null) => void;
	onRangeMaxChange: (value: Date | null) => void;
	rangeByOptions: readonly TRangeBy[];
	rangeByLabels: FieldLabels<TRangeBy>;
	legend?: string;
};

function toDateSelectorValue(
	rangeMin: Date | null,
	rangeMax: Date | null,
): DateSelectorValue | undefined {
	if (!rangeMin && !rangeMax) {
		return undefined;
	}

	return {
		period: "day",
		operator: "between",
		startDate: rangeMin ?? undefined,
		endDate: rangeMax ?? undefined,
	};
}

function applyDateSelectorValue<TRangeBy extends string>(
	value: DateSelectorValue | undefined,
	activeRangeBy: TRangeBy | null,
	onRangeByChange: (value: TRangeBy) => void,
	onRangeMinChange: (value: Date | null) => void,
	onRangeMaxChange: (value: Date | null) => void,
) {
	if (!value?.startDate && !value?.endDate) {
		onRangeMinChange(null);
		onRangeMaxChange(null);
		return;
	}

	if (activeRangeBy) {
		onRangeByChange(activeRangeBy);
	}

	onRangeMinChange(value.startDate ?? null);
	onRangeMaxChange(value.endDate ?? null);
}

export function ListingRangeFields<TRangeBy extends string>({
	rangeBy,
	rangeMin,
	rangeMax,
	onRangeByChange,
	onRangeMinChange,
	onRangeMaxChange,
	rangeByOptions,
	rangeByLabels,
	legend = "Date range",
}: ListingRangeFieldsProps<TRangeBy>) {
	const activeRangeBy = rangeBy ?? rangeByOptions[0] ?? null;
	const currentYear = new Date().getFullYear();
	const dayDateFormat = "yyyy-MM-dd";
	const portalContainerRef = useRef<HTMLDivElement>(null);

	const committedValue = useMemo(
		() => toDateSelectorValue(rangeMin, rangeMax),
		[rangeMin, rangeMax],
	);

	const [popoverOpen, setPopoverOpen] = useState(false);
	const [draftValue, setDraftValue] = useState<DateSelectorValue | undefined>(
		committedValue,
	);

	useEffect(() => {
		if (popoverOpen) {
			setDraftValue(committedValue);
		}
	}, [popoverOpen, committedValue]);

	const dateDisplayText = committedValue
		? formatDateValue(committedValue, undefined, dayDateFormat)
		: "Any time";

	const rangeByDisplayLabel =
		activeRangeBy != null
			? labelForField(rangeByLabels, activeRangeBy)
			: "Field";

	return (
		<FieldSet className="gap-3">
			{legend ? <FieldLegend>{legend}</FieldLegend> : null}
			<div ref={portalContainerRef} className="relative w-full">
				<Card className="w-full gap-0 p-0">
					<div className="flex w-full items-stretch">
						<Select
							value={activeRangeBy ?? undefined}
							onValueChange={(value) => {
								onRangeByChange(value as TRangeBy);
							}}
						>
							<SelectTrigger
								id="listing-range-by"
								size="sm"
								className="h-auto min-h-9 w-auto max-w-[45%] shrink-0 rounded-none border-0 border-input border-r bg-transparent py-2 pr-2 pl-3 shadow-none focus-visible:ring-0"
							>
								<SelectValue placeholder="Field">
									{rangeByDisplayLabel}
								</SelectValue>
							</SelectTrigger>
							<SelectContent alignItemWithTrigger={false}>
								{rangeByOptions.map((option) => (
									<SelectItem key={option} value={option}>
										{labelForField(rangeByLabels, option)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Popover
							modal={false}
							open={popoverOpen}
							onOpenChange={setPopoverOpen}
						>
							<PopoverTrigger
								render={
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-auto min-h-9 flex-1 justify-start gap-2 rounded-none px-3 py-2 font-normal hover:bg-muted/50"
									>
										<CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
										<span
											className={cn(
												"truncate text-left",
												!committedValue && "text-muted-foreground",
											)}
										>
											{dateDisplayText}
										</span>
									</Button>
								}
							/>
							<PopoverContent
								container={portalContainerRef}
								className="w-auto max-w-[18rem] gap-0 p-0"
								align="start"
								sideOffset={4}
							>
								<div className="p-2">
									<DateSelector
										className="w-70 max-w-full space-y-2"
										value={draftValue}
										presetMode="between"
										showFilterToggle={false}
										periodTypes={["day"]}
										defaultPeriodType="day"
										defaultFilterType="between"
										allowRange
										showTwoMonths={false}
										showInput={false}
										minYear={2015}
										maxYear={currentYear + 1}
										dayDateFormat={dayDateFormat}
										onChange={setDraftValue}
									/>
								</div>
								<Separator />
								<div className="flex justify-end gap-2 p-2">
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => {
											setDraftValue(committedValue);
											setPopoverOpen(false);
										}}
									>
										Cancel
									</Button>
									<Button
										type="button"
										size="sm"
										onClick={() => {
											applyDateSelectorValue(
												draftValue,
												activeRangeBy,
												onRangeByChange,
												onRangeMinChange,
												onRangeMaxChange,
											);
											setPopoverOpen(false);
										}}
									>
										Apply
									</Button>
								</div>
							</PopoverContent>
						</Popover>
					</div>
				</Card>
			</div>
		</FieldSet>
	);
}
