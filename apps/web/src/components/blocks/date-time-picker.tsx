"use client";

import type { Formatters } from "@bbrc/i18n";
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
import { useState } from "react";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { cn } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

export type DateTimePreset = { label: string; days: number };

type DateTimePickerProps = {
	id?: string;
	value: Date | null;
	onChange: (value: Date) => void;
	/** Earliest moment that can be picked. */
	min?: Date;
	/** One-tap shortcuts: this many days from now, at the current time. */
	presets?: readonly DateTimePreset[];
	placeholder?: string;
	disabled?: boolean;
	className?: string;
};

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MINUTES = Array.from({ length: 12 }, (_, step) => step * 5);

const pad = (value: number) => String(value).padStart(2, "0");

function withTime(day: Date, hours: number, minutes: number) {
	const next = new Date(day);
	next.setHours(hours, minutes, 0, 0);
	return next;
}

function clampToMin(value: Date, min?: Date) {
	return min && value.getTime() < min.getTime() ? min : value;
}

/** Rounded up to the next 5 minutes so the time lists always show the value. */
function roundToFive(date: Date) {
	const next = new Date(date);
	next.setSeconds(0, 0);
	next.setMinutes(Math.ceil(next.getMinutes() / 5) * 5);
	return next;
}

function presetDate(days: number) {
	return roundToFive(new Date(Date.now() + days * DAY_MS));
}

function formatValue(f: Formatters, value: Date) {
	return f.dateWith(value, {
		weekday: "short",
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

/** A day from a calendar plus a time from two lists, with one-tap presets. */
export function DateTimePicker({
	id,
	value,
	onChange,
	min,
	presets = [],
	placeholder = "Pick a date and time",
	disabled = false,
	className,
}: DateTimePickerProps) {
	const f = useFormatters();
	const [open, setOpen] = useState(false);
	const hours = value?.getHours() ?? 12;
	const minutes = value ? Math.round(value.getMinutes() / 5) * 5 : 0;
	const minDay = min ? withTime(min, 0, 0) : undefined;

	function setTime(nextHours: number, nextMinutes: number) {
		const base = value ?? presetDate(1);
		onChange(clampToMin(withTime(base, nextHours, nextMinutes % 60), min));
	}

	return (
		<div className={cn("flex flex-col gap-2", className)}>
			{presets.length > 0 ? (
				<div className="flex flex-wrap gap-1.5">
					{presets.map((preset) => {
						const target = presetDate(preset.days);
						const active =
							value != null &&
							Math.abs(value.getTime() - target.getTime()) < 5 * 60 * 1000;
						return (
							<Button
								key={preset.label}
								type="button"
								size="sm"
								variant={active ? "default" : "outline"}
								disabled={disabled}
								onClick={() => onChange(clampToMin(target, min))}
							>
								{preset.label}
							</Button>
						);
					})}
				</div>
			) : null}
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger
					render={
						<Button
							id={id}
							type="button"
							variant="outline"
							disabled={disabled}
							className={cn(
								"w-full justify-start font-normal tabular-nums",
								!value && "text-muted-foreground",
							)}
						/>
					}
				>
					<CalendarIcon data-icon="inline-start" aria-hidden />
					{value ? formatValue(f, value) : placeholder}
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<div className="flex flex-col gap-3 p-3">
						<Calendar
							mode="single"
							selected={value ?? undefined}
							defaultMonth={value ?? undefined}
							onSelect={(day) => {
								if (!day) return;
								onChange(clampToMin(withTime(day, hours, minutes), min));
							}}
							disabled={minDay ? { before: minDay } : undefined}
						/>
						<div className="flex items-center gap-2 border-border border-t pt-3">
							<span className="me-auto text-muted-foreground text-xs">
								Time
							</span>
							<Select
								value={String(hours)}
								onValueChange={(next) => setTime(Number(next), minutes)}
							>
								<SelectTrigger className="w-20" aria-label="Hour">
									<SelectValue>{pad(hours)}</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{HOURS.map((hour) => (
										<SelectItem key={hour} value={String(hour)}>
											{pad(hour)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<span aria-hidden>:</span>
							<Select
								value={String(minutes)}
								onValueChange={(next) => setTime(hours, Number(next))}
							>
								<SelectTrigger className="w-20" aria-label="Minute">
									<SelectValue>{pad(minutes)}</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{MINUTES.map((minute) => (
										<SelectItem key={minute} value={String(minute)}>
											{pad(minute)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<Button type="button" size="sm" onClick={() => setOpen(false)}>
							Done
						</Button>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
