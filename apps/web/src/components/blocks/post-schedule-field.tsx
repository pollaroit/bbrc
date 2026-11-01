"use client";

import { getZonedParts, upcomingPostScheduleSlots } from "@bbrc/shared";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { useMemo } from "react";
import { clubTimeZone } from "@/lib/club-timezone";
import { cn } from "@/lib/utils";

type PostScheduleFieldProps = {
	value: Date;
	onChange: (value: Date) => void;
	className?: string;
};

function formatClubHour(hour: number) {
	const h = hour % 24;
	const suffix = h < 12 ? "AM" : "PM";
	const display = h % 12 === 0 ? 12 : h % 12;
	return `${display}:00 ${suffix}`;
}

function dayLabel(slot: Date, now: Date) {
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
	const slots = upcomingPostScheduleSlots(from, clubTimeZone, 1);
	const first = slots[0];
	if (!first) {
		throw new Error("No schedule slots available");
	}
	return first;
}

/** Pick a whole club-local hour at least one hour ahead. */
export function PostScheduleField({
	value,
	onChange,
	className,
}: PostScheduleFieldProps) {
	const now = useMemo(() => new Date(), []);
	const options = useMemo(
		() =>
			upcomingPostScheduleSlots(now, clubTimeZone, 24 * 14).map((slot) => {
				const parts = getZonedParts(slot, clubTimeZone);
				return {
					slot,
					key: slot.toISOString(),
					label: `${dayLabel(slot, now)} · ${formatClubHour(parts.hour)}`,
				};
			}),
		[now],
	);

	return (
		<div className={cn("flex flex-col gap-1.5", className)}>
			<Select
				value={value.toISOString()}
				onValueChange={(iso) => {
					if (!iso) return;
					onChange(new Date(iso));
				}}
			>
				<SelectTrigger className="w-full">
					<SelectValue placeholder="Pick a time" />
				</SelectTrigger>
				<SelectContent className="max-h-64">
					{options.map((option) => (
						<SelectItem key={option.key} value={option.key}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<p className="text-muted-foreground text-xs">
				Club time ({clubTimeZone}). Whole hours only; at least one hour from
				now, within one month of when you first scheduled.
			</p>
		</div>
	);
}
