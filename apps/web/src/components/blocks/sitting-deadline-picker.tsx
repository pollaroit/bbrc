"use client";

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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { CalendarIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { formatDateTime } from "@/lib/format-datetime";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MINUTES = Array.from({ length: 12 }, (_, index) => index * 5);

type SittingDeadlinePickerProps = {
	id?: string;
	label?: string;
	value: Date;
	onChange: (value: Date) => void;
	invalid?: boolean;
	errorMessage?: string;
};

function withTime(base: Date, hour: number, minute: number): Date {
	const next = new Date(base);
	next.setHours(hour, minute, 0, 0);
	return next;
}

export function SittingDeadlinePicker({
	id,
	label = "Deadline",
	value,
	onChange,
	invalid,
	errorMessage,
}: SittingDeadlinePickerProps) {
	const [open, setOpen] = useState(false);
	const [calendarMonth, setCalendarMonth] = useState(() => value);

	const hour = value.getHours();
	const minute = value.getMinutes();
	const snappedMinute = MINUTES.includes(minute)
		? minute
		: (Math.round(minute / 5) * 5) % 60;

	const displayLabel = useMemo(() => formatDateTime(value), [value]);

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
							selected={value}
							month={calendarMonth}
							onMonthChange={setCalendarMonth}
							onSelect={(day) => {
								if (!day) {
									return;
								}

								onChange(withTime(day, hour, snappedMinute));
							}}
							disabled={(day) =>
								day < new Date(new Date().setHours(0, 0, 0, 0))
							}
						/>
						<div className="flex flex-wrap gap-2 border-border border-t pt-3">
							<Select
								value={String(hour)}
								onValueChange={(next) => {
									if (next == null) {
										return;
									}

									onChange(
										withTime(value, Number.parseInt(next, 10), snappedMinute),
									);
								}}
							>
								<SelectTrigger className="w-22" aria-label="Hour">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{HOURS.map((h) => (
										<SelectItem key={h} value={String(h)}>
											{String(h).padStart(2, "0")}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<span className="self-center text-muted-foreground">:</span>
							<Select
								value={String(snappedMinute)}
								onValueChange={(next) => {
									if (next == null) {
										return;
									}

									onChange(withTime(value, hour, Number.parseInt(next, 10)));
								}}
							>
								<SelectTrigger className="w-22" aria-label="Minute">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{MINUTES.map((m) => (
										<SelectItem key={m} value={String(m)}>
											{String(m).padStart(2, "0")}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
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
				Voting and reading end on this date (local time).
			</FieldDescription>
			{errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
		</Field>
	);
}
