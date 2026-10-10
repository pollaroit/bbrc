"use client";

import { AddBookInputSchema } from "@bbrc/api/modules/book/book.schema";
import { generateSlug, openLibraryWorkKeyToOlid } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { Separator } from "@bbrc/ui/components/separator";
import { Textarea } from "@bbrc/ui/components/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { parseAsBoolean, parseAsString, useQueryState } from "nuqs";
import { useEffect, useMemo, useRef, useState } from "react";
import { useController } from "react-hook-form";
import { toast } from "sonner";
import { BookOriginCountriesField } from "@/components/blocks/book-origin-countries-field";
import {
	BookReadAfterPicker,
	type ReadAfterBookSelection,
} from "@/components/blocks/book-read-after-picker";
import { OpenLibraryWorkResults } from "@/components/blocks/open-library-work-results";
import { useAppForm } from "@/hooks/use-app-form";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
	AddNewBookFormSchema,
	type AddNewBookFormValues,
	authorsToText,
	parseAuthorsText,
	toAddBookInput,
} from "@/lib/add-book-form";
import {
	fetchOpenLibraryEditionHints,
	fetchOpenLibraryWorkByOlid,
	searchOpenLibraryWorks,
} from "@/lib/open-library/client";
import type { OpenLibrarySearchWork } from "@/lib/open-library/types";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

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

function coverUrl(coverId: number | null) {
	if (coverId == null) {
		return null;
	}

	return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
}

type AddBookDetailsFormProps = {
	work: OpenLibrarySearchWork;
	onCancel: () => void;
	onAddAnother: () => void;
	addMore: boolean;
	onAddMoreChange: (checked: boolean) => void;
};

