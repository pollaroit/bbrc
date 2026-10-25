"use client";

/**
 * "Which edition are you reading?" — an optional step of starting a book.
 *
 * <ReadingEditionPicker
 *   bookSlug, bookPages   the book (its page count is the fallback)
 *   value, onChange       a `ReadingEditionChoice`, controlled by the parent
 * />
 *
 * Editions come from two places in one list: Open Library, and the editions
 * members added themselves (marked "Member-added", or "Verified" once an admin
 * checked it). Picking one fills the page count from the edition when it has
 * one. The page count can always be typed by hand, and a missing edition can be
 * added on the spot (`AddEditionDialog`), which then selects it.
 */

import type { BookEditionItem } from "@bbrc/api/modules/book-edition/book-edition.schema";
import { Button } from "@bbrc/ui/components/button";
import { Input } from "@bbrc/ui/components/input";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
	BadgeCheck,
	BookCopy,
	Check,
	FileText,
	Plus,
	Search,
	X,
} from "lucide-react";
import Image from "next/image";
import { useId, useMemo, useState } from "react";
import { AddEditionDialog } from "@/components/blocks/book-editions/add-edition-dialog";
import { SegmentedControl } from "@/components/blocks/segmented-control";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { bookCoverFrameClassName, bookCoverUrl } from "@/lib/book-cover";
import {
	editionLabelFromParts,
	languageLabel,
	memberEditionLabel,
} from "@/lib/book-edition/edition-meta";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export type ReadingEditionChoice = {
	editionOlid: string | null;
	editionCoverId: number | null;
	editionLabel: string | null;
	bookEditionId: string | null;
	totalPages: number | null;
};

export const EMPTY_EDITION_CHOICE: ReadingEditionChoice = {
	editionOlid: null,
	editionCoverId: null,
	editionLabel: null,
	bookEditionId: null,
	totalPages: null,
};

/** "A specific edition" or "Just the pages" (a PDF, an ebook, any copy). */
export type ReadingEditionMode = "edition" | "pages";

type Props = {
	bookSlug: string;
	bookPages: number;
	value: ReadingEditionChoice;
	onChange: (next: ReadingEditionChoice) => void;
	className?: string;
	/** Controlled mode; leave both out and the picker keeps it itself. */
	mode?: ReadingEditionMode;
	onModeChange?: (mode: ReadingEditionMode) => void;
};

const LANGUAGES = [
	{ id: "any", label: "Any" },
	{ id: "eng", label: "English" },
	{ id: "tur", label: "Turkish" },
	{ id: "rus", label: "Russian" },
	{ id: "aze", label: "Azerbaijani" },
] as const;
type LanguageId = (typeof LANGUAGES)[number]["id"];

type Row = {
	key: string;
	kind: "open_library" | "member";
	verified: boolean;
	title: string;
	meta: string;
	pages: number | null;
	coverId: number | null;
	coverUrl: string | null;
	choice: Omit<ReadingEditionChoice, "totalPages">;
};

function Cover({ row }: { row: Row }) {
	const src = row.coverUrl ?? bookCoverUrl(row.coverId, "S");
	return (
		<span
			className={cn(
				"relative block aspect-2/3 w-10 shrink-0",
				bookCoverFrameClassName,
			)}
		>
			{src ? (
				<Image src={src} alt="" fill className="object-cover" sizes="40px" />
			) : null}
		</span>
	);
}

