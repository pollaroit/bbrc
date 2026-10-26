"use client";

import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import { Input } from "@bbrc/ui/components/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@bbrc/ui/components/popover";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, RefreshCw, X } from "lucide-react";
import { useRef, useState } from "react";
import {
	InsightsMultiPicker,
	type InsightsOption,
	InsightsRangePicker,
} from "@/components/blocks/author/author-insights-filters";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { bookCoverUrl } from "@/lib/book-cover";
import {
	type AdminCompareStatsParams,
	countAdminCompareFilters,
	labelFromSlug,
} from "@/lib/listing/admin-user-compare-listing";
import { useDebouncedValue } from "@/lib/listing/author-activity-listing";
import { orpc } from "@/utils/orpc";

type Props = {
	params: AdminCompareStatsParams;
	onChange: (patch: Partial<AdminCompareStatsParams>) => void;
	onClear: () => void;
	onRecalculate: () => void;
	isRecalculating: boolean;
	/** "Calculated 12 minutes ago" or similar, shown next to the button. */
	calculatedLabel: string | null;
};

type FilterKey = "users" | "books" | "authors" | "series" | "subjects";

const FILTER_NOUNS: Record<FilterKey, string> = {
	users: "Member",
	books: "Book",
	authors: "Author",
	series: "Series",
	subjects: "Subject",
};

/** Members: everyone who is not hidden or banned unless narrowed. */
function MembersPicker({
	selected,
	onChange,
	remember,
}: {
	selected: string[];
	onChange: (next: string[]) => void;
	remember: (key: FilterKey, value: string, label: string) => void;
}) {
	const [query, setQuery] = useState("");
	const debounced = useDebouncedValue(query.trim(), 250);
	const members = useQuery({
		...orpc.userCompareAdmin.searchMembers.queryOptions({
			input: { query: debounced },
		}),
		placeholderData: (previous) => previous,
	});
	const options: InsightsOption[] = (members.data?.items ?? []).map((m) => {
		remember("users", m.username, m.name);
		return {
			value: m.username,
			label: m.name,
			hint: `@${m.username}`,
			lead: <UserAvatar user={m} className="size-5" />,
		};
	});

	return (
		<InsightsMultiPicker
			label="Members"
			searchPlaceholder="Name or username…"
			options={options}
			selected={selected}
			onChange={onChange}
			onSearch={setQuery}
			isLoading={members.isFetching}
			emptyText="No members match."
		/>
	);
}

function BooksPicker({
	selected,
	onChange,
	remember,
}: {
	selected: string[];
	onChange: (next: string[]) => void;
	remember: (key: FilterKey, value: string, label: string) => void;
}) {
	const [query, setQuery] = useState("");
	const debounced = useDebouncedValue(query.trim(), 250);
	const books = useQuery({
		...orpc.book.getBookList.queryOptions({
			input: {
				limit: 10,
				sortBy: "title",
				sortDirection: "asc",
				...(debounced.length >= 2 ? { search: debounced } : {}),
			},
		}),
		placeholderData: (previous) => previous,
	});
	const options: InsightsOption[] = (books.data?.items ?? []).map((book) => {
		remember("books", book.slug, book.title);
		const cover = bookCoverUrl(book.coverId, "S");
		return {
			value: book.slug,
			label: book.title,
			hint: book.publishedIn > 0 ? String(book.publishedIn) : undefined,
			lead: (
				// biome-ignore lint/performance/noImgElement: a small thumbnail in a filter list
				<img
					src={cover ?? undefined}
					alt=""
					className="h-8 w-6 shrink-0 bg-muted object-cover ring-1 ring-foreground/10"
				/>
			),
		};
	});

	return (
		<InsightsMultiPicker
			label="Books"
			searchPlaceholder="Search by title…"
			options={options}
			selected={selected}
			onChange={onChange}
			onSearch={setQuery}
			isLoading={books.isFetching}
			emptyText="No books match."
		/>
	);
}

