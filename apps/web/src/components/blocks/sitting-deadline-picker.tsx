"use client";

import {
	CLUB_DEADLINE_HOUR,
	clampSittingDeadlineToClubEnd,
	snapPollDeadlineOnOrAfter,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Calendar } from "@bbrc/ui/components/calendar";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@bbrc/ui/components/field";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@bbrc/ui/components/popover";
import { CalendarIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { clubTimeZone } from "@/lib/club-timezone";
import { formatDateTimeInTimeZone } from "@/lib/format-datetime";
import { cn } from "@/lib/utils";

type SittingDeadlinePickerProps = {
	id?: string;
	label?: string;
	value: Date;
	onChange: (value: Date) => void;
	invalid?: boolean;
	errorMessage?: string;
};

export function SittingDeadlinePicker({
	id,
	label = "Deadline",
	value,
	onChange,
	invalid,
	errorMessage,
}: SittingDeadlinePickerProps) {
	const clubDeadline = useMemo(
		() => clampSittingDeadlineToClubEnd(value, clubTimeZone),
		[value],
	);

	const [open, setOpen] = useState(false);
	const [calendarMonth, setCalendarMonth] = useState(() => clubDeadline);

	useEffect(() => {
		setCalendarMonth(clubDeadline);
	}, [clubDeadline]);

	const displayLabel = useMemo(
		() => formatDateTimeInTimeZone(clubDeadline, clubTimeZone),
		[clubDeadline],
	);

	const minSelectable = useMemo(() => {
		const startOfToday = new Date();
		startOfToday.setHours(0, 0, 0, 0);
		return snapPollDeadlineOnOrAfter(startOfToday, clubTimeZone);
	}, []);

	return (
		<Field data-invalid={invalid || undefined}>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger
					render={
						<Button
							id={id}
							type="button"
							variant="outline"
							aria-invalid={invalid}
							className={cn(
								"w-full justify-start font-normal",
								!value && "text-muted-foreground",
							)}
						/>
					}
				>
					<CalendarIcon data-icon="inline-start" aria-hidden />
					{displayLabel}
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<div className="flex flex-col gap-3 p-3">
						<Calendar
							mode="single"
							selected={clubDeadline}
							month={calendarMonth}
							onMonthChange={setCalendarMonth}
							onSelect={(day) => {
								if (!day) {
									return;
								}

								const snapped = clampSittingDeadlineToClubEnd(
									day,
									clubTimeZone,
								);
								onChange(
									snapped.getTime() < minSelectable.getTime()
										? minSelectable
										: snapped,
								);
							}}
							disabled={(day) => {
								const snapped = clampSittingDeadlineToClubEnd(
									day,
									clubTimeZone,
								);
								return snapped.getTime() < minSelectable.getTime();
							}}
						/>
						<Button
							type="button"
							size="sm"
							className="w-full"
							onClick={() => {
								setOpen(false);
							}}
						>
							Done
						</Button>
					</div>
				</PopoverContent>
			</Popover>
			<FieldDescription>
				Deadlines are always {String(CLUB_DEADLINE_HOUR).padStart(2, "0")}:00
				club time ({clubTimeZone}).
			</FieldDescription>
			{errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
		</Field>
	);
}
