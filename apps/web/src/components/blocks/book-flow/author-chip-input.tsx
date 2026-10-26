"use client";

import {
	authorNameKey,
	isLikelySameAuthor,
	looseAuthorKey,
} from "@bbrc/shared";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@bbrc/ui/components/avatar";
import { Button } from "@bbrc/ui/components/button";
import { Spinner } from "@bbrc/ui/components/spinner";
import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	horizontalListSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery } from "@tanstack/react-query";
import { GripVertical, Plus, X } from "lucide-react";
import {
	type KeyboardEvent,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { AuthorPhoto } from "@/components/blocks/author/author-photo";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import { client, orpc } from "@/utils/orpc";

/*
 * Authors of a work, as chips. Each chip is an author record of the library.
 *
 * <AuthorChipInput
 *   id           id for the text box (label target)
 *   value        the chips, in order (order = position on the book)
 *   onChange     called with the next chips
 *   invalid      red outline
 *   disabled     while saving
 * />
 *
 * A chip is "ours" (an existing author), "new" (created when the book is saved, see
 * `persistAuthorChips`), "similar" (looks like one of ours: the admin decides with
 * "Use ours" / "Different person") or "resolving" (being matched right now).
 * Names that arrive without a record (Open Library, or a book not backfilled yet) are
 * matched automatically with `authorAdmin.search`.
 *
 * Admin only (`authorAdmin.*`). Members see `AuthorChipList` instead.
 */

export type AuthorChipState = "resolving" | "ours" | "new" | "similar";

type SimilarAuthor = { id: string; slug: string; name: string };

export type AuthorChip = {
	/** Local id (stable while the chip is on screen). */
	key: string;
	name: string;
	/** Set when the chip is an existing author. */
	authorId: string | null;
	photoUrl: string | null;
	/** "1821–1881 · 12 books" for an existing author. */
	detail: string | null;
	/** From an Open Library suggestion: pins the new author's record. */
	openLibraryId: string | null;
	state: AuthorChipState;
	/** The author this one looks like (state "similar"). */
	similarTo: SimilarAuthor | null;
	/** "Different person" was chosen: create even though a similar author exists. */
	forceNew: boolean;
};

let chipCounter = 0;
function nextKey() {
	chipCounter += 1;
	return `author-chip-${chipCounter}`;
}

export function chipFromName(name: string): AuthorChip {
	return {
		key: nextKey(),
		name: name.trim(),
		authorId: null,
		photoUrl: null,
		detail: null,
		openLibraryId: null,
		state: "resolving",
		similarTo: null,
		forceNew: false,
	};
}

export function chipsFromNames(names: string[]): AuthorChip[] {
	const seen = new Set<string>();
	const chips: AuthorChip[] = [];
	for (const raw of names) {
		const name = raw.trim();
		const key = authorNameKey(name);
		if (!name || seen.has(key)) continue;
		seen.add(key);
		chips.push(chipFromName(name));
	}
	return chips;
}

export function chipsFromRefs(
	refs: { id: string; name: string; photoUrl: string | null }[],
): AuthorChip[] {
	return refs.map((ref) => ({
		key: nextKey(),
		name: ref.name,
		authorId: ref.id,
		photoUrl: ref.photoUrl,
		detail: null,
		openLibraryId: null,
		state: "ours",
		similarTo: null,
		forceNew: false,
	}));
}

export function authorChipNames(chips: AuthorChip[]): string[] {
	return chips.map((chip) => chip.name);
}

/** Why the chips cannot be saved yet, or null. */
export function authorChipsProblem(chips: AuthorChip[]): string | null {
	if (chips.length === 0) return "Add at least one author.";
	if (chips.some((chip) => chip.state === "resolving")) {
		return "Still matching the authors. Wait a moment.";
	}
	const similar = chips.find((chip) => chip.state === "similar");
	if (similar) {
		return `Decide if ${similar.name} is the same person as ${similar.similarTo?.name ?? "an author we have"}.`;
	}
	return null;
}

/**
 * Makes sure every chip is an author record (new ones are created, in order) and returns
 * the ids in order. Throws a readable error when an author cannot be created.
 */
export async function persistAuthorChips(
	chips: AuthorChip[],
	onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
	const pending = chips.filter((chip) => !chip.authorId).length;
	let done = 0;
	const ids: string[] = [];
	for (const chip of chips) {
		if (chip.authorId) {
			ids.push(chip.authorId);
			continue;
		}
		const result = await client.authorAdmin.create({
			name: chip.name,
			openLibraryId: chip.openLibraryId ?? undefined,
			force: chip.forceNew || undefined,
		});
		ids.push(result.author.id);
		done += 1;
		onProgress?.(done, pending);
	}
	return [...new Set(ids)];
}

// ── Matching ───────────────────────────────────────────────────────────────

type SearchResult = Awaited<ReturnType<typeof client.authorAdmin.search>>;
type OursResult = SearchResult["authors"][number];
type OpenLibraryResult = SearchResult["openLibrary"][number];

function lifespanDetail(author: OursResult): string {
	const parts = [
		author.lifespan,
		author.bookCount > 0
			? `${author.bookCount} ${author.bookCount === 1 ? "book" : "books"}`
			: null,
	].filter(Boolean);
	return parts.join(" · ");
}

function fromOurs(author: OursResult, key: string): AuthorChip {
	return {
		key,
		name: author.name,
		authorId: author.id,
		photoUrl: author.photoUrl,
		detail: lifespanDetail(author),
		openLibraryId: null,
		state: "ours",
		similarTo: null,
		forceNew: false,
	};
}

function fromOpenLibrary(
	suggestion: OpenLibraryResult,
	key: string,
): AuthorChip {
	return {
		key,
		name: suggestion.name,
		authorId: null,
		photoUrl: null,
		detail: null,
		openLibraryId: suggestion.olid,
		state: suggestion.looksLike ? "similar" : "new",
		similarTo: suggestion.looksLike,
		forceNew: false,
	};
}

/** Decides what an unmatched name is, from the search for it. */
function matchName(chip: AuthorChip, result: SearchResult): AuthorChip {
	const strict = authorNameKey(chip.name);
	const loose = looseAuthorKey(chip.name);
	const same = result.authors.find(
		(author) =>
			authorNameKey(author.name) === strict ||
			looseAuthorKey(author.name) === loose,
	);
	if (same) return fromOurs(same, chip.key);

	const similar = result.authors.find((author) =>
		isLikelySameAuthor(chip.name, author.name),
	);
	const olMatch = result.openLibrary.find(
		(item) =>
			authorNameKey(item.name) === strict ||
			looseAuthorKey(item.name) === loose,
	);
	const openLibraryId = olMatch?.olid ?? null;
	if (similar) {
		return {
			...chip,
			state: "similar",
			openLibraryId,
			similarTo: { id: similar.id, slug: similar.slug, name: similar.name },
		};
	}
	if (olMatch?.looksLike) {
		return {
			...chip,
			state: "similar",
			openLibraryId,
			similarTo: olMatch.looksLike,
		};
	}
	return { ...chip, state: "new", openLibraryId };
}

// ── Chips ──────────────────────────────────────────────────────────────────

function initials(name: string) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join("");
}