function AuthorsPicker({
	selected,
	onChange,
	remember,
}: {
	selected: string[];
	onChange: (next: string[]) => void;
	remember: (key: FilterKey, value: string, label: string) => void;
}) {
	const [query, setQuery] = useState("");
	const debounced = useDebouncedValue(query.trim(), 250);
	const authors = useQuery({
		...orpc.authorAdmin.search.queryOptions({ input: { query: debounced } }),
		enabled: debounced.length >= 2,
		placeholderData: (previous) => previous,
	});
	const options: InsightsOption[] = (authors.data?.authors ?? []).map(
		(author) => {
			remember("authors", author.slug, author.name);
			return {
				value: author.slug,
				label: author.name,
				hint: `${author.bookCount} ${author.bookCount === 1 ? "book" : "books"}`,
			};
		},
	);

	return (
		<InsightsMultiPicker
			label="Authors"
			searchPlaceholder="Type at least 2 letters…"
			options={options}
			selected={selected}
			onChange={onChange}
			onSearch={setQuery}
			isLoading={authors.isFetching}
			emptyText={
				debounced.length < 2 ? "Type a name to search." : "No authors match."
			}
		/>
	);
}

function SeriesPicker({
	selected,
	onChange,
	remember,
}: {
	selected: string[];
	onChange: (next: string[]) => void;
	remember: (key: FilterKey, value: string, label: string) => void;
}) {
	const [query, setQuery] = useState("");
	const debounced = useDebouncedValue(query.trim(), 250);
	const series = useQuery({
		...orpc.series.getList.queryOptions({
			input: {
				limit: 10,
				sortBy: "title",
				sortDirection: "asc",
				...(debounced.length >= 2 ? { search: debounced } : {}),
			},
		}),
		placeholderData: (previous) => previous,
	});
	const options: InsightsOption[] = (series.data?.items ?? []).map((item) => {
		remember("series", item.slug, item.title);
		return {
			value: item.slug,
			label: item.title,
			hint: `${item.bookCount} ${item.bookCount === 1 ? "book" : "books"}`,
		};
	});

	return (
		<InsightsMultiPicker
			label="Series"
			searchPlaceholder="Search series…"
			options={options}
			selected={selected}
			onChange={onChange}
			onSearch={setQuery}
			isLoading={series.isFetching}
			emptyText="No series match."
		/>
	);
}

/**
 * Subjects have no list to pick from: they are the tags written on the books. Type one and press
 * Enter. It must match the tag as it appears on the book (capital letters count).
 */
function SubjectsPicker({
	selected,
	onChange,
}: {
	selected: string[];
	onChange: (next: string[]) => void;
}) {
	const [open, setOpen] = useState(false);
	const [text, setText] = useState("");

	function add() {
		const value = text.trim();
		if (!value) return;
		if (!selected.includes(value)) onChange([...selected, value]);
		setText("");
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						type="button"
						variant="outline"
						size="sm"
						aria-label="Subjects"
						className="h-8 gap-1.5 bg-background"
					/>
				}
			>
				<span>Subjects</span>
				{selected.length > 0 ? (
					<span className="bg-primary px-1.5 text-2xs text-primary-foreground tabular-nums">
						{selected.length}
					</span>
				) : null}
				<ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
			</PopoverTrigger>
			<PopoverContent align="start" className="w-80 gap-2 p-2">
				<Input
					autoFocus
					value={text}
					placeholder="Type a subject and press Enter"
					aria-label="Add a subject"
					onChange={(event) => setText(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault();
							add();
						}
					}}
				/>
				<p className="text-2xs text-muted-foreground">
					Write it the way it appears on the book, for example "Science
					fiction". Capital letters count.
				</p>
				{selected.length > 0 ? (
					<ul className="flex flex-wrap gap-1">
						{selected.map((subject) => (
							<li key={subject}>
								<Badge variant="secondary" className="gap-1">
									{subject}
									<button
										type="button"
										aria-label={`Remove ${subject}`}
										onClick={() =>
											onChange(selected.filter((item) => item !== subject))
										}
									>
										<X className="size-3" aria-hidden />
									</button>
								</Badge>
							</li>
						))}
					</ul>
				) : null}
			</PopoverContent>
		</Popover>
	);
}

