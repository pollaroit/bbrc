"use client";

import {
	type BookLookup,
	isDirectBookLookup,
	parseBookLookup,
} from "@bbrc/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { resolveBookLookup } from "@/lib/open-library/lookup";
import type { OpenLibrarySearchWork } from "@/lib/open-library/types";
import { queryClient } from "@/utils/orpc";

/*
 * The state behind the search bar: what was typed, the results, and which one is
 * highlighted. The page calls this once and passes it to <BookFinder>, so the
 * results stay alive behind the form (that is what lets `[` and `]` switch to the
 * previous or next result while a book is open).
 *
 * `useBookSearch()` returns:
 *   query, setQuery        the text in the box
 *   lookup                 what the text is (a title, an ISBN, an Open Library link…)
 *   works, isSearching, error
 *   activeIndex, move(delta), setActiveIndex   keyboard highlight
 *   neighbor(workKey, delta, canPick)  the next/previous pickable result
 *   resolveNow(text)       look a pasted link, id or ISBN up right away
 *   inputRef               attach to the search input
 *   reset()                clear the text and results
 */

const keyFor = (lookup: BookLookup) => {
	switch (lookup.kind) {
		case "text":
		case "goodreads":
			return ["book-flow-search", "title", lookup.query] as const;
		case "olid":
			return ["book-flow-search", "olid", lookup.olid] as const;
		case "edition":
			return ["book-flow-search", "edition", lookup.editionOlid] as const;
		case "isbn":
			return ["book-flow-search", "isbn", lookup.isbn] as const;
	}
};

const isSearchable = (lookup: BookLookup) =>
	lookup.kind === "text" || lookup.kind === "goodreads"
		? lookup.query.length >= 2
		: true;

export function useBookSearch() {
	const inputRef = useRef<HTMLInputElement>(null);
	const [query, setQuery] = useState("");
	// Links and ISBNs are looked up as soon as they are complete; titles wait for a pause in typing.
	const debounced = useDebouncedValue(query, 450);
	const live = useMemo(() => parseBookLookup(query), [query]);
	const lookup = useMemo(
		() => (isDirectBookLookup(live) ? live : parseBookLookup(debounced)),
		[live, debounced],
	);

	const result = useQuery({
		queryKey: keyFor(lookup),
		queryFn: () => resolveBookLookup(lookup),
		enabled: isSearchable(lookup),
		staleTime: 60_000,
		// Keep showing the last results while the next ones load (no flicker while typing).
		placeholderData: keepPreviousData,
	});

	const works = useMemo<OpenLibrarySearchWork[]>(
		() => (isSearchable(live) ? (result.data ?? []) : []),
		[live, result.data],
	);

	const [activeIndex, setActiveIndex] = useState(0);
	const worksSignature = works.map((work) => work.workKey).join("|");
	// biome-ignore lint/correctness/useExhaustiveDependencies: new results start at the top
	useEffect(() => {
		setActiveIndex(0);
	}, [worksSignature]);

	const move = useCallback(
		(delta: number) => {
			setActiveIndex((index) =>
				works.length === 0
					? 0
					: Math.min(works.length - 1, Math.max(0, index + delta)),
			);
		},
		[works.length],
	);

	const neighbor = useCallback(
		(
			workKey: string,
			delta: 1 | -1,
			canPick: (work: OpenLibrarySearchWork) => boolean = () => true,
		): OpenLibrarySearchWork | null => {
			const start = works.findIndex((work) => work.workKey === workKey);
			if (start === -1) return null;
			for (
				let index = start + delta;
				index >= 0 && index < works.length;
				index += delta
			) {
				const candidate = works[index];
				if (candidate && canPick(candidate)) return candidate;
			}
			return null;
		},
		[works],
	);

	const resolveNow = useCallback(
		async (text: string): Promise<OpenLibrarySearchWork[]> => {
			const parsed = parseBookLookup(text);
			if (!isSearchable(parsed)) return [];
			return queryClient.fetchQuery({
				queryKey: keyFor(parsed),
				queryFn: () => resolveBookLookup(parsed),
				staleTime: 60_000,
			});
		},
		[],
	);

	const reset = useCallback(() => {
		setQuery("");
		setActiveIndex(0);
	}, []);

	return {
		inputRef,
		query,
		setQuery,
		lookup: live,
		works,
		isSearching: result.isFetching && isSearchable(lookup),
		error: result.error instanceof Error ? result.error.message : null,
		refetch: result.refetch,
		activeIndex,
		setActiveIndex,
		move,
		neighbor,
		resolveNow,
		reset,
	};
}

export type BookSearch = ReturnType<typeof useBookSearch>;
