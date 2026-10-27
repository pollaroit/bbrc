"use client";

import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import { Input } from "@bbrc/ui/components/input";
import { ScrollArea } from "@bbrc/ui/components/scroll-area";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useRef, useState } from "react";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { bookCoverUrl } from "@/lib/book-cover";
import { useDebouncedValue } from "@/lib/listing/author-activity-listing";
import { orpc } from "@/utils/orpc";

export type AuthorFilterOption = {
	value: string;
	label: string;
	/** A short second line (a username, a year, a count). */
	hint?: string;
	/** Leading picture or icon. */
	leading?: ReactNode;
};

type AuthorFilterMultiSelectProps = {
	/** Names the control ("Readers") for the heading and for screen readers. */
	label: string;
	searchPlaceholder?: string;
	selected: string[];
	onChange: (values: string[]) => void;
	/** The rows for the current search text. */
	options: AuthorFilterOption[];
	isPending?: boolean;
	query: string;
	onQueryChange: (query: string) => void;
	emptyText?: string;
	/** The most the API accepts at once. */
	max?: number;
};

/**
 * A filter that picks several things out of a long list: search, tick, and the picks stay
 * visible as removable chips. The list comes from the server (the parent runs the query),
 * so it works for readers, books and series alike.
 */
export function AuthorFilterMultiSelect({
	label,
	searchPlaceholder,
	selected,
	onChange,
	options,
	isPending = false,
	query,
	onQueryChange,
	emptyText,
	max = 30,
}: AuthorFilterMultiSelectProps) {
	const t = useTranslations("authors");
	// Remember what each pick was called, so a chip keeps its name after the list changes.
	const labels = useRef(new Map<string, string>());
	for (const option of options) {
		labels.current.set(option.value, option.label);
	}

	const toggle = (value: string, checked: boolean) => {
		if (checked) {
			if (selected.includes(value) || selected.length >= max) return;
			onChange([...selected, value]);
		} else {
			onChange(selected.filter((item) => item !== value));
		}
	};

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between gap-2">
				<p className="font-medium text-sm">{label}</p>
				{selected.length > 0 ? (
					<Button
						type="button"
						variant="ghost"
						size="xs"
						onClick={() => onChange([])}
					>
						{t("filters.clearCount", { count: selected.length })}
					</Button>
				) : null}
			</div>

			{selected.length > 0 ? (
				<ul className="flex flex-wrap gap-1.5">
					{selected.map((value) => (
						<li key={value}>
							<Badge variant="secondary" className="max-w-full gap-1 pr-1">
								<span className="truncate">
									{labels.current.get(value) ?? value}
								</span>
								<button
									type="button"
									className="grid size-4 shrink-0 place-items-center hover:text-foreground"
									aria-label={t("filters.removeItem", {
										name: labels.current.get(value) ?? value,
									})}
									onClick={() => toggle(value, false)}
								>
									<X className="size-3" aria-hidden />
								</button>
							</Badge>
						</li>
					))}
				</ul>
			) : null}

			<div className="relative">
				<SearchIcon className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
				<Input
					value={query}
					onChange={(event) => onQueryChange(event.target.value)}
					placeholder={searchPlaceholder ?? t("filters.searchDefault")}
					className="pl-9"
					aria-label={t("filters.search", { label: label.toLowerCase() })}
				/>
			</div>

			<ScrollArea className="max-h-52 border border-border">
				{isPending ? (
					<div className="flex flex-col gap-1 p-1" aria-hidden>
						{Array.from({ length: 4 }, (_, index) => (
							<Skeleton key={index} className="h-9 w-full" />
						))}
					</div>
				) : options.length === 0 ? (
					<p className="px-3 py-4 text-center text-muted-foreground text-sm">
						{emptyText ?? t("filters.nothingMatches")}
					</p>
				) : (
					<ul className="flex flex-col p-1">
						{options.map((option) => {
							const checked = selected.includes(option.value);
							const atLimit = !checked && selected.length >= max;
							return (
								<li key={option.value}>
									{/* biome-ignore lint/a11y/noLabelWithoutControl: the checkbox sits inside the label */}
									<label
										className={
											"flex min-w-0 cursor-pointer items-center gap-2.5 px-2 py-1.5 hover:bg-muted/60 has-disabled:cursor-not-allowed has-disabled:opacity-50"
										}
									>
										<Checkbox
											checked={checked}
											disabled={atLimit}
											onCheckedChange={(value) =>
												toggle(option.value, value === true)
											}
										/>
										{option.leading}
										<span className="min-w-0 flex-1">
											<span className="block truncate text-sm">
												{option.label}
											</span>
											{option.hint ? (
												<span className="block truncate text-muted-foreground text-xs">
													{option.hint}
												</span>
											) : null}
										</span>
									</label>
								</li>
							);
						})}
					</ul>
				)}
			</ScrollArea>
		</div>
	);
}

