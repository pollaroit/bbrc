"use client";

import { AddBookInputSchema } from "@bbrc/api/modules/book/book.schema";
import {
	generateSlug,
	openLibraryWorkKeyToOlid,
	pagesFromEditions,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { Textarea } from "@bbrc/ui/components/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Ban, ChevronLeft, ChevronRight, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useController } from "react-hook-form";
import { toast } from "sonner";
import {
	AddBookSeriesField,
	type AddBookSeriesPlacement,
	type AddBookSeriesSelection,
	DEFAULT_SERIES_PLACEMENT,
} from "@/components/blocks/add-book-series-field";
import { BookOriginCountriesField } from "@/components/blocks/book-origin-countries-field";
import {
	BookReadAfterPicker,
	type ReadAfterBookSelection,
} from "@/components/blocks/book-read-after-picker";
import {
	SuggestExcerptButton,
	SuggestSubjectsButton,
} from "@/components/blocks/book-suggest";
import { SimilarBooksWarning } from "@/components/blocks/similar-books-warning";
import { useAppForm } from "@/hooks/use-app-form";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
	AddNewBookFormSchema,
	type AddNewBookFormValues,
	authorsToText,
	toAddBookInput,
} from "@/lib/add-book-form";
import { fetchOpenLibraryEditionHints } from "@/lib/open-library/client";
import type { OpenLibrarySearchWork } from "@/lib/open-library/types";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";
import { AfterAddOptions, type AfterAddPreferences } from "./after-add-options";
import {
	type AuthorChip,
	AuthorChipInput,
	authorChipNames,
	authorChipsProblem,
	chipsFromNames,
	persistAuthorChips,
} from "./author-chip-input";
import { HotkeyChip } from "./book-flow-hotkeys-help";
import { BookPreviewCard } from "./book-preview-card";
import { BookQueueProgress } from "./book-queue";
import {
	BookWorkspace,
	BookWorkspaceActionBar,
	type WorkspaceSection,
} from "./book-workspace";
import { useBookFlowHotkeys } from "./use-book-flow-hotkeys";
import type { BookQueue } from "./use-book-queue";

/*
 * Stage 2 of adding a book: the workspace for one Open Library work.
 *
 * <AddBookWorkspaceForm
 *   work                the chosen work
 *   queue               the browser queue (progress + skip show when it has a current book)
 *   prefs/onPrefsChange "After saving" choice and the Notify members switch
 *   pending             the member request for this work, when there is one
 *   canSwitch           whether `[` / `]` have a book to go to
 *   onBack()            back to the search with the results still there (Esc)
 *   onFocusSearch()     back to the search and focus the box (/)
 *   onSwitch(delta)     go to the previous (-1) or next (1) book ([ and ])
 *   onHelp()            open the shortcuts sheet (?)
 *   onSaved(result, o)  the book was saved; `o.next` is true for Save and next
 *   onBlock()           put this work on the block list (admins)
 * />
 *
 * It owns the form, so changing book remounts it (the page passes `key`).
 */

const BookCoverField = dynamic(
	() =>
		import("@/components/blocks/book-cover-field").then(
			(mod) => mod.BookCoverField,
		),
	{
		ssr: false,
		loading: () => <Skeleton className="h-56 w-full" aria-hidden />,
	},
);

export type PendingRequestInfo = {
	id: string;
	olid: string;
	requester: { username: string; name: string | null };
	note: string | null;
	upvoteCount: number;
};

export type AddBookSavedResult = { slug: string; seriesSlug?: string };

type AddBookWorkspaceFormProps = {
	work: OpenLibrarySearchWork;
	queue: BookQueue;
	prefs: AfterAddPreferences;
	onPrefsChange: (next: AfterAddPreferences) => void;
	pending: PendingRequestInfo | null;
	canSwitch: { previous: boolean; next: boolean };
	onBack: () => void;
	onFocusSearch: () => void;
	onSwitch: (delta: 1 | -1) => void;
	onHelp: () => void;
	onSaved: (
		result: AddBookSavedResult,
		options: { next: boolean; olid: string; hadPendingRequest: boolean },
	) => void | Promise<void>;
	onBlock?: () => void;
};

