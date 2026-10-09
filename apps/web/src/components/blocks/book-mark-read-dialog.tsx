"use client";

import type { ReadDatePart } from "@bbrc/schemas/read-dates";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { Field, FieldGroup, FieldLabel } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { invalidateReadQueries } from "@/lib/invalidate-read-queries";
import {
	READ_DATE_MONTH_UNSET,
	READ_DATE_MONTHS,
	readDateMonthLabel,
} from "@/lib/read-date-months";
import { orpc } from "@/utils/orpc";

type BookMarkReadDialogProps = {
	bookSlug: string;
	bookTitle: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

function parseOptionalInt(value: string): number | undefined {
	const trimmed = value.trim();
	if (!trimmed) {
		return undefined;
	}
	const n = Number.parseInt(trimmed, 10);
	return Number.isFinite(n) ? n : undefined;
}

function buildDatePart(
	year: string,
	month: string,
	day: string,
): ReadDatePart | null {
	const y = parseOptionalInt(year);
	if (y == null) {
		return null;
	}
	const m = parseOptionalInt(month);
	const d = parseOptionalInt(day);
	if (m == null && d == null) {
		return { year: y };
	}
	if (m == null) {
		return null;
	}
	if (d == null) {
		return { year: y, month: m };
	}
	return { year: y, month: m, day: d };
}

function partToFields(part: ReadDatePart | null | undefined) {
	return {
		year: part?.year != null ? String(part.year) : "",
		month: part?.month != null ? String(part.month) : "",
		day: part?.day != null ? String(part.day) : "",
	};
}

export function BookMarkReadDialog({
	bookSlug,
	bookTitle,
	open,
	onOpenChange,
}: BookMarkReadDialogProps) {
	const [startYear, setStartYear] = useState("");
	const [startMonth, setStartMonth] = useState("");
	const [startDay, setStartDay] = useState("");
	const [endYear, setEndYear] = useState("");
	const [endMonth, setEndMonth] = useState("");
	const [endDay, setEndDay] = useState("");

	const stateQuery = useQuery({
		...orpc.read.getBookReadState.queryOptions({
			input: { bookSlug },
		}),
		enabled: open,
	});

	useEffect(() => {
		if (!open || !stateQuery.data) {
			return;
		}
		const start = partToFields(stateQuery.data.readStart);
		const end = partToFields(stateQuery.data.readEnd);
		setStartYear(start.year);
		setStartMonth(start.month);
		setStartDay(start.day);
		setEndYear(end.year);
		setEndMonth(end.month);
		setEndDay(end.day);
	}, [open, stateQuery.data]);

	const saveMutation = useMutation(
		orpc.read.setRead.mutationOptions({
			onSuccess: async () => {
				toast.success("Saved your read");
				await invalidateReadQueries(bookSlug);
				onOpenChange(false);
			},
			onError: (error) => {
				toast.error(error.message || "Could not save read");
			},
		}),
	);

	const removeMutation = useMutation(
		orpc.read.removeRead.mutationOptions({
			onSuccess: async () => {
				toast.success("Removed read");
				await invalidateReadQueries(bookSlug);
				onOpenChange(false);
			},
			onError: (error) => {
				toast.error(error.message || "Could not remove read");
			},
		}),
	);

	const hasRead = stateQuery.data?.hasRead ?? false;

	const readStart = useMemo(
		() => buildDatePart(startYear, startMonth, startDay),
		[startYear, startMonth, startDay],
	);
	const readEnd = useMemo(
		() => buildDatePart(endYear, endMonth, endDay),
		[endYear, endMonth, endDay],
	);

	function handleSave() {
		saveMutation.mutate({
			bookSlug,
			readStart: readStart ?? undefined,
			readEnd: readEnd ?? undefined,
		});
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Mark as read</DialogTitle>
					<DialogDescription>
						Record when you read {bookTitle}. Dates can be as precise as you
						remember.
					</DialogDescription>
				</DialogHeader>

				<FieldGroup>
					<FieldSetDates
						label="Started"
						year={startYear}
						month={startMonth}
						day={startDay}
						onYear={setStartYear}
						onMonth={setStartMonth}
						onDay={setStartDay}
					/>
					<FieldSetDates
						label="Finished"
						year={endYear}
						month={endMonth}
						day={endDay}
						onYear={setEndYear}
						onMonth={setEndMonth}
						onDay={setEndDay}
					/>
				</FieldGroup>

				<DialogFooter className="gap-2 sm:justify-between">
					{hasRead ? (
						<Button
							type="button"
							variant="ghost"
							disabled={removeMutation.isPending}
							onClick={() => removeMutation.mutate({ bookSlug })}
						>
							Remove read
						</Button>
					) : (
						<span />
					)}
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<LoadingButton
							type="button"
							loading={saveMutation.isPending}
							onClick={handleSave}
						>
							Save
						</LoadingButton>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

type FieldSetDatesProps = {
	label: string;
	year: string;
	month: string;
	day: string;
	onYear: (value: string) => void;
	onMonth: (value: string) => void;
	onDay: (value: string) => void;
};

function clampDigits(value: string, maxLength: number) {
	return value.replace(/\D/g, "").slice(0, maxLength);
}

function FieldSetDates({
	label,
	year,
	month,
	day,
	onYear,
	onMonth,
	onDay,
}: FieldSetDatesProps) {
	const monthValue = month.length > 0 ? month : READ_DATE_MONTH_UNSET;
	const monthDisplayLabel = readDateMonthLabel(month);

	return (
		<Field>
			<FieldLabel>{label}</FieldLabel>
			<div className="flex w-full gap-2">
				<Input
					type="number"
					inputMode="numeric"
					min={1000}
					max={2100}
					placeholder="Year"
					value={year}
					onChange={(event) => onYear(clampDigits(event.target.value, 4))}
					aria-label={`${label} year`}
					className="w-[5.5rem] shrink-0"
				/>
				<Select
					value={monthValue}
					onValueChange={(value) => {
						if (value == null) {
							return;
						}
						onMonth(value === READ_DATE_MONTH_UNSET ? "" : value);
					}}
				>
					<SelectTrigger
						className="min-w-0 flex-1"
						aria-label={`${label} month`}
					>
						<SelectValue placeholder="Month">
							{monthDisplayLabel ?? "Month"}
						</SelectValue>
					</SelectTrigger>
					<SelectContent alignItemWithTrigger={false}>
						<SelectGroup>
							<SelectItem value={READ_DATE_MONTH_UNSET}>Month</SelectItem>
							{READ_DATE_MONTHS.map((entry) => (
								<SelectItem key={entry.value} value={entry.value}>
									{entry.label}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
				<Input
					type="number"
					inputMode="numeric"
					min={1}
					max={31}
					placeholder="Day"
					value={day}
					onChange={(event) => onDay(clampDigits(event.target.value, 2))}
					aria-label={`${label} day`}
					className="w-[4.5rem] shrink-0"
				/>
			</div>
		</Field>
	);
}