export function ReadingEditionPicker({
	bookSlug,
	bookPages,
	value,
	onChange,
	className,
	mode: controlledMode,
	onModeChange,
}: Props) {
	const uid = useId();
	const [ownMode, setOwnMode] = useState<ReadingEditionMode>("edition");
	const mode = controlledMode ?? ownMode;

	function changeMode(next: ReadingEditionMode) {
		if (next === mode) return;
		if (controlledMode === undefined) setOwnMode(next);
		onModeChange?.(next);
		if (next === "pages") {
			// No edition: keep the pages (or start from the book's) and drop the rest.
			onChange({
				...EMPTY_EDITION_CHOICE,
				totalPages: value.totalPages ?? (bookPages > 0 ? bookPages : null),
			});
		}
	}
	const [search, setSearch] = useState("");
	const [language, setLanguage] = useState<LanguageId>("any");
	const [addOpen, setAddOpen] = useState(false);
	const debounced = useDebouncedValue(search.trim(), 350);

	const member = useQuery({
		...orpc.bookEdition.list.queryOptions({ input: { bookSlug } }),
		staleTime: 60_000,
	});
	const openLibrary = useQuery({
		...orpc.read.searchEditions.queryOptions({
			input: {
				bookSlug,
				query: debounced || undefined,
				language: language === "any" ? undefined : language,
				limit: 8,
			},
		}),
		staleTime: 60_000,
		placeholderData: keepPreviousData,
	});

	const rows = useMemo<Row[]>(() => {
		const needle = debounced.toLowerCase();
		const memberRows: Row[] = (member.data?.items ?? [])
			.filter((edition) => language === "any" || edition.language === language)
			.filter((edition) =>
				needle === ""
					? true
					: [
							edition.title,
							edition.publisher,
							edition.isbn13,
							edition.isbn10,
							edition.translator,
						]
							.filter(Boolean)
							.some((part) => String(part).toLowerCase().includes(needle)),
			)
			.map((edition) => ({
				key: `m-${edition.id}`,
				kind: "member" as const,
				verified: edition.status === "verified",
				title: edition.title ?? "Member-added edition",
				meta: [
					edition.publisher,
					edition.publishedYear,
					languageLabel(edition.language),
					`${edition.pages} pages`,
				]
					.filter(Boolean)
					.join(" · "),
				pages: edition.pages,
				coverId: null,
				coverUrl: edition.coverUrl,
				choice: {
					editionOlid: null,
					editionCoverId: null,
					editionLabel: memberEditionLabel(edition),
					bookEditionId: edition.id,
				},
			}));
		const olRows: Row[] = (openLibrary.data?.items ?? []).map((edition) => ({
			key: `o-${edition.editionId}`,
			kind: "open_library" as const,
			verified: false,
			title: edition.title,
			meta: [
				edition.publishers[0],
				edition.publishDate,
				edition.languages[0],
				edition.pages ? `${edition.pages} pages` : null,
			]
				.filter(Boolean)
				.join(" · "),
			pages: edition.pages,
			coverId: edition.coverId,
			coverUrl: null,
			choice: {
				editionOlid: edition.editionId,
				editionCoverId: edition.coverId,
				editionLabel: editionLabelFromParts({
					publisher: edition.publishers[0],
					year: edition.publishDate?.match(/\b\d{4}\b/)?.[0],
					language: edition.languages[0],
				}),
				bookEditionId: null,
			},
		}));
		return [...memberRows, ...olRows];
	}, [debounced, language, member.data?.items, openLibrary.data?.items]);

	const selectedKey = value.bookEditionId
		? `m-${value.bookEditionId}`
		: value.editionOlid
			? `o-${value.editionOlid}`
			: null;
	const loading =
		(openLibrary.isPending && !openLibrary.data) || member.isPending;

	function pick(row: Row) {
		onChange({ ...row.choice, totalPages: row.pages ?? value.totalPages });
	}

	function onCreated(edition: BookEditionItem) {
		onChange({
			editionOlid: null,
			editionCoverId: null,
			editionLabel: memberEditionLabel(edition),
			bookEditionId: edition.id,
			totalPages: edition.pages,
		});
	}

	const pagesText = value.totalPages == null ? "" : String(value.totalPages);

	return (
		<div className={cn("flex flex-col gap-4", className)}>
			<div className="flex flex-col gap-2">
				<SegmentedControl<ReadingEditionMode>
					label="How are you reading it?"
					value={mode}
					onChange={changeMode}
					className="w-full [&>button]:flex-1 [&>button]:justify-center"
					options={[
						{ id: "edition", label: "A specific edition" },
						{ id: "pages", label: "Just the pages" },
					]}
				/>
				<p className="flex items-start gap-2 text-muted-foreground text-xs leading-relaxed">
					{mode === "edition" ? (
						<>
							<BookCopy className="mt-0.5 size-3.5 shrink-0" aria-hidden />
							Pick the edition you have so the pages match your copy. You can
							skip the list and just enter the pages.
						</>
					) : (
						<>
							<FileText className="mt-0.5 size-3.5 shrink-0" aria-hidden />
							Reading a PDF, an ebook or any other copy? No edition needed. Just
							tell us how many pages it has.
						</>
					)}
				</p>
			</div>

			{mode === "edition" ? (
				<>
					<div className="flex flex-col gap-2">
						<div className="relative">
							<Search
								className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
								aria-hidden
							/>
							<Input
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Search publisher, year or ISBN…"
								aria-label="Search editions"
								autoComplete="off"
								className="ps-9"
							/>
						</div>
						<fieldset className="m-0 flex min-w-0 flex-wrap gap-1.5 border-0 p-0">
							<legend className="sr-only">Language</legend>
							{LANGUAGES.map((option) => (
								<button
									key={option.id}
									type="button"
									aria-pressed={language === option.id}
									onClick={() => setLanguage(option.id)}
									className={cn(
										"border px-2.5 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-ring",
										language === option.id
											? "border-foreground bg-foreground text-background"
											: "border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground",
									)}
								>
									{option.label}
								</button>
							))}
						</fieldset>
					</div>

					<ul
						className="flex max-h-72 flex-col divide-y divide-border overflow-y-auto border border-border"
						aria-label="Editions"
					>
						{loading ? (
							Array.from({ length: 4 }, (_, index) => (
								<li key={index} className="p-3">
									<Skeleton className="h-14 w-full" aria-hidden />
								</li>
							))
						) : rows.length === 0 ? (
							<li className="p-4 text-muted-foreground text-sm">
								No editions match. Type your page count below, or add your
								edition.
							</li>
						) : (
							rows.map((row) => {
								const selected = row.key === selectedKey;
								return (
									<li key={row.key}>
										<button
											type="button"
											aria-pressed={selected}
											onClick={() => (selected ? undefined : pick(row))}
											className={cn(
												"flex w-full items-center gap-3 p-2.5 text-start transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2",
												selected ? "bg-muted/60" : "hover:bg-muted/30",
											)}
										>
											<Cover row={row} />
											<span className="flex min-w-0 flex-1 flex-col gap-0.5">
												<span className="flex items-center gap-1.5">
													<span className="truncate font-medium text-sm">
														{row.title}
													</span>
												</span>
												<span className="truncate text-muted-foreground text-xs">
													{row.meta || "No details"}
												</span>
												<span className="flex items-center gap-1.5 text-3xs text-muted-foreground">
													{row.kind === "open_library" ? (
														<span>Open Library</span>
													) : row.verified ? (
														<span className="inline-flex items-center gap-0.5 text-success-ink">
															<BadgeCheck className="size-3" aria-hidden />
															Verified
														</span>
													) : (
														<span>Member-added</span>
													)}
												</span>
											</span>
											{selected ? (
												<Check
													className="size-4 shrink-0 text-foreground"
													aria-hidden
												/>
											) : null}
										</button>
									</li>
								);
							})
						)}
					</ul>

					<div className="flex flex-wrap items-center justify-between gap-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="-ms-2"
							onClick={() => setAddOpen(true)}
						>
							<Plus data-icon="inline-start" aria-hidden />
							My edition isn't listed
						</Button>
						{selectedKey ? (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="text-muted-foreground"
								onClick={() =>
									onChange({
										...EMPTY_EDITION_CHOICE,
										totalPages: value.totalPages,
									})
								}
							>
								<X data-icon="inline-start" aria-hidden />
								Clear edition
							</Button>
						) : null}
					</div>
				</>
			) : null}

			<div
				className={cn(
					"flex flex-col gap-1.5",
					mode === "edition" && "border-border border-t pt-4",
				)}
			>
				<label htmlFor={`${uid}-pages`} className="font-medium text-sm">
					Pages in your copy
				</label>
				<Input
					id={`${uid}-pages`}
					type="number"
					min={1}
					max={20000}
					inputMode="numeric"
					value={pagesText}
					placeholder={bookPages > 0 ? String(bookPages) : "e.g. 320"}
					onChange={(event) => {
						const parsed = Number.parseInt(event.target.value, 10);
						onChange({
							...value,
							totalPages: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
						});
					}}
					className={mode === "pages" ? "h-11 max-w-48 text-base" : "max-w-40"}
				/>
				<p className="text-muted-foreground text-xs">
					{mode === "pages"
						? value.totalPages != null
							? `You will see "Own copy · ${value.totalPages} pages". Clear it to track by percentage instead.`
							: "No page count: your progress is tracked as a percentage."
						: value.totalPages != null && selectedKey
							? "Filled in from the edition. Change it if your copy differs."
							: bookPages > 0
								? `Leave it empty to count ${bookPages} pages, or track by percentage if you do not know.`
								: "Leave it empty to track by percentage."}
				</p>
			</div>

			<AddEditionDialog
				bookSlug={bookSlug}
				bookTitle=""
				open={addOpen}
				onOpenChange={setAddOpen}
				onCreated={onCreated}
				onDuplicate={(editionId) => {
					const existing = member.data?.items.find(
						(item) => item.id === editionId,
					);
					if (existing) onCreated(existing);
				}}
			/>
		</div>
	);
}