function ChipAvatar({ chip }: { chip: AuthorChip }) {
	return <AuthorPhoto name={chip.name} photoUrl={chip.photoUrl} size="xs" />;
}

function stateLabel(chip: AuthorChip): string | null {
	if (chip.state === "new") return "New";
	if (chip.state === "similar") return "Check";
	return null;
}

function SortableChip({
	chip,
	disabled,
	onRemove,
}: {
	chip: AuthorChip;
	disabled?: boolean;
	onRemove: () => void;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: chip.key, disabled });
	const label = stateLabel(chip);

	return (
		<li
			ref={setNodeRef}
			style={{
				transform: CSS.Transform.toString(transform),
				transition,
			}}
			className={cn(
				"inline-flex max-w-full items-center gap-1.5 border bg-muted/30 py-0.5 ps-0.5 pe-0.5 text-sm",
				chip.state === "similar" && "border-warning/60 bg-warning/10",
				chip.state === "new" && "border-info/50 bg-info/10",
				chip.state !== "similar" && chip.state !== "new" && "border-border",
				isDragging && "relative z-10 opacity-80",
			)}
		>
			<button
				type="button"
				className="touch-none p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
				aria-label={`Reorder ${chip.name}. Press space, then the arrow keys.`}
				disabled={disabled}
				{...attributes}
				{...listeners}
			>
				<GripVertical className="size-3.5" aria-hidden />
			</button>
			<ChipAvatar chip={chip} />
			<span className="min-w-0 truncate">{chip.name}</span>
			{chip.state === "resolving" ? (
				<Spinner
					className="size-3.5 text-muted-foreground"
					aria-label="Matching"
				/>
			) : null}
			{label ? (
				<span
					className={cn(
						"text-3xs",
						chip.state === "similar" ? "text-warning-ink" : "text-info-ink",
					)}
				>
					{label}
				</span>
			) : null}
			<button
				type="button"
				className="p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
				aria-label={`Remove ${chip.name}`}
				disabled={disabled}
				onClick={onRemove}
			>
				<X className="size-3.5" aria-hidden />
			</button>
		</li>
	);
}

