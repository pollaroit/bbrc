"use client";

import { Button } from "@bbrc/ui/components/button";
import { Calendar } from "@bbrc/ui/components/calendar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useCalendarLocale } from "@/lib/i18n/use-calendar-locale";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { cn } from "@/lib/utils";

type View = "days" | "months" | "years";

type ProfileBirthDatePickerProps = {
	value: Date | undefined;
	onSelect: (day: Date) => void;
	/** Local dates; the first and last selectable day. */
	earliest: Date;
	latest: Date;
};

const monthIndex = (date: Date) => date.getFullYear() * 12 + date.getMonth();

/**
 * Calendar whose month/year headers switch to inline panels. Everything stays
 * inside the popover, so there are no nested portals to fight over stacking.
 */
export function ProfileBirthDatePicker({
	value,
	onSelect,
	earliest,
	latest,
}: ProfileBirthDatePickerProps) {
	const t = useTranslations("settings.profileForm");
	const f = useFormatters();
	const calendarLocale = useCalendarLocale();
	const monthNames = Array.from({ length: 12 }, (_, index) =>
		f.dateWith(new Date(2000, index, 1), { month: "short" }),
	);
	const [view, setView] = useState<View>("days");
	const [month, setMonth] = useState(() => value ?? latest);
	const selectedYearRef = useRef<HTMLButtonElement>(null);

	const minMonth = monthIndex(earliest);
	const maxMonth = monthIndex(latest);

	function goToMonth(next: Date) {
		const clamped = Math.min(maxMonth, Math.max(minMonth, monthIndex(next)));
		setMonth(new Date(Math.floor(clamped / 12), clamped % 12, 1));
	}

	useEffect(() => {
		if (view === "years") {
			selectedYearRef.current?.scrollIntoView({ block: "center" });
		}
	}, [view]);

	const years: number[] = [];
	for (
		let year = latest.getFullYear();
		year >= earliest.getFullYear();
		year--
	) {
		years.push(year);
	}

	const headerButtonClass = "px-2 font-medium";

	return (
		<div className="w-[15rem] p-2">
			<div className="flex items-center justify-between gap-1 pb-2">
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					aria-label={t("previousMonth")}
					disabled={view !== "days" || monthIndex(month) <= minMonth}
					onClick={() =>
						goToMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
					}
				>
					<ChevronLeft />
				</Button>
				<div className="flex items-center gap-1">
					<Button
						type="button"
						variant={view === "months" ? "secondary" : "ghost"}
						size="sm"
						className={headerButtonClass}
						aria-expanded={view === "months"}
						onClick={() => setView(view === "months" ? "days" : "months")}
					>
						{monthNames[month.getMonth()]}
					</Button>
					<Button
						type="button"
						variant={view === "years" ? "secondary" : "ghost"}
						size="sm"
						className={cn(headerButtonClass, "tabular-nums")}
						aria-expanded={view === "years"}
						onClick={() => setView(view === "years" ? "days" : "years")}
					>
						{month.getFullYear()}
					</Button>
				</div>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					aria-label={t("nextMonth")}
					disabled={view !== "days" || monthIndex(month) >= maxMonth}
					onClick={() =>
						goToMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
					}
				>
					<ChevronRight />
				</Button>
			</div>

			{view === "days" ? (
				<Calendar
					mode="single"
					locale={calendarLocale}
					className="p-0 [--cell-size:--spacing(8)]"
					selected={value}
					month={month}
					onMonthChange={goToMonth}
					hideNavigation
					classNames={{
						month_caption: "hidden",
						month: "flex w-full flex-col",
					}}
					startMonth={earliest}
					endMonth={latest}
					disabled={{ before: earliest, after: latest }}
					onSelect={(day) => {
						if (day) onSelect(day);
					}}
				/>
			) : null}

			{view === "months" ? (
				<div className="grid grid-cols-3 gap-1">
					{monthNames.map((name, index) => {
						const idx = month.getFullYear() * 12 + index;
						return (
							<Button
								key={name}
								type="button"
								variant={index === month.getMonth() ? "default" : "ghost"}
								size="sm"
								disabled={idx < minMonth || idx > maxMonth}
								onClick={() => {
									goToMonth(new Date(month.getFullYear(), index, 1));
									setView("days");
								}}
							>
								{name}
							</Button>
						);
					})}
				</div>
			) : null}

			{view === "years" ? (
				<div className="grid max-h-56 grid-cols-4 gap-1 overflow-y-auto">
					{years.map((year) => {
						const selected = year === month.getFullYear();
						return (
							<Button
								key={year}
								ref={selected ? selectedYearRef : undefined}
								type="button"
								variant={selected ? "default" : "ghost"}
								size="sm"
								className="tabular-nums"
								onClick={() => {
									goToMonth(new Date(year, month.getMonth(), 1));
									setView("months");
								}}
							>
								{year}
							</Button>
						);
					})}
				</div>
			) : null}
		</div>
	);
}