function requireWorkOlid(work: OpenLibrarySearchWork): string {
	const olid = openLibraryWorkKeyToOlid(work.workKey);
	if (!olid) {
		throw new Error(`Could not resolve Open Library ID for "${work.title}"`);
	}
	return olid;
}

function workToFormValues(work: OpenLibrarySearchWork): AddNewBookFormValues {
	return {
		title: work.title,
		authorsText: authorsToText(work.authors),
		coverId: work.coverId,
		openLibraryRating: null,
		excerpt: work.description,
		pages: 0,
		publishedIn: work.publishedIn ?? new Date().getFullYear(),
		olid: requireWorkOlid(work),
		subjectPeople: [],
		subjectTimes: [],
		subjects: [],
		readAfterBookSlugs: [],
		countries: [],
	};
}

/** A short list of tags that can be removed one by one. */
function TagList({
	label,
	values,
	onChange,
	empty,
	action,
}: {
	label: string;
	values: string[];
	onChange: (next: string[]) => void;
	empty: string;
	action?: React.ReactNode;
}) {
	const [draft, setDraft] = useState("");
	const add = () => {
		const next = draft.trim();
		if (
			!next ||
			values.some((value) => value.toLowerCase() === next.toLowerCase())
		) {
			setDraft("");
			return;
		}
		onChange([...values, next]);
		setDraft("");
	};

	return (
		<Field>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<FieldLabel>{label}</FieldLabel>
				{action}
			</div>
			{values.length === 0 ? (
				<p className="text-muted-foreground text-xs">{empty}</p>
			) : (
				<ul className="flex flex-wrap gap-1.5">
					{values.map((value) => (
						<li
							key={value}
							className="inline-flex items-center gap-1 border border-border bg-muted/30 py-0.5 ps-2 pe-0.5 text-xs"
						>
							{value}
							<button
								type="button"
								className="p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
								aria-label={`Remove ${value}`}
								onClick={() =>
									onChange(values.filter((item) => item !== value))
								}
							>
								<X className="size-3" aria-hidden />
							</button>
						</li>
					))}
				</ul>
			)}
			<div className="flex gap-2">
				<Input
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault();
							add();
						}
					}}
					placeholder="Add and press Enter"
					className="h-8 text-sm"
				/>
				<Button type="button" variant="outline" size="sm" onClick={add}>
					Add
				</Button>
			</div>
		</Field>
	);
}

