"use client";

import {
	earliestPostScheduleAt,
	getZonedParts,
	postScheduleDayKey,
	postScheduleHoursForDay,
	postScheduleSelectableDays,
	zonedTimeToUtc,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Calendar } from "@bbrc/ui/components/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@bbrc/ui/components/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { CalendarIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { clubTimeZone } from "@/lib/club-timezone";
import { cn } from "@/lib/utils";

type PostScheduleFieldProps = {
	value: Date;
	onChange: (value: Date) => void;
	firstScheduledAt?: Date | null;
	className?: string;
};

function formatClubHour(hour: number) {
	const h = hour % 24;
	const suffix = h < 12 ? "AM" : "PM";
	const display = h % 12 === 0 ? 12 : h % 12;
	return `${display}:00 ${suffix}`;
}

function dayKeyToLocalDate(dayKey: string) {
	const [y, m, d] = dayKey.split("-").map(Number);
	return new Date(y!, m! - 1, d!);
}

function formatDayButton(dayKey: string, now: Date) {
	const [y, m, d] = dayKey.split("-").map(Number);
	const slot = zonedTimeToUtc(y!, m!, d!, 12, 0, clubTimeZone);
	const a = getZonedParts(slot, clubTimeZone);
	const b = getZonedParts(now, clubTimeZone);
	const diff = Math.round(
		(Date.UTC(a.year, a.month - 1, a.day) -
			Date.UTC(b.year, b.month - 1, b.day)) /
			86_400_000,
	);
	if (diff === 0) return "Today";
	if (diff === 1) return "Tomorrow";
	return new Intl.DateTimeFormat("en", {
		weekday: "short",
		month: "short",
		day: "numeric",
		timeZone: clubTimeZone,
	}).format(slot);
}

export function defaultPostScheduleSlot(from = new Date()): Date {
	return earliestPostScheduleAt(from, clubTimeZone);
}

/** Calendar day + hour select in club time. */
export function PostScheduleField({
	value,
	onChange,
	firstScheduledAt = null,
	className,
}: PostScheduleFieldProps) {
	const now = useMemo(() => new Date(), []);
	const bounds = useMemo(
		() => ({ now, firstScheduledAt, timeZone: clubTimeZone }),
		[now, firstScheduledAt],
	);
	const selectableDays = useMemo(
		() => new Set(postScheduleSelectableDays(bounds)),
		[bounds],
	);
	const valueDay = postScheduleDayKey(value, clubTimeZone);
	const [calendarOpen, setCalendarOpen] = useState(false);

	const hours = useMemo(
		() => postScheduleHoursForDay(valueDay, bounds),
		[valueDay, bounds],
	);

	useEffect(() => {
		if (hours.length === 0) return;
		if (!hours.some((slot) => slot.getTime() === value.getTime())) {
			onChange(hours[0]!);
		}
	}, [hours, value, onChange]);

	const valueHour = getZonedParts(value, clubTimeZone).hour;
	const hourOptions = hours.map((slot) => {
		const parts = getZonedParts(slot, clubTimeZone);
		return {
			slot,
			key: `${valueDay}@${parts.hour}`,
			label: formatClubHour(parts.hour),
		};
	});
	const selectedHourKey =
		hourOptions.find((option) => option.slot.getTime() === value.getTime())
			?.key ?? `${valueDay}@${valueHour}`;
	const selectedHourLabel =
		hourOptions.find((option) => option.key === selectedHourKey)?.label ??
		formatClubHour(valueHour);

	return (
		<div className={cn("flex flex-col gap-3", className)}>
			<div className="flex flex-col gap-2 sm:flex-row sm:items-end">
				<div className="flex min-w-0 flex-1 flex-col gap-1.5">
					<span className="text-muted-foreground text-xs">Day</span>
					<Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
						<PopoverTrigger
							render={
								<Button
									type="button"
									variant="outline"
									className="w-full justify-start gap-2 font-normal"
								>
									<CalendarIcon className="size-4 text-muted-foreground" />
									{formatDayButton(valueDay, now)}
								</Button>
							}
						/>
						<PopoverContent className="w-auto p-0" align="start">
							<Calendar
								mode="single"
								selected={dayKeyToLocalDate(valueDay)}
								onSelect={(day) => {
									if (!day) return;
									const key = postScheduleDayKey(day, clubTimeZone);
									if (!selectableDays.has(key)) return;
									const dayHours = postScheduleHoursForDay(key, bounds);
									if (dayHours[0]) {
										onChange(dayHours[0]);
									}
									setCalendarOpen(false);
								}}
								disabled={(day) =>
									!selectableDays.has(postScheduleDayKey(day, clubTimeZone))
								}
								defaultMonth={dayKeyToLocalDate(valueDay)}
							/>
						</PopoverContent>
					</Popover>
				</div>
				<div className="flex min-w-0 flex-1 flex-col gap-1.5">
					<span className="text-muted-foreground text-xs">Hour</span>
					<Select
						value={selectedHourKey}
						onValueChange={(key) => {
							if (!key) return;
							const slot = hourOptions.find(
								(option) => option.key === key,
							)?.slot;
							if (slot) onChange(slot);
						}}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Pick an hour">
								{selectedHourLabel}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{hourOptions.map((option) => (
								<SelectItem key={option.key} value={option.key}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
			<p className="text-muted-foreground text-xs">
				{clubTimeZone}. Whole hours only; at least one hour from now, within one
				month of when you first scheduled.
			</p>
		</div>
	);
}
