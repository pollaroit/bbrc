"use client";

import { Badge } from "@bbrc/ui/components/badge";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@bbrc/ui/components/input-group";
import { ToggleGroup, ToggleGroupItem } from "@bbrc/ui/components/toggle-group";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useImperativeHandle, useRef, useState } from "react";
import type { SubjectMatchMode } from "@/lib/listing/books-listing";
import {
	commitPendingSubjectTag,
	reconcileSubjectTagInput,
	subjectSlugToLabel,
} from "@/lib/listing/subject-search";
import { cn } from "@/lib/utils";

export type BooksListingSubjectSearchHandle = {
	focusSearch: () => void;
};

type BooksListingSubjectSearchProps = {
	search: string | null;
	subjects: string[];
	subjectsMatch: SubjectMatchMode | null;
	onSearchChange: (search: string | null) => void;
	onSubjectsChange: (subjects: string[] | null) => void;
	onSubjectsMatchChange: (mode: SubjectMatchMode | null) => void;
	className?: string;
	inputClassName?: string;
	ref?: React.Ref<BooksListingSubjectSearchHandle>;
};

export function BooksListingSubjectSearch({
	search,
	subjects,
	subjectsMatch,
	onSearchChange,
	onSubjectsChange,
	onSubjectsMatchChange,
	className,
	inputClassName,
	ref,
}: BooksListingSubjectSearchProps) {
	const t = useTranslations("books");
	const [inputValue, setInputValue] = useState(search ?? "");
	const skipSyncRef = useRef(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const [compactPlaceholder, setCompactPlaceholder] = useState(false);

	useEffect(() => {
		const media = window.matchMedia("(max-width: 639px)");
		const update = () => setCompactPlaceholder(media.matches);
		update();
		media.addEventListener("change", update);
		return () => media.removeEventListener("change", update);
	}, []);

	useImperativeHandle(ref, () => ({
		focusSearch: () => {
			rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
			inputRef.current?.focus({ preventScroll: true });
		},
	}));

	useEffect(() => {
		if (skipSyncRef.current) {
			skipSyncRef.current = false;
			return;
		}
		setInputValue(search ?? "");
	}, [search]);

	const removeLastSubject = () => {
		if (subjects.length === 0) {
			return;
		}
		const next = subjects.slice(0, -1);
		onSubjectsChange(next.length > 0 ? next : null);
	};

	const applyCommittedSlugs = (
		committedSlugs: string[],
		displayValue: string,
	) => {
		if (committedSlugs.length > 0) {
			const merged = [...new Set([...subjects, ...committedSlugs])];
			onSubjectsChange(merged);
		}
		const normalized = displayValue.trim();
		skipSyncRef.current = true;
		setInputValue(displayValue);
		onSearchChange(normalized === "" ? null : normalized);
	};

	const handleChange = (next: string) => {
		const { displayValue, committedSlugs } = reconcileSubjectTagInput(next);
		if (committedSlugs.length > 0) {
			applyCommittedSlugs(committedSlugs, displayValue);
			return;
		}
		setInputValue(next);
		if (!/(?:^|\s)#[a-zA-Z0-9_-]*$/.test(next)) {
			onSearchChange(next.trim() === "" ? null : next);
		}
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		const input = event.currentTarget;
		const caretAtStart = input.selectionStart === 0 && input.selectionEnd === 0;
		const isEmpty = inputValue.length === 0;

		if (
			(event.key === "Backspace" || event.key === "Delete") &&
			subjects.length > 0 &&
			isEmpty &&
			caretAtStart
		) {
			event.preventDefault();
			removeLastSubject();
			return;
		}

		if (event.key !== "Enter") {
			return;
		}
		const { displayValue, committedSlugs } =
			commitPendingSubjectTag(inputValue);
		if (committedSlugs.length === 0) {
			return;
		}
		event.preventDefault();
		applyCommittedSlugs(committedSlugs, displayValue);
	};

	const matchMode: SubjectMatchMode = subjectsMatch ?? "any";
	const hasInlineChips = subjects.length > 0;
	const searchPlaceholder = compactPlaceholder
		? t("search.placeholderCompact")
		: t("search.placeholder");

	return (
		<div
			ref={rootRef}
			className={cn(
				"min-w-0 flex-1 scroll-mt-[calc(3.5rem+max(0.25rem,env(safe-area-inset-top)))] md:scroll-mt-20",
				className,
			)}
		>
			<InputGroup
				className={cn(
					"relative min-w-0 flex-1 items-center gap-1 border-border bg-background pl-8",
					hasInlineChips ? "min-h-9 flex-wrap py-1" : "h-10 flex-nowrap",
				)}
			>
				<InputGroupAddon
					align="inline-start"
					className="absolute inset-y-0 left-0 z-10 flex w-8 items-center pl-2"
				>
					<Search className="pointer-events-none size-4 text-muted-foreground" />
				</InputGroupAddon>

				{subjects.map((slug) => (
					<Badge
						key={slug}
						variant="secondary"
						className="h-6 shrink-0 gap-0.5 pr-0.5 pl-1.5 font-normal"
					>
						<span className="max-w-[10rem] truncate">
							#{subjectSlugToLabel(slug)}
						</span>
						<button
							type="button"
							className="cursor-pointer p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							aria-label={t("search.removeSubject", {
								subject: subjectSlugToLabel(slug),
							})}
							onClick={() => {
								const next = subjects.filter((value) => value !== slug);
								onSubjectsChange(next.length > 0 ? next : null);
							}}
						>
							<X className="size-3.5" aria-hidden />
						</button>
					</Badge>
				))}

				{subjects.length >= 2 ? (
					<ToggleGroup
						value={[matchMode]}
						onValueChange={(values) => {
							const next = values[0];
							if (next === "any" || next === "all") {
								onSubjectsMatchChange(next);
							}
						}}
						variant="outline"
						size="sm"
						spacing={0}
						className="h-6 shrink-0"
						aria-label={t("search.matchAria")}
					>
						<ToggleGroupItem value="any" className="h-6 px-2 text-xs">
							{t("search.any")}
						</ToggleGroupItem>
						<ToggleGroupItem value="all" className="h-6 px-2 text-xs">
							{t("search.all")}
						</ToggleGroupItem>
					</ToggleGroup>
				) : null}

				<InputGroupInput
					ref={inputRef}
					type="search"
					value={inputValue}
					placeholder={searchPlaceholder}
					className={cn(
						"min-w-[4rem] flex-1 border-0 bg-transparent py-0 pl-1 text-sm shadow-none focus-visible:ring-0",
						hasInlineChips ? "h-7 self-center" : "h-10",
						inputClassName,
					)}
					onChange={(event) => handleChange(event.target.value)}
					onKeyDown={handleKeyDown}
				/>
			</InputGroup>
		</div>
	);
}