type SourceProps = {
	slug: string;
	selected: string[];
	onChange: (values: string[]) => void;
};

/** Members who read (or reviewed) a book by the author. */
export function AuthorFilterMembers({
	slug,
	selected,
	onChange,
	source,
	label,
}: SourceProps & { source: "reads" | "reviews"; label?: string }) {
	const t = useTranslations("authors");
	const [query, setQuery] = useState("");
	const debounced = useDebouncedValue(query);
	const membersQuery = useQuery(
		orpc.author.readerOptions.queryOptions({
			input: { slug, query: debounced.trim(), source },
			placeholderData: (previous) => previous,
		}),
	);

	return (
		<AuthorFilterMultiSelect
			label={label ?? t("filters.readers")}
			searchPlaceholder={t("filters.searchMembers")}
			selected={selected}
			onChange={onChange}
			query={query}
			onQueryChange={setQuery}
			isPending={membersQuery.isPending}
			emptyText={
				source === "reads" ? t("filters.noReaders") : t("filters.noReviewers")
			}
			options={(membersQuery.data?.items ?? []).map((member) => ({
				value: member.username,
				label: member.name,
				hint:
					source === "reads"
						? t("filters.memberHintReads", {
								username: member.username,
								count: member.count,
							})
						: t("filters.memberHintReviews", {
								username: member.username,
								count: member.count,
							}),
				leading: <UserAvatar user={member} className="size-7" />,
			}))}
		/>
	);
}

/** The author's books. */
export function AuthorFilterBooksPicker({
	slug,
	selected,
	onChange,
	label,
}: SourceProps & { label?: string }) {
	const t = useTranslations("authors");
	const [query, setQuery] = useState("");
	const debounced = useDebouncedValue(query);
	const booksQuery = useQuery(
		orpc.author.bookOptions.queryOptions({
			input: { slug, query: debounced.trim() },
			placeholderData: (previous) => previous,
		}),
	);

	return (
		<AuthorFilterMultiSelect
			label={label ?? t("filters.books")}
			searchPlaceholder={t("filters.searchTitle")}
			selected={selected}
			onChange={onChange}
			query={query}
			onQueryChange={setQuery}
			isPending={booksQuery.isPending}
			emptyText={t("filters.noBooks")}
			options={(booksQuery.data?.items ?? []).map((book) => {
				const cover = bookCoverUrl(book.coverId, "S");
				return {
					value: book.slug,
					label: book.title,
					hint: book.publishedIn > 0 ? String(book.publishedIn) : undefined,
					leading: (
						// biome-ignore lint/performance/noImgElement: a 28px thumbnail in a filter list
						<img
							src={cover ?? undefined}
							alt=""
							className="h-10 w-7 shrink-0 bg-muted object-cover ring-1 ring-foreground/10"
						/>
					),
				};
			})}
		/>
	);
}

/**
 * Series that hold the author's books. Renders nothing when there are none (and nothing is
 * picked), so authors with no series never see a control that cannot do anything.
 */
export function AuthorFilterSeries({
	slug,
	selected,
	onChange,
	label,
}: SourceProps & { label?: string }) {
	const t = useTranslations("authors");
	const [query, setQuery] = useState("");
	const debounced = useDebouncedValue(query);
	const seriesQuery = useQuery(
		orpc.author.seriesOptions.queryOptions({
			input: { slug, query: debounced.trim() },
			placeholderData: (previous) => previous,
		}),
	);
	// Whether the author has any series at all, whatever is typed in the box.
	const anySeriesQuery = useQuery(
		orpc.author.seriesOptions.queryOptions({ input: { slug, query: "" } }),
	);

	const hasSeries = (anySeriesQuery.data?.items.length ?? 0) > 0;
	if (!hasSeries && selected.length === 0) return null;

	return (
		<AuthorFilterMultiSelect
			label={label ?? t("filters.series")}
			searchPlaceholder={t("filters.searchSeries")}
			selected={selected}
			onChange={onChange}
			query={query}
			onQueryChange={setQuery}
			isPending={seriesQuery.isPending}
			emptyText={t("filters.noSeries")}
			options={(seriesQuery.data?.items ?? []).map((series) => ({
				value: series.slug,
				label: series.title,
				hint: t("filters.seriesHint", { count: series.authorBookCount }),
			}))}
		/>
	);
}