function AddBookDetailsForm({
	work,
	onCancel,
	onAddAnother,
	addMore,
	onAddMoreChange,
}: AddBookDetailsFormProps) {
	const router = useRouter();
	const addMoreRef = useRef(addMore);
	addMoreRef.current = addMore;
	const initialValues = useMemo(() => workToFormValues(work), [work]);
	const workOlid = useMemo(() => requireWorkOlid(work), [work]);
	const [acceptanceNotes, setAcceptanceNotes] = useState("");
	const [readAfterBooks, setReadAfterBooks] = useState<
		ReadAfterBookSelection[]
	>([]);
	const [countriesTouched, setCountriesTouched] = useState(false);
	const countriesTouchedRef = useRef(false);

	const form = useAppForm(AddNewBookFormSchema, initialValues);
	const countriesField = useController({
		name: "countries",
		control: form.control,
		defaultValue: initialValues.countries,
	});

	const { data: pendingRequests } = useQuery({
		...orpc.bookRequest.listPending.queryOptions(),
		staleTime: 30_000,
	});

	const hasPendingMemberRequest = useMemo(
		() =>
			pendingRequests?.items.some((item) => item.olid === workOlid) ?? false,
		[pendingRequests?.items, workOlid],
	);

	const { data: editionHints, isFetching: isLoadingEditions } = useQuery({
		queryKey: ["open-library-editions", work.workKey],
		queryFn: () => fetchOpenLibraryEditionHints(work.workKey),
		staleTime: 3600_000,
	});

	useEffect(() => {
		if (!editionHints) {
			return;
		}

		if (editionHints.suggestedPages != null) {
			form.setValue("pages", editionHints.suggestedPages, {
				shouldDirty: false,
			});
		}

		if (editionHints.openLibraryRating != null) {
			form.setValue("openLibraryRating", editionHints.openLibraryRating, {
				shouldDirty: false,
			});
		}

		const excerpt = editionHints.excerpt ?? work.description ?? null;
		if (excerpt) {
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
	const authorsText = form.watch("authorsText");
	const publishedIn = form.watch("publishedIn");
	const excerptForOrigin = form.watch("excerpt");

	const debouncedOriginInput = useDebouncedValue(
		{
			title,
			authorsText,
			publishedIn,
			excerpt: excerptForOrigin,
		},
		700,
	);

	const originAuthors = useMemo(
		() => parseAuthorsText(debouncedOriginInput.authorsText),
		[debouncedOriginInput.authorsText],
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
		if (countriesTouchedRef.current || !suggestedCountriesKey) {
			return;
		}
		const next = originSuggestion?.countries;
		if (!next?.length) {
			return;
		}
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

	const coverId = form.watch("coverId");
	const excerptValue = form.watch("excerpt");
	const coverSrc = coverUrl(coverId);

	const pageHintsDescription = useMemo(() => {
		if (isLoadingEditions) {
			return "Loading page counts from Open Library editions…";
		}

		if (!editionHints?.pageCountHints.length) {
			return "No page counts found in Open Library editions. Enter manually.";
		}

		const counts = editionHints.pageCountHints.join(", ");
		const turkishNote =
			editionHints.pageCountHints.length > 0
				? " (Turkish editions preferred when available)"
				: "";

		return `Edition page counts${turkishNote}: ${counts}${
			editionHints.suggestedPages != null
				? `. Suggested median: ${editionHints.suggestedPages}.`
				: "."
		}`;
	}, [editionHints, isLoadingEditions]);

	const openLibraryRatingDescription = useMemo(() => {
		if (isLoadingEditions) {
			return "Loading Open Library community rating…";
		}

		if (editionHints?.openLibraryRating != null) {
			return "Average from Open Library community ratings (0–5).";
		}

		return "No community rating on Open Library for this work.";
	}, [editionHints, isLoadingEditions]);

	const excerptDescription = useMemo(() => {
		if (isLoadingEditions) {
			return "Loading description from Open Library…";
		}

		if (excerptValue?.trim()) {
			return "Description from Open Library.";
		}

		return "No description on Open Library for this work.";
	}, [excerptValue, isLoadingEditions]);

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
					queryKey: orpc.bookRequest.listMine.key(),
				});
				void queryClient.invalidateQueries({
					queryKey: orpc.book.listCatalogOlids.key(),
				});
				toast.success("Book added to the library.");
				if (addMoreRef.current) {
					onAddAnother();
					return;
				}
				router.push(`/books/${result.slug}` as Route);
			},
			onError: (error) => {
				toast.error(error.message ?? "Could not add this book.");
			},
		}),
	);

	const onReadAfterChange = (books: ReadAfterBookSelection[]) => {
		setReadAfterBooks(books);
		form.setValue(
			"readAfterBookSlugs",
			books.map((book) => book.slug),
			{ shouldDirty: true },
		);
	};

	const onSubmit = form.handleSubmit(
		(values) => {
			const parsed = toAddBookInput({
				...values,
				readAfterBookSlugs: readAfterBooks.map((book) => book.slug),
			});

			if (parsed.pages < 1) {
				form.setError("pages", { message: "Pages is required" });
				return;
			}

			const trimmedNotes = acceptanceNotes.trim();
			const withNotes =
				trimmedNotes.length > 0
					? { ...parsed, acceptanceNotes: trimmedNotes }
					: parsed;

			const apiCheck = AddBookInputSchema.safeParse(withNotes);
			if (!apiCheck.success) {
				toast.error(apiCheck.error.issues[0]?.message ?? "Invalid form data");
				return;
			}

			addBookMutation.mutate(apiCheck.data);
		},
		() => {
			toast.error("Fix the highlighted fields and try again.");
		},
	);

	return (
		<form onSubmit={onSubmit} noValidate className="flex flex-col gap-6 pb-24">
			<FieldSet className="gap-4">
				<FieldLegend>Book details</FieldLegend>
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

					<Field>
						<FieldLegend variant="label">Slug (preview)</FieldLegend>
						<Input
							readOnly
							value={slugPreview}
							className="bg-muted/40 text-muted-foreground"
							aria-readonly
						/>
						<FieldDescription>
							Generated from the title when the book is saved.
						</FieldDescription>
					</Field>

					<form.Input
						name="authorsText"
						label="Authors"
						render={(field, fieldState) => (
							<Input
								id={field.name}
								placeholder="Author One, Author Two"
								aria-invalid={fieldState.invalid}
								{...field}
							/>
						)}
					/>

					<div className="space-y-0">
						<form.Input
							name="excerpt"
							label="Excerpt"
							render={(field, fieldState) => (
								<Textarea
									id={field.name}
									readOnly
									rows={5}
									className="min-h-28 resize-none bg-muted/40 text-muted-foreground"
									aria-invalid={fieldState.invalid}
									aria-readonly
									value={field.value ?? ""}
									name={field.name}
									ref={field.ref}
								/>
							)}
						/>
						<FieldDescription>{excerptDescription}</FieldDescription>
					</div>

					<div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
						<div className="relative aspect-2/3 w-24 overflow-hidden bg-muted ring-1 ring-foreground/10">
							{coverSrc ? (
								<Image
									src={coverSrc}
									alt=""
									fill
									className="object-cover"
									sizes="96px"
								/>
							) : (
								<div className="flex size-full items-center justify-center text-muted-foreground text-xs">
									No cover
								</div>
							)}
						</div>
						<form.Input
							name="coverId"
							label="Open Library cover ID"
							render={(field, fieldState) => (
								<Input
									id={field.name}
									readOnly
									value={field.value ?? ""}
									className="bg-muted/40 text-muted-foreground"
									aria-invalid={fieldState.invalid}
									aria-readonly
								/>
							)}
						/>
					</div>

					<div className="grid gap-4 sm:grid-cols-3">
						<div className="space-y-0">
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
							<FieldDescription>{pageHintsDescription}</FieldDescription>
						</div>

						<div className="space-y-0">
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
							<FieldDescription>
								{openLibraryRatingDescription}
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
					</div>
				</FieldGroup>

				<BookOriginCountriesField
					value={countriesField.field.value}
					isSuggesting={isSuggestingOrigin && !countriesTouched}
					onTouched={markCountriesTouched}
					onChange={(next) => {
						markCountriesTouched();
						countriesField.field.onChange(next);
					}}
				/>

				<BookReadAfterPicker
					selected={readAfterBooks}
					onChange={onReadAfterChange}
				/>
			</FieldSet>

			{hasPendingMemberRequest ? (
				<FieldSet className="gap-3">
					<FieldLegend variant="label">Member request</FieldLegend>
					<Field>
						<FieldLabel htmlFor="acceptance-notes">
							Acceptance note (optional)
						</FieldLabel>
						<Textarea
							id="acceptance-notes"
							value={acceptanceNotes}
							maxLength={200}
							rows={3}
							placeholder="Short note for the member who requested this title…"
							onChange={(event) => setAcceptanceNotes(event.target.value)}
						/>
						<FieldDescription>
							Shown to the requester when this book is added ·{" "}
							{acceptanceNotes.trim().length}/200
						</FieldDescription>
					</Field>
				</FieldSet>
			) : null}

			<div className="flex flex-col gap-4">
				{/** biome-ignore lint/a11y/noLabelWithoutControl: checkbox is the control */}
				<label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
					<Checkbox
						checked={addMore}
						onCheckedChange={(checked) => onAddMoreChange(checked === true)}
					/>
					Add more
				</label>
				<div className="flex flex-wrap gap-2">
					<form.Submit
						className={cn("min-w-32")}
						loading={addBookMutation.isPending}
						loadingText="Adding…"
					>
						Add book
					</form.Submit>
					<Button type="button" variant="outline" onClick={onCancel}>
						Cancel
					</Button>
				</div>
			</div>
		</form>
	);
}

