"use client";

import { bookCountrySelectOptions } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Input } from "@bbrc/ui/components/input";
import { Globe, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { CircleFlag } from "react-circle-flags";
import { cn } from "@/lib/utils";

type CountryOption = (typeof bookCountrySelectOptions)[number];

type CountryDropdownProps = {
	disabled?: boolean;
	placeholder?: string;
	excludeAlpha2?: readonly string[];
	onSelect: (country: CountryOption) => void;
};

function CountryFlag({ alpha2 }: { alpha2: string }) {
	return (
		<span className="inline-flex size-5 shrink-0 overflow-hidden ring-1 ring-border">
			<CircleFlag countryCode={alpha2.toLowerCase()} height={20} />
		</span>
	);
}

function filterCountries(
	options: CountryOption[],
	query: string,
): CountryOption[] {
	const normalized = query.trim().toLowerCase();
	if (!normalized) {
		return options;
	}

	return options.filter(
		(option) =>
			option.name.toLowerCase().includes(normalized) ||
			option.alpha2.toLowerCase().includes(normalized),
	);
}

export function CountryDropdown({
	disabled = false,
	placeholder = "Add country…",
	excludeAlpha2 = [],
	onSelect,
}: CountryDropdownProps) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");

	const exclude = useMemo(() => new Set(excludeAlpha2), [excludeAlpha2]);

	const options = useMemo(
		() => bookCountrySelectOptions.filter((row) => !exclude.has(row.alpha2)),
		[exclude],
	);

	const filtered = useMemo(
		() => filterCountries(options, search),
		[options, search],
	);

	const pickCountry = (option: CountryOption) => {
		onSelect(option);
		setSearch("");
		setOpen(false);
	};

	if (!open) {
		return (
			<Button
				type="button"
				variant="outline"
				disabled={disabled}
				className="w-full justify-start gap-2 font-normal sm:max-w-md"
				onClick={() => setOpen(true)}
			>
				<Globe className="size-4 shrink-0 text-muted-foreground" aria-hidden />
				<span className="text-muted-foreground">{placeholder}</span>
			</Button>
		);
	}

	return (
		<div className="flex max-w-md flex-col gap-2">
			<div className="relative">
				<Search
					className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
					aria-hidden
				/>
				<Input
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder="Search country…"
					className="h-8 ps-7 text-sm"
					autoComplete="off"
					autoFocus
				/>
			</div>
			<div className="max-h-48 overflow-y-auto border border-border">
				{filtered.length === 0 ? (
					<p className="px-2 py-2 text-muted-foreground text-xs">
						No country found.
					</p>
				) : (
					<ul>
						{filtered.map((option) => (
							<li
								key={option.alpha2}
								className="border-border border-b last:border-b-0"
							>
								<button
									type="button"
									className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/40"
									onClick={() => pickCountry(option)}
								>
									<CountryFlag alpha2={option.alpha2} />
									<span className="min-w-0 flex-1 truncate">{option.name}</span>
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="w-fit px-2"
				onClick={() => {
					setOpen(false);
					setSearch("");
				}}
			>
				Cancel
			</Button>
		</div>
	);
}

export function CountryLabel({
	alpha2,
	name,
	className,
}: {
	alpha2: string;
	name: string;
	className?: string;
}) {
	return (
		<span className={cn("inline-flex items-center gap-2", className)}>
			<CountryFlag alpha2={alpha2} />
			<span>{name}</span>
		</span>
	);
}
