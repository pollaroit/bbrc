"use client";

import { parseBookLookup } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { Link2, Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef } from "react";
import { toast } from "sonner";
import type { OpenLibrarySearchWork } from "@/lib/open-library/types";
import { cn } from "@/lib/utils";
import { HotkeyChip } from "./book-flow-hotkeys-help";
import {
	type BookFlowMode,
	BookResultCard,
	isPickable,
	workStatus,
} from "./book-result-card";
import { IsbnScannerButton } from "./isbn-scanner";
import { useBookFlowHotkeys } from "./use-book-flow-hotkeys";
import type { BookQueue } from "./use-book-queue";
import type { BookSearch } from "./use-book-search";

/*
 * The "find a book" bar and its results, shared by add (admins) and request
 * (members).
 *
 * <BookFinder
 *   mode            "add" | "request" (decides which books can be picked)
 *   search          from `useBookSearch()` (owned by the page, so results survive the form)
 *   onPick(work)    a book was chosen (click, Enter, paste of a link or ISBN, or a scan)
 *   inCatalogOlids  work ids already in the library
 *   pendingByOlid   work id → name of the member who requested it
 *   blockedOlids    work ids on the block list
 *   queue           from `useBookQueue()`; shows the "Queue" toggle on results (add mode)
 *   hotkeysEnabled  false while the form is on screen (the page's form-stage keys take over)
 *   resultExtras    (work, status) → node shown under a result, e.g. a "me too" button
 *   idleContent     shown while nothing is typed (recent picks, the discover panel…)
 *   autoFocus       focus the box on mount
 * />
 *
 * Keys handled here while `hotkeysEnabled`: `/` focus, ↑ ↓ move, Enter picks, Esc
 * clears the box. The box and the list carry `data-book-flow-search` and
 * `data-book-flow-results` so the shortcut hook knows when arrows and Enter are
 * meant for them.
 */

type BookFinderProps = {
	mode: BookFlowMode;
	search: BookSearch;
	onPick: (work: OpenLibrarySearchWork) => void;
	inCatalogOlids: ReadonlySet<string>;
	pendingByOlid: ReadonlyMap<string, string>;
	blockedOlids?: ReadonlySet<string>;
	queue?: BookQueue;
	hotkeysEnabled?: boolean;
	resultExtras?: (
		work: OpenLibrarySearchWork,
		status: ReturnType<typeof workStatus>,
	) => React.ReactNode;
	idleContent?: React.ReactNode;
	autoFocus?: boolean;
	className?: string;
};

const LOOKUP_LABEL = {
	olid: "Open Library work",
	edition: "Open Library edition",
	isbn: "ISBN",
	goodreads: "Goodreads link",
} as const;