/** Authors as plain chips, for screens where they cannot be changed (the request flow). */
export function AuthorChipList({
	names,
	className,
}: {
	names: string[];
	className?: string;
}) {
	if (names.length === 0) {
		return (
			<p className={cn("text-muted-foreground text-sm", className)}>
				Open Library lists no author for this book.
			</p>
		);
	}
	return (
		<ul className={cn("flex flex-wrap gap-1.5", className)}>
			{names.map((name) => (
				<li
					key={name}
					className="inline-flex max-w-full items-center gap-1.5 border border-border bg-muted/30 py-0.5 ps-0.5 pe-2 text-sm"
				>
					<Avatar size="sm">
						<AvatarFallback className="text-3xs">
							{initials(name)}
						</AvatarFallback>
					</Avatar>
					<span className="min-w-0 truncate">{name}</span>
				</li>
			))}
		</ul>
	);
}

// ── The input ──────────────────────────────────────────────────────────────

type Option =
	| { kind: "ours"; id: string; author: OursResult }
	| { kind: "openlibrary"; id: string; suggestion: OpenLibraryResult }
	| { kind: "free"; id: string; name: string };

type AuthorChipInputProps = {
	id?: string;
	value: AuthorChip[];
	onChange: (next: AuthorChip[]) => void;
	invalid?: boolean;
	disabled?: boolean;
};

