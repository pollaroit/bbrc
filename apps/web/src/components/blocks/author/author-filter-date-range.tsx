"use client";

import { Button } from "@bbrc/ui/components/button";
import { Card } from "@bbrc/ui/components/card";
import { FieldLegend, FieldSet } from "@bbrc/ui/components/field";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@bbrc/ui/components/popover";
import {
	DateSelector,
	type DateSelectorValue,
	formatDateValue,
} from "@bbrc/ui/components/reui/date-selector";
import { Separator } from "@bbrc/ui/components/separator";
import { CalendarIcon, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type AuthorFilterDateRangeProps = {
	legend: string;
	from: Date | null;
	to: Date | null;
	onChange: (range: { from: Date | null; to: Date | null }) => void;
	/** Earliest year the picker offers. */
	minYear?: number;
};

const DAY_FORMAT = "yyyy-MM-dd";

function toValue(
	from: Date | null,
	to: Date | null,
): DateSelectorValue | undefined {
	if (!from && !to) return undefined;
	return {
		period: "day",
		operator: "between",
		startDate: from ?? undefined,
		endDate: to ?? undefined,
	};
}

/** A between-dates filter with the same picker the other lists use, but no "field" switch. */
export function AuthorFilterDateRange({
	legend,
	from,
	to,
	onChange,
	minYear = 2015,
}: AuthorFilterDateRangeProps) {
	const t = useTranslations("authors");
	const committed = useMemo(() => toValue(from, to), [from, to]);
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState<DateSelectorValue | undefined>(committed);
	const portalRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (open) setDraft(committed);
	}, [open, committed]);

	const text = committed
		? formatDateValue(committed, undefined, DAY_FORMAT)
		: t("filters.anyTime");

	return (
		<FieldSet className="gap-2">
			<FieldLegend>{legend}</FieldLegend>
			<div ref={portalRef} className="relative w-full">
				<Card className="w-full gap-0 p-0">
					<div className="flex w-full items-stretch">
						<Popover modal={false} open={open} onOpenChange={setOpen}>
							<PopoverTrigger
								render={
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-auto min-h-9 flex-1 justify-start gap-2 px-3 py-2 font-normal hover:bg-muted/50"
									>
										<CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
										<span
											className={cn(
												"truncate text-left",
												!committed && "text-muted-foreground",
											)}
										>
											{text}
										</span>
									</Button>
								}
							/>
							<PopoverContent
								container={portalRef}
								className="w-auto max-w-[18rem] gap-0 p-0"
								align="start"
								sideOffset={4}
							>
								<div className="p-2">
									<DateSelector
										className="w-70 max-w-full space-y-2"
										value={draft}
										presetMode="between"
										showFilterToggle={false}
										periodTypes={["day"]}
										defaultPeriodType="day"
										defaultFilterType="between"
										allowRange
										showTwoMonths={false}
										showInput={false}
										minYear={minYear}
										maxYear={new Date().getFullYear() + 1}
										dayDateFormat={DAY_FORMAT}
										onChange={setDraft}
									/>
								</div>
								<Separator />
								<div className="flex justify-end gap-2 p-2">
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => {
											setDraft(committed);
											setOpen(false);
										}}
									>
										{t("filters.cancel")}
									</Button>
									<Button
										type="button"
										size="sm"
										onClick={() => {
											onChange({
												from: draft?.startDate ?? null,
												to: draft?.endDate ?? null,
											});
											setOpen(false);
										}}
									>
										{t("filters.apply")}
									</Button>
								</div>
							</PopoverContent>
						</Popover>
						{committed ? (
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								className="h-auto self-stretch border-input border-l"
								aria-label={t("filters.clearLegend", { legend })}
								onClick={() => onChange({ from: null, to: null })}
							>
								<X />
							</Button>
						) : null}
					</div>
				</Card>
			</div>
		</FieldSet>
	);
}
