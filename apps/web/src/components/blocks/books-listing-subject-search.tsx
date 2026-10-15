"use client";

import { Badge } from "@bbrc/ui/components/badge";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@bbrc/ui/components/input-group";
import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { SubjectMatchMode } from "@/lib/listing/books-listing";
import {
	commitPendingSubjectTag,
	reconcileSubjectTagInput,
	subjectSlugToLabel,
} from "@/lib/listing/subject-search";
import { cn } from "@/lib/utils";

type BooksListingSubjectSearchProps = {
	search: string | null;
	subjects: string[];
	subjectsMatch: SubjectMatchMode | null;
	onSearchChange: (search: string | null) => void;
	onSubjectsChange: (subjects: string[] | null) => void;
	onSubjectsMatchChange: (mode: SubjectMatchMode | null) => void;
};

export function BooksListingSubjectSearch({
	search,
	subjects,
	subjectsMatch,
	onSearchChange,
	onSubjectsChange,
	onSubjectsMatchChange,
}: BooksListingSubjectSearchProps) {
	const [inputValue, setInputValue] = useState(search ?? "");
	const skipSyncRef = useRef(false);

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

	return (
		<InputGroup
			className={cn(
				"relative min-w-0 flex-1 items-center gap-1 pl-8",
				hasInlineChips ? "min-h-8 flex-wrap py-0.5" : "h-8 flex-nowrap",
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
						className="cursor-pointer rounded-none p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						aria-label={`Remove subject ${subjectSlugToLabel(slug)}`}
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
				<fieldset
					className="flex h-6 shrink-0 border border-border p-0 text-xs"
					aria-label="Subject filter match"
				>
					<button
						type="button"
						className={cn(
							"cursor-pointer px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
							matchMode === "any" && "bg-muted font-medium text-foreground",
						)}
						onClick={() => onSubjectsMatchChange("any")}
					>
						Any
					</button>
					<button
						type="button"
						className={cn(
							"cursor-pointer border-border border-l px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
							matchMode === "all" && "bg-muted font-medium text-foreground",
						)}
						onClick={() => onSubjectsMatchChange("all")}
					>
						All
					</button>
				</fieldset>
			) : null}

			<InputGroupInput
				type="search"
				value={inputValue}
				placeholder="Search by title… Type #subject then space"
				className={cn(
					"min-w-[6rem] flex-1 border-0 bg-transparent py-0 pl-1 shadow-none focus-visible:ring-0",
					hasInlineChips ? "h-6 self-center" : "h-8",
				)}
				onChange={(event) => handleChange(event.target.value)}
				onKeyDown={handleKeyDown}
			/>
		</InputGroup>
	);
}