export function AddNewBookForm() {
	const searchInputRef = useRef<HTMLInputElement>(null);
	const [addMore, setAddMore] = useQueryState(
		"add_more",
		parseAsBoolean.withDefault(false),
	);
	const [prefillOlid, setPrefillOlid] = useQueryState("olid", parseAsString);
	const [searchQuery, setSearchQuery] = useState("");
	const debouncedQuery = useDebouncedValue(searchQuery, 500);
	const [selectedWork, setSelectedWork] =
		useState<OpenLibrarySearchWork | null>(null);

	const trimmedQuery = debouncedQuery.trim();
	const searchEnabled = trimmedQuery.length >= 2 && selectedWork == null;

	const { data: catalogOlidsData } = useQuery({
		...orpc.book.listCatalogOlids.queryOptions(),
		staleTime: 60_000,
	});

	const inCatalogOlids = useMemo(() => {
		const set = new Set<string>();
		for (const olid of catalogOlidsData?.olids ?? []) {
			const normalized = openLibraryWorkKeyToOlid(olid) ?? olid.toUpperCase();
			set.add(normalized);
		}
		return set;
	}, [catalogOlidsData?.olids]);

	const { data: searchData, isFetching: isSearching } = useQuery({
		queryKey: ["open-library-search", trimmedQuery],
		queryFn: () => searchOpenLibraryWorks(trimmedQuery),
		enabled: searchEnabled,
		staleTime: 60_000,
	});

	const {
		data: prefillWork,
		isError: prefillFailed,
		isFetching: isPrefillLoading,
	} = useQuery({
		queryKey: ["open-library-work-by-olid", prefillOlid],
		queryFn: () => fetchOpenLibraryWorkByOlid(prefillOlid ?? ""),
		enabled: prefillOlid != null && selectedWork == null,
		staleTime: 3600_000,
		retry: false,
	});

	useEffect(() => {
		if (!prefillWork || selectedWork != null) {
			return;
		}

		const olid = openLibraryWorkKeyToOlid(prefillWork.workKey);
		if (!olid) {
			toast.error("Could not load the requested Open Library work.");
			void setPrefillOlid(null);
			return;
		}

		if (inCatalogOlids.has(olid)) {
			toast.error("This book is already in the catalog.");
			void setPrefillOlid(null);
			return;
		}

		setSelectedWork(prefillWork);
	}, [prefillWork, inCatalogOlids, selectedWork, setPrefillOlid]);

	useEffect(() => {
		if (!prefillFailed || prefillOlid == null) {
			return;
		}

		toast.error("Could not load the requested Open Library work.");
		void setPrefillOlid(null);
	}, [prefillFailed, prefillOlid, setPrefillOlid]);

	const handleChangeWork = () => {
		setSelectedWork(null);
		void setPrefillOlid(null);
	};

	const handleSelectWork = (work: OpenLibrarySearchWork) => {
		const olid = openLibraryWorkKeyToOlid(work.workKey);
		if (!olid) {
			toast.error(
				"This Open Library work could not be linked. Try another result.",
			);
			return;
		}

		if (inCatalogOlids.has(olid)) {
			return;
		}

		setSelectedWork(work);
	};

	const handleAddAnother = () => {
		setSelectedWork(null);
		setSearchQuery("");
		requestAnimationFrame(() => {
			searchInputRef.current?.focus();
		});
	};

	const handleAddMoreChange = (checked: boolean) => {
		void setAddMore(checked ? true : null);
	};

	return (
		<div className="flex flex-col gap-8">
			<div className="space-y-3">
				<FieldSet className="gap-3">
					<FieldLegend variant="label">Search Open Library</FieldLegend>
					<FieldDescription>
						Find a work by title or author. Pick one to prefill the club book
						form.
					</FieldDescription>
					<div className="relative">
						<Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							ref={searchInputRef}
							type="search"
							value={searchQuery}
							placeholder="Search Open Library…"
							className="pl-8"
							disabled={selectedWork != null}
							onChange={(event) => {
								setSearchQuery(event.target.value);
							}}
						/>
					</div>
				</FieldSet>

				{selectedWork == null ? (
					isPrefillLoading && prefillOlid ? (
						<p className="text-muted-foreground text-sm">
							Loading requested book from Open Library…
						</p>
					) : (
						<OpenLibraryWorkResults
							works={searchData?.works ?? []}
							selectedWorkKey={null}
							onSelect={handleSelectWork}
							inCatalogOlids={inCatalogOlids}
							isLoading={searchEnabled && isSearching}
						/>
					)
				) : (
					<div className="flex flex-wrap items-center justify-between gap-2">
						<p className="text-muted-foreground text-sm">
							Selected:{" "}
							<span className="font-medium text-foreground">
								{selectedWork.title}
							</span>
						</p>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleChangeWork}
						>
							Choose another
						</Button>
					</div>
				)}
			</div>

			{selectedWork ? (
				<>
					<Separator />
					<AddBookDetailsForm
						key={selectedWork.workKey}
						work={selectedWork}
						onCancel={handleChangeWork}
						onAddAnother={handleAddAnother}
						addMore={addMore}
						onAddMoreChange={handleAddMoreChange}
					/>
				</>
			) : null}
		</div>
	);
}