export function BookFinder({
	mode,
	search,
	onPick,
	inCatalogOlids,
	pendingByOlid,
	blockedOlids,
	queue,
	hotkeysEnabled = true,
	resultExtras,
	idleContent,
	autoFocus = false,
	className,
}: BookFinderProps) {
	const uid = useId();
	const listRef = useRef<HTMLUListElement>(null);
	const { works, activeIndex, query, lookup, isSearching, error } = search;

	const statusOf = useCallback(
		(work: OpenLibrarySearchWork) =>
			workStatus(work, { inCatalogOlids, pendingByOlid, blockedOlids }),
		[inCatalogOlids, pendingByOlid, blockedOlids],
	);

	const pick = useCallback(
		(work: OpenLibrarySearchWork) => {
			const status = statusOf(work);
			if (!isPickable(status, mode)) {
				toast.message(
					status.kind === "in_library"
						? "That book is already in the library."
						: status.kind === "blocked"
							? "That book is on the block list."
							: "That book has already been requested.",
				);
				return;
			}
			onPick(work);
		},
		[mode, onPick, statusOf],
	);

	const pickActive = useCallback(() => {
		const work = works[activeIndex];
		if (work) pick(work);
	}, [activeIndex, pick, works]);

	useBookFlowHotkeys(
		{
			focusSearch: () => search.inputRef.current?.focus(),
			moveDown: () => search.move(1),
			moveUp: () => search.move(-1),
			pick: pickActive,
			back: () => {
				if (search.query) {
					search.reset();
				} else {
					search.inputRef.current?.blur();
				}
			},
		},
		{ stage: "finder", enabled: hotkeysEnabled },
	);

	useEffect(() => {
		if (autoFocus) search.inputRef.current?.focus();
	}, [autoFocus, search.inputRef]);

	// Keep the highlighted card in view while moving with the keyboard.
	useEffect(() => {
		const element = listRef.current?.children[activeIndex];
		element?.scrollIntoView({ block: "nearest" });
	}, [activeIndex]);

	/** A link, id or ISBN opens its book straight away when it matches exactly one. */
	const jumpTo = useCallback(
		async (text: string) => {
			search.setQuery(text);
			try {
				const found = await search.resolveNow(text);
				const only = found.length === 1 ? found[0] : undefined;
				if (only) {
					pick(only);
				} else if (found.length === 0) {
					toast.message(
						"Open Library has no book for that. Try a title instead.",
					);
				}
			} catch (reason) {
				toast.error(
					reason instanceof Error ? reason.message : "Could not look that up.",
				);
			}
		},
		[pick, search],
	);

	const trimmed = query.trim();
	const showResults = trimmed.length >= 2 || lookup.kind !== "text";
	const direct = lookup.kind !== "text";
	const activeId = works[activeIndex]
		? `${uid}-result-${activeIndex}`
		: undefined;

	return (
		<div className={cn("flex flex-col gap-4", className)}>
			<div className="flex flex-col gap-2">
				<div className="flex gap-2">
					<div className="relative min-w-0 flex-1">
						<Search
							className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
							aria-hidden
						/>
						<input
							ref={search.inputRef}
							data-book-flow-search
							type="text"
							role="combobox"
							aria-expanded={showResults && works.length > 0}
							aria-controls={`${uid}-results`}
							aria-activedescendant={activeId}
							aria-autocomplete="list"
							aria-label="Search for a book by title or author, or paste a link or ISBN"
							autoComplete="off"
							autoCapitalize="off"
							spellCheck={false}
							enterKeyHint="search"
							value={query}
							placeholder="Title, author, ISBN or link…"
							onChange={(event) => search.setQuery(event.target.value)}
							onPaste={(event) => {
								const pasted = event.clipboardData.getData("text").trim();
								// Links, ids and ISBNs are looked up right away; plain text is just typed.
								if (pasted && parseBookLookup(pasted).kind !== "text") {
									event.preventDefault();
									void jumpTo(pasted);
								}
							}}
							className="h-11 w-full border border-input bg-background ps-10 pe-20 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 sm:text-sm"
						/>
						<div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1.5">
							{isSearching ? (
								<Loader2
									className="size-4 animate-spin text-muted-foreground"
									aria-label="Searching"
								/>
							) : null}
							{query ? (
								<Button
									type="button"
									variant="ghost"
									size="icon-xs"
									aria-label="Clear search"
									onClick={() => {
										search.reset();
										search.inputRef.current?.focus();
									}}
								>
									<X aria-hidden />
								</Button>
							) : (
								<HotkeyChip id="focusSearch" />
							)}
						</div>
					</div>
					<IsbnScannerButton onDetected={(isbn) => void jumpTo(isbn)} />
				</div>

				<p className="flex min-h-5 items-center gap-1.5 text-muted-foreground text-xs">
					{direct ? (
						<>
							<Link2 className="size-3.5 shrink-0" aria-hidden />
							Looking up this{" "}
							{LOOKUP_LABEL[lookup.kind as keyof typeof LOOKUP_LABEL]}
						</>
					) : (
						"Paste an Open Library link, a Goodreads link or an ISBN to jump straight to a book."
					)}
				</p>
			</div>

			{showResults ? (
				<div id={`${uid}-results`} aria-live="polite">
					{isSearching && works.length === 0 ? (
						<div className="flex flex-col gap-2">
							{Array.from({ length: 4 }, (_, index) => (
								<Skeleton key={index} className="h-28 w-full" />
							))}
						</div>
					) : error ? (
						<div className="flex flex-col items-start gap-2 border border-destructive/40 bg-destructive/5 p-4">
							<p className="text-destructive-ink text-sm">{error}</p>
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => void search.refetch()}
							>
								Try again
							</Button>
						</div>
					) : works.length === 0 ? (
						<p className="border border-border border-dashed p-4 text-muted-foreground text-sm">
							No Open Library works match “{trimmed}”. Check the spelling, or
							try the author's name.
						</p>
					) : (
						<ul
							ref={listRef}
							data-book-flow-results
							aria-busy={isSearching}
							className={cn(
								"flex flex-col gap-2 transition-opacity",
								isSearching && "opacity-60",
							)}
						>
							{works.map((work, index) => {
								const status = statusOf(work);
								return (
									<BookResultCard
										key={work.workKey}
										id={`${uid}-result-${index}`}
										work={work}
										status={status}
										mode={mode}
										active={index === activeIndex}
										queued={queue?.has(work.workKey) ?? false}
										onPick={() => {
											search.setActiveIndex(index);
											pick(work);
										}}
										onToggleQueue={mode === "add" ? queue?.toggle : undefined}
										trailing={resultExtras?.(work, status)}
									/>
								);
							})}
						</ul>
					)}
				</div>
			) : (
				idleContent
			)}
		</div>
	);
}