export function AuthorChipInput({
	id,
	value,
	onChange,
	invalid,
	disabled,
}: AuthorChipInputProps) {
	const fallbackId = useId();
	const inputId = id ?? fallbackId;
	const listId = `${inputId}-options`;
	const [text, setText] = useState("");
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const valueRef = useRef(value);
	valueRef.current = value;
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	const asked = useRef(new Set<string>());

	const query = useDebouncedValue(text.trim(), 200);
	const { data, isFetching } = useQuery({
		...orpc.authorAdmin.search.queryOptions({ input: { query } }),
		enabled: open && !disabled,
		staleTime: 30_000,
		retry: false,
		placeholderData: (previous) => previous,
	});

	// Match names that arrived without a record (Open Library, or an old book).
	const resolvingKeys = value
		.filter((chip) => chip.state === "resolving")
		.map((chip) => chip.key)
		.join("\0");
	useEffect(() => {
		if (!resolvingKeys) return;
		for (const chip of valueRef.current) {
			if (chip.state !== "resolving" || asked.current.has(chip.key)) continue;
			asked.current.add(chip.key);
			const apply = (next: (current: AuthorChip) => AuthorChip) => {
				onChangeRef.current(
					valueRef.current.map((item) =>
						item.key === chip.key ? next(item) : item,
					),
				);
			};
			client.authorAdmin
				.search({ query: chip.name })
				.then((result) => apply((current) => matchName(current, result)))
				.catch(() => apply((current) => ({ ...current, state: "new" })));
		}
	}, [resolvingKeys]);

	const options = useMemo<Option[]>(() => {
		if (!data) return [];
		const taken = new Set(
			value.flatMap((chip) => (chip.authorId ? [chip.authorId] : [])),
		);
		const list: Option[] = [];
		for (const author of data.authors) {
			if (taken.has(author.id)) continue;
			list.push({ kind: "ours", id: `ours-${author.id}`, author });
		}
		for (const suggestion of data.openLibrary) {
			if (suggestion.looksLike && taken.has(suggestion.looksLike.id)) continue;
			list.push({
				kind: "openlibrary",
				id: `ol-${suggestion.olid}`,
				suggestion,
			});
		}
		return list;
	}, [data, value]);

	const freeName = text.trim();
	const allOptions = useMemo<Option[]>(
		() =>
			freeName.length > 0
				? [...options, { kind: "free", id: "free", name: freeName }]
				: options,
		[options, freeName],
	);
	const activeIndex = Math.min(active, Math.max(allOptions.length - 1, 0));

	const add = useCallback(
		(chip: AuthorChip, refocus = true) => {
			const current = valueRef.current;
			const key = authorNameKey(chip.name);
			const duplicate = current.some(
				(item) =>
					(chip.authorId && item.authorId === chip.authorId) ||
					authorNameKey(item.name) === key,
			);
			if (!duplicate) onChange([...current, chip]);
			setText("");
			setActive(0);
			if (refocus) inputRef.current?.focus();
		},
		[onChange],
	);

	function pick(option: Option) {
		if (option.kind === "ours") {
			add(fromOurs(option.author, nextKey()));
		} else if (option.kind === "openlibrary") {
			add(fromOpenLibrary(option.suggestion, nextKey()));
		} else {
			add(chipFromName(option.name));
		}
	}

	function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.nativeEvent.isComposing) return;
		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			event.preventDefault();
			event.stopPropagation();
			if (!open) {
				setOpen(true);
				return;
			}
			const size = allOptions.length;
			if (size === 0) return;
			setActive(
				(activeIndex + (event.key === "ArrowDown" ? 1 : size - 1)) % size,
			);
			return;
		}
		if (event.key === "Enter") {
			if (event.metaKey || event.ctrlKey) return; // save shortcut
			event.preventDefault();
			event.stopPropagation();
			const option = open ? allOptions[activeIndex] : undefined;
			if (option) pick(option);
			else if (freeName) add(chipFromName(freeName));
			return;
		}
		if (event.key === "," && freeName) {
			event.preventDefault();
			add(chipFromName(freeName));
			return;
		}
		if (event.key === "Escape") {
			if (open) {
				event.preventDefault();
				event.stopPropagation();
				setOpen(false);
			}
			return;
		}
		if (event.key === "Backspace" && text.length === 0 && value.length > 0) {
			onChange(value.slice(0, -1));
		}
	}

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	function onDragEnd(event: DragEndEvent) {
		const { active: from, over } = event;
		if (!over || from.id === over.id) return;
		const oldIndex = value.findIndex((chip) => chip.key === from.id);
		const newIndex = value.findIndex((chip) => chip.key === over.id);
		if (oldIndex < 0 || newIndex < 0) return;
		onChange(arrayMove(value, oldIndex, newIndex));
	}

	function resolveSimilar(chipKey: string, choice: "ours" | "different") {
		onChange(
			value.map((chip) => {
				if (chip.key !== chipKey || !chip.similarTo) return chip;
				if (choice === "different") {
					return { ...chip, state: "new", forceNew: true };
				}
				return {
					...chip,
					name: chip.similarTo.name,
					authorId: chip.similarTo.id,
					openLibraryId: null,
					state: "ours",
					similarTo: null,
					// Details load again the next time the author is searched.
					detail: null,
				};
			}),
		);
	}

	const similar = value.filter(
		(chip) => chip.state === "similar" && chip.similarTo,
	);
	const showList = open && !disabled && allOptions.length > 0;

	return (
		<div className="flex min-w-0 flex-col gap-2">
			<div
				className={cn(
					"relative flex min-w-0 flex-wrap items-center gap-1.5 border bg-background p-1.5 focus-within:outline-2 focus-within:outline-ring",
					invalid ? "border-destructive" : "border-input",
					disabled && "opacity-70",
				)}
			>
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={onDragEnd}
				>
					<SortableContext
						items={value.map((chip) => chip.key)}
						strategy={horizontalListSortingStrategy}
					>
						<ul className="contents" aria-label="Authors, in order">
							{value.map((chip) => (
								<SortableChip
									key={chip.key}
									chip={chip}
									disabled={disabled}
									onRemove={() =>
										onChange(value.filter((item) => item.key !== chip.key))
									}
								/>
							))}
						</ul>
					</SortableContext>
				</DndContext>
				<input
					ref={inputRef}
					id={inputId}
					type="text"
					role="combobox"
					aria-expanded={showList}
					aria-controls={listId}
					aria-autocomplete="list"
					aria-activedescendant={
						showList && allOptions[activeIndex]
							? `${inputId}-${allOptions[activeIndex].id}`
							: undefined
					}
					aria-invalid={invalid || undefined}
					autoComplete="off"
					disabled={disabled}
					value={text}
					placeholder={
						value.length === 0 ? "Search authors or type a name" : "Add author"
					}
					className="min-w-32 flex-1 bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-muted-foreground"
					onChange={(event) => {
						setText(event.target.value);
						setActive(0);
						setOpen(true);
					}}
					onFocus={() => setOpen(true)}
					onBlur={() => {
						// Typed text that was never confirmed becomes a chip, so it is not lost.
						const typed = text.trim();
						if (typed) add(chipFromName(typed), false);
						setOpen(false);
					}}
					onKeyDown={onKeyDown}
				/>
				{showList ? (
					<div
						id={listId}
						role="listbox"
						aria-label="Authors"
						className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto border border-border bg-popover text-popover-foreground shadow-md"
						// Keep the text box focused while an option is clicked.
						onMouseDown={(event) => event.preventDefault()}
					>
						{allOptions.map((option, index) => (
							<div
								key={option.id}
								tabIndex={-1}
								onKeyDown={(event) => {
									if (event.key === "Enter") pick(option);
								}}
								id={`${inputId}-${option.id}`}
								role="option"
								aria-selected={index === activeIndex}
								className={cn(
									"flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm",
									index === activeIndex && "bg-accent text-accent-foreground",
								)}
								onMouseEnter={() => setActive(index)}
								onClick={() => pick(option)}
							>
								<OptionRow option={option} />
							</div>
						))}
						{isFetching ? (
							<div
								role="presentation"
								className="px-2 py-1 text-2xs text-muted-foreground"
							>
								Searching…
							</div>
						) : null}
					</div>
				) : null}
			</div>

			{similar.length > 0 ? (
				<ul className="flex flex-col gap-1.5">
					{similar.map((chip) => (
						<li
							key={chip.key}
							className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border border-warning/50 bg-warning/10 px-2.5 py-2 text-sm"
						>
							<p className="min-w-0 flex-1 basis-56">
								<span className="font-medium">{chip.name}</span> looks like{" "}
								<span className="font-medium">{chip.similarTo?.name}</span>,
								already in the library.
							</p>
							<div className="flex shrink-0 gap-1.5">
								<Button
									type="button"
									size="sm"
									disabled={disabled}
									onClick={() => resolveSimilar(chip.key, "ours")}
								>
									Use ours
								</Button>
								<Button
									type="button"
									size="sm"
									variant="outline"
									disabled={disabled}
									onClick={() => resolveSimilar(chip.key, "different")}
								>
									Different person
								</Button>
							</div>
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}

function OptionRow({ option }: { option: Option }) {
	if (option.kind === "ours") {
		const { author } = option;
		return (
			<>
				<AuthorPhoto name={author.name} photoUrl={author.photoUrl} size="sm" />
				<span className="min-w-0 flex-1">
					<span className="block truncate">{author.name}</span>
					<span className="block truncate text-2xs text-muted-foreground">
						{lifespanDetail(author) || "In the library"}
					</span>
				</span>
				<span className="shrink-0 text-2xs text-muted-foreground">
					In library
				</span>
			</>
		);
	}
	if (option.kind === "openlibrary") {
		const { suggestion } = option;
		const detail = [
			suggestion.birthYear ? `born ${suggestion.birthYear}` : null,
			suggestion.topWork,
		]
			.filter(Boolean)
			.join(" · ");
		return (
			<>
				<Avatar size="sm">
					<AvatarFallback className="text-3xs">
						{initials(suggestion.name)}
					</AvatarFallback>
				</Avatar>
				<span className="min-w-0 flex-1">
					<span className="block truncate">{suggestion.name}</span>
					<span className="block truncate text-2xs text-muted-foreground">
						{suggestion.looksLike
							? `Looks like ${suggestion.looksLike.name}, already in the library`
							: detail || "Open Library"}
					</span>
				</span>
				<span className="shrink-0 text-2xs text-muted-foreground">
					Open Library
				</span>
			</>
		);
	}
	return (
		<>
			<span className="flex size-6 shrink-0 items-center justify-center border border-border text-muted-foreground">
				<Plus className="size-3.5" aria-hidden />
			</span>
			<span className="min-w-0 flex-1 truncate">
				Add “{option.name}” as a new author
			</span>
		</>
	);
}