export function AddBookWorkspaceForm({
	work,
	queue,
	prefs,
	onPrefsChange,
	pending,
	canSwitch,
	onBack,
	onFocusSearch,
	onSwitch,
	onHelp,
	onSaved,
	onBlock,
}: AddBookWorkspaceFormProps) {
	const initialValues = useMemo(() => workToFormValues(work), [work]);
	const workOlid = useMemo(() => requireWorkOlid(work), [work]);
	const nextRef = useRef(false);

	const [acceptanceNotes, setAcceptanceNotes] = useState("");
	const [readAfterBooks, setReadAfterBooks] = useState<
		ReadAfterBookSelection[]
	>([]);
	const [seriesSelection, setSeriesSelection] =
		useState<AddBookSeriesSelection | null>(null);
	const [placement, setPlacement] = useState<AddBookSeriesPlacement>(
		DEFAULT_SERIES_PLACEMENT,
	);
	const [cover, setCover] = useState<{
		coverId: number | null;
		customCoverUrl: string | null;
	}>({ coverId: work.coverId, customCoverUrl: null });
	const [countriesTouched, setCountriesTouched] = useState(false);
	const countriesTouchedRef = useRef(false);

	const form = useAppForm(AddNewBookFormSchema, initialValues);
	const countriesField = useController({
		name: "countries",
		control: form.control,
		defaultValue: initialValues.countries,
	});

	const { data: editionHints, isFetching: isLoadingEditions } = useQuery({
		queryKey: ["open-library-editions", work.workKey],
		queryFn: () => fetchOpenLibraryEditionHints(work.workKey),
		staleTime: 3600_000,
	});

	useEffect(() => {
		if (!editionHints) return;
		const pages = pagesFromEditions(editionHints);
		if (pages != null && form.getValues("pages") === 0) {
			form.setValue("pages", pages, { shouldDirty: false });
		}
		if (editionHints.openLibraryRating != null) {
			form.setValue("openLibraryRating", editionHints.openLibraryRating, {
				shouldDirty: false,
			});
		}
		const excerpt = editionHints.excerpt ?? work.description ?? null;
		if (excerpt && !form.getValues("excerpt")) {
			form.setValue("excerpt", excerpt, { shouldDirty: false });
		}
		form.setValue("subjectPeople", editionHints.subjectPeople, {
			shouldDirty: false,
		});
		form.setValue("subjectTimes", editionHints.subjectTimes, {
			shouldDirty: false,
		});
		form.setValue("subjects", editionHints.subjects, { shouldDirty: false });
	}, [editionHints, form, work.description]);

	const title = form.watch("title");
	const [authorChips, setAuthorChips] = useState<AuthorChip[]>(() =>
		chipsFromNames(work.authors),
	);
	const [preparing, setPreparing] = useState(false);
	const [authorProgress, setAuthorProgress] = useState<string | null>(null);
	const publishedIn = form.watch("publishedIn");
	const pages = form.watch("pages");
	const excerpt = form.watch("excerpt");
	const subjects = form.watch("subjects");
	const subjectPeople = form.watch("subjectPeople");
	const subjectTimes = form.watch("subjectTimes");
	const authors = useMemo(() => authorChipNames(authorChips), [authorChips]);
	const authorsKey = authors.join("\n");
	const onAuthorChipsChange = (next: AuthorChip[]) => {
		setAuthorChips(next);
		// The form keeps a names copy so the required-field check and errors stay in one place.
		form.setValue("authorsText", authorChipNames(next).join(", "), {
			shouldDirty: true,
			shouldValidate: form.formState.isSubmitted,
		});
	};

	// Countries of origin: suggested once the basics are in, until the admin edits them.
	const debouncedOriginInput = useDebouncedValue(
		{ title, authorsKey, publishedIn, excerpt },
		700,
	);
	const originAuthors = useMemo(
		() => debouncedOriginInput.authorsKey.split("\n").filter(Boolean),
		[debouncedOriginInput.authorsKey],
	);
	const canSuggestOrigin =
		debouncedOriginInput.title.trim().length >= 2 && originAuthors.length > 0;
	const { data: originSuggestion, isFetching: isSuggestingOrigin } = useQuery({
		...orpc.book.suggestOriginCountries.queryOptions({
			input: {
				title: debouncedOriginInput.title.trim(),
				authors: originAuthors,
				publishedIn: debouncedOriginInput.publishedIn,
				excerpt: debouncedOriginInput.excerpt?.trim() || undefined,
			},
		}),
		enabled: canSuggestOrigin,
		staleTime: Number.POSITIVE_INFINITY,
		retry: false,
	});
	const suggestedCountriesKey = originSuggestion?.countries?.join("\0") ?? "";
	useEffect(() => {
		if (countriesTouchedRef.current || !suggestedCountriesKey) return;
		const next = originSuggestion?.countries;
		if (!next?.length) return;
		const current = form.getValues("countries");
		if (
			current.length === next.length &&
			current.every((code, index) => code === next[index])
		) {
			return;
		}
		form.setValue("countries", next, { shouldDirty: false });
	}, [form, suggestedCountriesKey, originSuggestion]);
	const markCountriesTouched = () => {
		countriesTouchedRef.current = true;
		setCountriesTouched(true);
	};

	const slugPreview = useMemo(
		() => (title.trim() ? generateSlug(title) : ""),
		[title],
	);

	const addBookMutation = useMutation(
		orpc.book.addBook.mutationOptions({
			onSuccess: (result) => {
				void queryClient.invalidateQueries({
					queryKey: orpc.book.getBookList.key(),
				});
				void queryClient.invalidateQueries({
					queryKey: orpc.bookRequest.listPending.key(),
				});
				void queryClient.invalidateQueries({
					queryKey: orpc.bookRequest.listOpen.key(),
				});
				void queryClient.invalidateQueries({
					queryKey: orpc.bookRequest.listMine.key(),
				});
				void queryClient.invalidateQueries({
					queryKey: orpc.book.listCatalogOlids.key(),
				});
				void queryClient.invalidateQueries({
					queryKey: orpc.bookDiscover.lane.key(),
				});
				if (result.seriesSlug) {
					void queryClient.invalidateQueries({
						queryKey: orpc.series.getList.key(),
					});
					void queryClient.invalidateQueries({
						queryKey: orpc.series.getBySlug.key({
							input: { slug: result.seriesSlug },
						}),
					});
				}
				toast.success("Book added to the library.");
				void onSaved(result, {
					next: nextRef.current,
					olid: workOlid,
					hadPendingRequest: pending != null,
				});
			},
			onError: (error) => {
				const existing = (error as { data?: { slug?: string } }).data?.slug;
				toast.error(error.message ?? "Could not add this book.", {
					action: existing
						? {
								label: "Open it",
								onClick: () => window.open(`/books/${existing}`, "_blank"),
							}
						: undefined,
				});
			},
		}),
	);

	const submit = form.handleSubmit(
		(values) => {
			const chipProblem = authorChipsProblem(authorChips);
			if (chipProblem) {
				toast.error(chipProblem);
				return;
			}

			const parsed = toAddBookInput({
				...values,
				coverId: cover.coverId,
				readAfterBookSlugs: readAfterBooks.map((book) => book.slug),
			});

			if (parsed.pages < 1) {
				form.setError("pages", { message: "Pages is required" });
				toast.error("Add the page count first.");
				return;
			}

			const trimmedNotes = acceptanceNotes.trim();
			const withNotes =
				trimmedNotes.length > 0
					? { ...parsed, acceptanceNotes: trimmedNotes }
					: parsed;

			const withSeries =
				seriesSelection?.kind === "existing"
					? {
							...withNotes,
							seriesSlug: seriesSelection.slug,
							seriesPosition: placement.position ?? undefined,
							shiftLater: placement.shiftLater || undefined,
						}
					: seriesSelection?.kind === "new"
						? { ...withNotes, newSeries: seriesSelection.draft }
						: withNotes;

			const withCover = cover.customCoverUrl
				? { ...withSeries, customCoverUrl: cover.customCoverUrl }
				: withSeries;
			const withNotify =
				prefs.notifyMembers === false
					? { ...withCover, notifyMembers: false }
					: withCover;

			const apiCheck = AddBookInputSchema.safeParse(withNotify);
			if (!apiCheck.success) {
				toast.error(apiCheck.error.issues[0]?.message ?? "Invalid form data");
				return;
			}
			// New authors are created first, in order; the book then links to the records.
			setPreparing(true);
			persistAuthorChips(authorChips, (done, total) =>
				setAuthorProgress(`Creating authors (${done} of ${total})…`),
			)
				.then((authorIds) => {
					addBookMutation.mutate({
						...apiCheck.data,
						authors: undefined,
						authorIds,
					});
				})
				.catch((error: unknown) => {
					toast.error(
						error instanceof Error
							? error.message
							: "Could not create the authors.",
					);
				})
				.finally(() => {
					setPreparing(false);
					setAuthorProgress(null);
				});
		},
		() => {
			toast.error("Fix the highlighted fields and try again.");
		},
	);

	const save = (next: boolean) => {
		if (addBookMutation.isPending || preparing) return;
		nextRef.current = next;
		void submit();
	};

	useBookFlowHotkeys(
		{
			save: () => save(false),
			saveNext: () => save(true),
			back: onBack,
			focusSearch: onFocusSearch,
			help: onHelp,
			previousBook: () => onSwitch(-1),
			nextBook: () => onSwitch(1),
		},
		{ stage: "form" },
	);

	const seriesLabel =
		seriesSelection?.kind === "existing"
			? `${placement.position != null ? `#${placement.position} ` : ""}${seriesSelection.title}`
			: seriesSelection?.kind === "new"
				? `#1 ${seriesSelection.draft.title}`
				: null;

	const saving = addBookMutation.isPending || preparing;

	const header = (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="-ms-2 gap-1.5"
					onClick={onBack}
				>
					<ArrowLeft data-icon="inline-start" aria-hidden />
					Back to results
					<HotkeyChip id="back" />
				</Button>
				<div className="flex items-center gap-1">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={!canSwitch.previous}
						onClick={() => onSwitch(-1)}
						aria-label="Previous book"
					>
						<ChevronLeft data-icon="inline-start" aria-hidden />
						Previous
						<HotkeyChip id="previousBook" />
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={!canSwitch.next}
						onClick={() => onSwitch(1)}
						aria-label="Next book"
					>
						Next
						<HotkeyChip id="nextBook" />
						<ChevronRight data-icon="inline-end" aria-hidden />
					</Button>
				</div>
			</div>
			{queue.current ? <BookQueueProgress queue={queue} /> : null}
			<SimilarBooksWarning title={title} authors={authors} olid={workOlid} />
		</div>
	);

	const detailsComplete =
		title.trim().length > 0 && authors.length > 0 && pages > 0;

	const sections: WorkspaceSection[] = [
		{
			id: "details",
			title: "Details",
			description: "What the library shows on the book's page.",
			status: detailsComplete ? "complete" : "attention",
			summary: [title, pages > 0 ? `${pages} pages` : "pages missing"]
				.filter(Boolean)
				.join(" · "),
			content: (
				<FieldGroup>
					<form.Input
						name="title"
						label="Title"
						render={(field, fieldState) => (
							<Input
								id={field.name}
								aria-invalid={fieldState.invalid}
								{...field}
							/>
						)}
					/>
					<p className="-mt-2 text-muted-foreground text-xs">
						Address:{" "}
						<span className="font-mono">/books/{slugPreview || "…"}</span>
					</p>
					<Field>
						<FieldLabel htmlFor="authors">Authors</FieldLabel>
						<AuthorChipInput
							id="authors"
							value={authorChips}
							onChange={onAuthorChipsChange}
							invalid={Boolean(form.formState.errors.authorsText)}
							disabled={saving}
						/>
						{form.formState.errors.authorsText ? (
							<p className="text-destructive text-xs" role="alert">
								{form.formState.errors.authorsText.message}
							</p>
						) : (
							<FieldDescription>
								{authorProgress ??
									"Each chip is an author of the library. Drag to set the order."}
							</FieldDescription>
						)}
					</Field>
					<div className="grid gap-4 sm:grid-cols-3">
						<div className="space-y-1">
							<form.Input
								name="pages"
								label="Pages"
								render={(field, fieldState) => (
									<Input
										id={field.name}
										type="number"
										min={1}
										inputMode="numeric"
										placeholder="e.g. 320"
										aria-invalid={fieldState.invalid}
										value={field.value === 0 ? "" : field.value}
										onChange={(event) => {
											const next = event.target.value;
											field.onChange(
												next === "" ? 0 : Number.parseInt(next, 10),
											);
										}}
										onBlur={field.onBlur}
										name={field.name}
										ref={field.ref}
									/>
								)}
							/>
							<FieldDescription>
								{isLoadingEditions
									? "Looking at editions…"
									: editionHints?.pageCountHints.length
										? `Editions say ${editionHints.pageCountHints.join(", ")}.`
										: "No page count on Open Library. Enter it by hand."}
							</FieldDescription>
						</div>
						<form.Input
							name="publishedIn"
							label="Published in"
							render={(field, fieldState) => (
								<Input
									id={field.name}
									type="number"
									min={0}
									max={new Date().getFullYear()}
									inputMode="numeric"
									aria-invalid={fieldState.invalid}
									value={field.value}
									onChange={(event) => {
										const next = event.target.value;
										field.onChange(next === "" ? 0 : Number.parseInt(next, 10));
									}}
									onBlur={field.onBlur}
									name={field.name}
									ref={field.ref}
								/>
							)}
						/>
						<form.Input
							name="openLibraryRating"
							label="Open Library rating"
							render={(field, fieldState) => (
								<Input
									id={field.name}
									readOnly
									className="bg-muted/40 text-muted-foreground"
									aria-invalid={fieldState.invalid}
									aria-readonly
									value={field.value == null ? "—" : String(field.value)}
									name={field.name}
									ref={field.ref}
								/>
							)}
						/>
					</div>
					<Field>
						<div className="flex flex-wrap items-center justify-between gap-2">
							<FieldLabel htmlFor="excerpt">Description</FieldLabel>
							<SuggestExcerptButton
								title={title}
								authors={authors}
								publishedIn={publishedIn || undefined}
								excerpt={excerpt ?? undefined}
								onAccept={(text) =>
									form.setValue("excerpt", text, { shouldDirty: true })
								}
							/>
						</div>
						<Textarea
							id="excerpt"
							rows={5}
							maxLength={4000}
							value={excerpt ?? ""}
							onChange={(event) =>
								form.setValue("excerpt", event.target.value || null, {
									shouldDirty: true,
								})
							}
							placeholder="A few spoiler-free sentences about the book."
						/>
						<FieldDescription>
							{excerpt?.trim()
								? "Taken from Open Library; edit it if you like."
								: isLoadingEditions
									? "Looking for a description on Open Library…"
									: "Open Library has none. Write one, or ask for a suggestion."}
						</FieldDescription>
					</Field>
				</FieldGroup>
			),
		},
		{
			id: "cover",
			title: "Cover",
			description: "Pick an edition's cover or upload your own (always 2:3).",
			status:
				cover.coverId != null || cover.customCoverUrl
					? "complete"
					: "attention",
			summary: cover.customCoverUrl
				? "Uploaded cover"
				: cover.coverId != null
					? "Open Library cover"
					: "No cover yet",
			content: (
				<BookCoverField
					title={title}
					olid={workOlid}
					value={cover}
					onChange={(next) => {
						setCover({
							coverId: next.coverId,
							customCoverUrl: next.customCoverUrl,
						});
						form.setValue("coverId", next.coverId, { shouldDirty: true });
					}}
				/>
			),
		},
		{
			id: "classification",
			title: "Classification",
			description: "Where the book comes from and what it is about.",
			summary: [
				countriesField.field.value.length > 0
					? `${countriesField.field.value.length} countr${countriesField.field.value.length === 1 ? "y" : "ies"}`
					: "no country",
				`${subjects.length} subjects`,
			].join(" · "),
			content: (
				<div className="flex flex-col gap-5">
					<BookOriginCountriesField
						value={countriesField.field.value}
						isSuggesting={isSuggestingOrigin && !countriesTouched}
						onTouched={markCountriesTouched}
						onChange={(next) => {
							markCountriesTouched();
							countriesField.field.onChange(next);
						}}
					/>
					<TagList
						label="Subjects"
						values={subjects}
						onChange={(next) =>
							form.setValue("subjects", next, { shouldDirty: true })
						}
						empty="No subjects yet."
						action={
							<SuggestSubjectsButton
								title={title}
								authors={authors}
								publishedIn={publishedIn || undefined}
								excerpt={excerpt ?? undefined}
								subjects={subjects}
								onAccept={(next) =>
									form.setValue("subjects", next, { shouldDirty: true })
								}
							/>
						}
					/>
					<TagList
						label="People"
						values={subjectPeople}
						onChange={(next) =>
							form.setValue("subjectPeople", next, { shouldDirty: true })
						}
						empty="No people tagged."
					/>
					<TagList
						label="Times"
						values={subjectTimes}
						onChange={(next) =>
							form.setValue("subjectTimes", next, { shouldDirty: true })
						}
						empty="No periods tagged."
					/>
				</div>
			),
		},
		{
			id: "series",
			title: "Series and order",
			description: "Put the book in a series and choose its place.",
			summary: seriesLabel ?? "Not in a series",
			content: (
				<AddBookSeriesField
					selection={seriesSelection}
					onChange={setSeriesSelection}
					placement={placement}
					onPlacementChange={setPlacement}
					bookTitle={title}
				/>
			),
		},
		{
			id: "reading-order",
			title: "Reading order",
			description: "Books members should read before this one.",
			summary:
				readAfterBooks.length > 0
					? `${readAfterBooks.length} to read first`
					: "No prerequisites",
			content: (
				<BookReadAfterPicker
					selected={readAfterBooks}
					onChange={(books) => {
						setReadAfterBooks(books);
						form.setValue(
							"readAfterBookSlugs",
							books.map((book) => book.slug),
							{ shouldDirty: true },
						);
					}}
				/>
			),
		},
		...(pending
			? [
					{
						id: "request",
						title: "Member request",
						description: "Someone asked for this book.",
						summary: `Requested by ${pending.requester.name?.trim() || pending.requester.username}`,
						content: (
							<div className="flex flex-col gap-4">
								<div className="flex flex-col gap-1 border border-border bg-muted/30 p-3 text-sm">
									<p>
										Requested by{" "}
										<span className="font-medium">
											{pending.requester.name?.trim() ||
												pending.requester.username}
										</span>
										{pending.upvoteCount > 0
											? `, and ${pending.upvoteCount} other ${pending.upvoteCount === 1 ? "member says" : "members say"} “me too”.`
											: "."}
									</p>
									{pending.note ? (
										<p className="text-muted-foreground">“{pending.note}”</p>
									) : null}
								</div>
								<Field>
									<FieldLabel htmlFor="acceptance-notes">
										Note to the requester (optional)
									</FieldLabel>
									<Textarea
										id="acceptance-notes"
										value={acceptanceNotes}
										maxLength={200}
										rows={3}
										placeholder="A short note shown with the request when the book is added…"
										onChange={(event) => setAcceptanceNotes(event.target.value)}
									/>
									<FieldDescription>
										{acceptanceNotes.trim().length}/200
									</FieldDescription>
								</Field>
							</div>
						),
					} satisfies WorkspaceSection,
				]
			: []),
		{
			id: "after",
			title: "After saving",
			description: "What happens next, and who hears about it.",
			summary: "Choose what happens next",
			content: (
				<AfterAddOptions
					mode="add"
					value={prefs}
					onChange={onPrefsChange}
					disabledActions={
						pending
							? undefined
							: { next_request: "Opens the next pending member request." }
					}
				/>
			),
		},
	];

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				save(false);
			}}
			noValidate
			className={cn("flex flex-col")}
		>
			<BookWorkspace
				header={header}
				preview={
					<BookPreviewCard
						title={title || work.title}
						authors={authors}
						coverId={cover.coverId}
						coverUrl={cover.customCoverUrl}
						pages={pages || null}
						publishedIn={publishedIn || null}
						seriesLabel={seriesLabel}
						excerpt={excerpt}
					/>
				}
				sections={sections}
				actionBar={
					<BookWorkspaceActionBar
						hint={
							pages > 0 ? undefined : "Add the page count to save this book."
						}
						leading={
							<>
								<Button
									type="button"
									variant="ghost"
									onClick={onBack}
									disabled={saving}
								>
									Cancel
								</Button>
								{onBlock ? (
									<Button
										type="button"
										variant="ghost"
										className="text-destructive"
										onClick={onBlock}
										disabled={saving}
									>
										<Ban data-icon="inline-start" aria-hidden />
										Block this work
									</Button>
								) : null}
							</>
						}
						trailing={
							<>
								{queue.current || canSwitch.next ? (
									<Button
										type="button"
										variant="outline"
										onClick={() => save(true)}
										disabled={saving}
									>
										Save and next
										<HotkeyChip id="saveNext" />
									</Button>
								) : null}
								<form.Submit
									className="min-w-32"
									loading={saving}
									loadingText="Adding…"
								>
									Add book
									<HotkeyChip id="save" />
								</form.Submit>
							</>
						}
					/>
				}
			/>
		</form>
	);
}