/** The filter bar of the compare stats: every filter changes which reads count toward the scores. */
export function AdminCompareStatsToolbar({
	params,
	onChange,
	onClear,
	onRecalculate,
	isRecalculating,
	calculatedLabel,
}: Props) {
	// Chosen values keep the names the pickers showed (the address only holds usernames and slugs).
	const labels = useRef(new Map<string, string>());
	const remember = (key: FilterKey, value: string, label: string) => {
		labels.current.set(`${key}:${value}`, label);
	};
	const active = countAdminCompareFilters(params);

	const chips: { key: FilterKey; value: string }[] = (
		["users", "books", "authors", "series", "subjects"] as const
	).flatMap((key) => (params[key] ?? []).map((value) => ({ key, value })));

	function removeChip(key: FilterKey, value: string) {
		const next = (params[key] ?? []).filter((item) => item !== value);
		onChange({ [key]: next.length > 0 ? next : null });
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center gap-2">
				<MembersPicker
					selected={params.users ?? []}
					onChange={(next) => onChange({ users: next.length ? next : null })}
					remember={remember}
				/>
				<BooksPicker
					selected={params.books ?? []}
					onChange={(next) => onChange({ books: next.length ? next : null })}
					remember={remember}
				/>
				<AuthorsPicker
					selected={params.authors ?? []}
					onChange={(next) => onChange({ authors: next.length ? next : null })}
					remember={remember}
				/>
				<SeriesPicker
					selected={params.series ?? []}
					onChange={(next) => onChange({ series: next.length ? next : null })}
					remember={remember}
				/>
				<SubjectsPicker
					selected={params.subjects ?? []}
					onChange={(next) => onChange({ subjects: next.length ? next : null })}
				/>
				<InsightsRangePicker
					label="Finished reading"
					allTimeLabel="Finished any time"
					value={{ from: params.from, to: params.to }}
					onChange={(range) => onChange({ from: range.from, to: range.to })}
				/>
				{active > 0 ? (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-8 gap-1"
						onClick={onClear}
					>
						<X className="size-3.5" aria-hidden />
						Clear all
					</Button>
				) : null}
				<div className="ml-auto flex items-center gap-2">
					{calculatedLabel ? (
						<span className="text-muted-foreground text-xs">
							{calculatedLabel}
						</span>
					) : null}
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-8 gap-1.5"
						disabled={isRecalculating}
						onClick={onRecalculate}
					>
						<RefreshCw
							className={isRecalculating ? "size-3.5 animate-spin" : "size-3.5"}
							aria-hidden
						/>
						Recalculate
					</Button>
				</div>
			</div>

			{chips.length > 0 ? (
				<ul className="flex flex-wrap gap-1.5" aria-label="Active filters">
					{chips.map(({ key, value }) => (
						<li key={`${key}:${value}`}>
							<Badge variant="secondary" className="gap-1.5 py-1">
								<span className="text-muted-foreground">
									{FILTER_NOUNS[key]}
								</span>
								{labels.current.get(`${key}:${value}`) ??
									(key === "subjects" ? value : labelFromSlug(value))}
								<button
									type="button"
									aria-label={`Remove ${value}`}
									onClick={() => removeChip(key, value)}
								>
									<X className="size-3" aria-hidden />
								</button>
							</Badge>
						</li>
					))}
				</ul>
			) : (
				<p className="text-muted-foreground text-xs">
					Every member and every book counts. Narrow it with the filters above;
					they decide which reads go into the scores.
				</p>
			)}
		</div>
	);
}
