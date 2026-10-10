"use client";

import {
	CLUB_DEADLINE_HOUR,
	clampSittingDeadlineToClubEnd,
	getZonedParts,
	isPollDeadlineClubHour,
	POLL_DEADLINE_HOURS,
	pollDeadlineAtClubLocal,
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
	/** Poll closes at 14/17/20/23 club time; reading end uses 20:00 only. */
	mode?: "poll" | "reading";
};

function dayHasSelectablePollSlot(
	day: Date,
	minSelectable: Date,
	timeZone: string,
): boolean {
	for (const hour of POLL_DEADLINE_HOURS) {
		const slot = pollDeadlineAtClubLocal(day, hour, timeZone);
		if (slot.getTime() >= minSelectable.getTime()) {
			return true;
		}
	}
	return false;
}

function defaultPollHourForDay(
	day: Date,
	preferredHour: number,
	minSelectable: Date,
	timeZone: string,
): (typeof POLL_DEADLINE_HOURS)[number] {
	const hours = isPollDeadlineClubHour(preferredHour)
		? [preferredHour, ...POLL_DEADLINE_HOURS.filter((h) => h !== preferredHour)]
		: [...POLL_DEADLINE_HOURS];

	for (const hour of hours) {
		const slot = pollDeadlineAtClubLocal(day, hour, timeZone);
		if (slot.getTime() >= minSelectable.getTime()) {
			return hour;
		}
	}

	return POLL_DEADLINE_HOURS[0];
}

export function SittingDeadlinePicker({
	id,
	label = "Deadline",
	value,
	onChange,
	invalid,
	errorMessage,
	mode = "poll",
}: SittingDeadlinePickerProps) {
	const normalizedValue = useMemo(() => {
		if (mode === "reading") {
			return clampSittingDeadlineToClubEnd(value, clubTimeZone);
		}

		const hour = getZonedParts(value, clubTimeZone).hour;
		if (isPollDeadlineClubHour(hour)) {
			return pollDeadlineAtClubLocal(value, hour, clubTimeZone);
		}

		return snapPollDeadlineOnOrAfter(value, clubTimeZone);
	}, [mode, value]);

	const [open, setOpen] = useState(false);
	const [calendarMonth, setCalendarMonth] = useState(() => normalizedValue);

	useEffect(() => {
		setCalendarMonth(normalizedValue);
	}, [normalizedValue]);

	const displayLabel = useMemo(
		() => formatDateTimeInTimeZone(normalizedValue, clubTimeZone),
		[normalizedValue],
	);

	const minSelectable = useMemo(() => {
		const startOfToday = new Date();
		startOfToday.setHours(0, 0, 0, 0);
		return snapPollDeadlineOnOrAfter(startOfToday, clubTimeZone);
	}, []);

	const selectedPollHour = useMemo(() => {
		if (mode !== "poll") {
			return null;
		}
		const hour = getZonedParts(normalizedValue, clubTimeZone).hour;
		return isPollDeadlineClubHour(hour) ? hour : POLL_DEADLINE_HOURS[0];
	}, [mode, normalizedValue]);

	function applyPollDayAndHour(
		day: Date,
		hour: (typeof POLL_DEADLINE_HOURS)[number],
	) {
		let candidate = pollDeadlineAtClubLocal(day, hour, clubTimeZone);
		if (candidate.getTime() < minSelectable.getTime()) {
			candidate = snapPollDeadlineOnOrAfter(candidate, clubTimeZone);
		}
		onChange(candidate);
	}

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
							selected={normalizedValue}
							month={calendarMonth}
							onMonthChange={setCalendarMonth}
							onSelect={(day) => {
								if (!day) {
									return;
								}

								if (mode === "reading") {
									const snapped = clampSittingDeadlineToClubEnd(
										day,
										clubTimeZone,
									);
									onChange(
										snapped.getTime() < minSelectable.getTime()
											? minSelectable
											: snapped,
									);
									return;
								}

								const preferredHour = getZonedParts(
									normalizedValue,
									clubTimeZone,
								).hour;
								const hour = defaultPollHourForDay(
									day,
									preferredHour,
									minSelectable,
									clubTimeZone,
								);
								applyPollDayAndHour(day, hour);
							}}
							disabled={(day) => {
								if (mode === "reading") {
									const snapped = clampSittingDeadlineToClubEnd(
										day,
										clubTimeZone,
									);
									return snapped.getTime() < minSelectable.getTime();
								}

								return !dayHasSelectablePollSlot(
									day,
									minSelectable,
									clubTimeZone,
								);
							}}
						/>
						{mode === "poll" && selectedPollHour !== null ? (
							<div className="flex flex-col gap-2">
								<p className="font-medium text-muted-foreground text-xs">
									Closing time ({clubTimeZone})
								</p>
								<div className="grid grid-cols-4 gap-2">
									{POLL_DEADLINE_HOURS.map((hour) => {
										const slot = pollDeadlineAtClubLocal(
											normalizedValue,
											hour,
											clubTimeZone,
										);
										const disabled = slot.getTime() < minSelectable.getTime();

										return (
											<Button
												key={hour}
												type="button"
												size="sm"
												variant={
													selectedPollHour === hour ? "default" : "outline"
												}
												disabled={disabled}
												className="px-2 tabular-nums"
												onClick={() => {
													applyPollDayAndHour(normalizedValue, hour);
												}}
											>
												{String(hour).padStart(2, "0")}:00
											</Button>
										);
									})}
								</div>
							</div>
						) : null}
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
			{mode === "poll" ? (
				<FieldDescription>
					Choose a date and one of{" "}
					{POLL_DEADLINE_HOURS.map((h) => String(h).padStart(2, "0")).join(
						":00, ",
					)}
					:00 club time ({clubTimeZone}).
				</FieldDescription>
			) : (
				<FieldDescription>
					Reading end is fixed at {String(CLUB_DEADLINE_HOUR).padStart(2, "0")}
					:00 club time ({clubTimeZone}) on the day you pick.
				</FieldDescription>
			)}
			{errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
		</Field>
	);
}
