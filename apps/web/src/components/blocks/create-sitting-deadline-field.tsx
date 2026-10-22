"use client";

import { getZonedParts, upcomingPollDeadlineSlots } from "@bbrc/shared";
import { useMemo } from "react";
import { SittingDeadlinePicker } from "@/components/blocks/sitting-deadline-picker";
import { clubTimeZone } from "@/lib/club-timezone";
import { cn } from "@/lib/utils";

type CreateSittingDeadlineFieldProps = {
	id: string;
	value: Date;
	onChange: (value: Date) => void;
	invalid?: boolean;
	errorMessage?: string;
};

function hourLabel(hour: number) {
	return `${hour % 12 === 0 ? 12 : hour % 12}${hour < 12 ? "AM" : "PM"}`;
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
		timeZone: clubTimeZone,
	}).format(slot);
}

/** Quick picks for the next few closing slots, plus the full date picker. */
export function CreateSittingDeadlineField({
	id,
	value,
	onChange,
	invalid,
	errorMessage,
}: CreateSittingDeadlineFieldProps) {
	const slots = useMemo(() => {
		const now = new Date();
		return upcomingPollDeadlineSlots(now, clubTimeZone, 3)
			.slice(0, 6)
			.map((slot) => ({
				slot,
				label: `${dayLabel(slot, now)} ${hourLabel(getZonedParts(slot, clubTimeZone).hour)}`,
			}));
	}, []);

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap gap-1.5">
				{slots.map(({ slot, label }) => {
					const selected = slot.getTime() === value.getTime();
					return (
						<button
							key={slot.toISOString()}
							type="button"
							aria-pressed={selected}
							onClick={() => onChange(slot)}
							className={cn(
								"border px-2.5 py-1.5 text-xs transition-colors",
								selected
									? "border-foreground bg-muted/30 font-medium"
									: "border-border hover:bg-muted/40",
							)}
						>
							{label}
						</button>
					);
				})}
			</div>
			<SittingDeadlinePicker
				mode="poll"
				id={id}
				label="Or pick another time"
				value={value}
				onChange={onChange}
				invalid={invalid}
				errorMessage={errorMessage}
			/>
		</div>
	);
}
