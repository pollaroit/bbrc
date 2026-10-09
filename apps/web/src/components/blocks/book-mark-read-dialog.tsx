"use client";

import type { ReadDatePart } from "@bbrc/schemas/read-dates";
import { openLibraryEditionPageUrl } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@bbrc/ui/components/input-group";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { Spinner } from "@bbrc/ui/components/spinner";
import { ToggleGroup, ToggleGroupItem } from "@bbrc/ui/components/toggle-group";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { bookCoverUrl } from "@/lib/book-cover";
import {
	READ_DATE_MONTH_UNSET,
	READ_DATE_MONTHS,
	readDateMonthLabel,
} from "@/lib/read-date-months";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

type EditionLanguage = "any" | "eng" | "tur" | "aze" | "rus";

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
	const [search, setSearch] = useState("");
	const [language, setLanguage] = useState<EditionLanguage>("any");
	const [editionId, setEditionId] = useState<string | null>(null);
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
		setEditionId(stateQuery.data.editionId);
	}, [open, stateQuery.data]);

	useEffect(() => {
		if (!open) {
			setSearch("");
			setLanguage("any");
		}
	}, [open]);

	const editionsQuery = useQuery({
		...orpc.read.searchEditions.queryOptions({
			input: {
				bookSlug,
				query: search.trim() || undefined,
				language: language === "any" ? undefined : language,
				limit: 5,
			},
		}),
		enabled: open,
	});

	const saveMutation = useMutation(
		orpc.read.setRead.mutationOptions({
			onSuccess: async () => {
				toast.success("Saved your read");
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: orpc.read.getBookReadState.key({ input: { bookSlug } }),
					}),
					queryClient.invalidateQueries({
						queryKey: orpc.read.listForBook.key({ input: { bookSlug } }),
					}),
				]);
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
				await queryClient.invalidateQueries({
					queryKey: orpc.read.getBookReadState.key({ input: { bookSlug } }),
				});
				onOpenChange(false);
			},
			onError: (error) => {
				toast.error(error.message || "Could not remove read");
			},
		}),
	);

	const editions = editionsQuery.data?.items ?? [];
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
			editionId,
		});
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg">
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

					<Field>
						<FieldLabel>Edition (optional)</FieldLabel>
						<FieldDescription>
							Pick the copy you read from Open Library.
						</FieldDescription>
						<ToggleGroup
							value={[language]}
							onValueChange={(value) => {
								const next = value[0];
								if (next) {
									setLanguage(next as EditionLanguage);
								}
							}}
							variant="outline"
							size="sm"
							className="flex flex-wrap justify-start"
						>
							<ToggleGroupItem value="any">Any</ToggleGroupItem>
							<ToggleGroupItem value="eng">English</ToggleGroupItem>
							<ToggleGroupItem value="aze">Azerbaijani</ToggleGroupItem>
							<ToggleGroupItem value="tur">Turkish</ToggleGroupItem>
							<ToggleGroupItem value="rus">Russian</ToggleGroupItem>
						</ToggleGroup>
						<InputGroup className="mt-3">
							<InputGroupInput
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Search editions"
								aria-label="Search editions"
							/>
							<InputGroupAddon align="inline-end">
								<Search />
							</InputGroupAddon>
						</InputGroup>
						<div className="mt-3 flex flex-col gap-2">
							{editionsQuery.isPending ? (
								<div className="flex items-center gap-2 text-muted-foreground text-sm">
									<Spinner />
									Loading editions…
								</div>
							) : editions.length === 0 ? (
								<p className="text-muted-foreground text-sm">
									No editions matched. Try another language or search term.
								</p>
							) : (
								editions.map((edition) => {
									const selected = editionId === edition.editionId;
									const coverSrc = bookCoverUrl(edition.coverId, "S");
									const olUrl = openLibraryEditionPageUrl(edition.editionId);

									return (
										<button
											key={edition.editionId}
											type="button"
											onClick={() =>
												setEditionId(selected ? null : edition.editionId)
											}
											className={cn(
												"flex w-full items-start gap-3 border p-2 text-left transition-colors",
												selected
													? "border-foreground bg-muted/50"
													: "border-border hover:bg-muted/30",
											)}
										>
											<div className="relative size-14 shrink-0 bg-muted">
												{coverSrc ? (
													<Image
														src={coverSrc}
														alt=""
														fill
														className="object-cover"
														sizes="56px"
													/>
												) : null}
											</div>
											<div className="min-w-0 flex-1">
												<p className="font-medium text-sm leading-snug">
													{edition.title}
												</p>
												<p className="text-muted-foreground text-xs">
													{[
														edition.publishDate,
														edition.pages ? `${edition.pages} pp.` : null,
														edition.editionId,
													]
														.filter(Boolean)
														.join(" · ")}
												</p>
												{olUrl ? (
													<p className="text-muted-foreground text-xs">
														{edition.editionId}
													</p>
												) : null}
											</div>
										</button>
									);
								})
							)}
						</div>
					</Field>
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
