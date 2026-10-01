"use client";

import { AddBookInputSchema } from "@bbrc/api/modules/book/book.schema";
import { generateSlug } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import {
	Field,
	FieldDescription,
	FieldGroup,
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
import { parseAsBoolean, useQueryState } from "nuqs";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { OpenLibraryWorkResults } from "@/components/blocks/open-library-work-results";
import { useAppForm } from "@/hooks/use-app-form";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
	AddNewBookFormSchema,
	type AddNewBookFormValues,
	authorsToText,
	toAddBookInput,
} from "@/lib/add-book-form";
import {
	fetchOpenLibraryEditionHints,
	searchOpenLibraryWorks,
} from "@/lib/open-library/client";
import type { OpenLibrarySearchWork } from "@/lib/open-library/types";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

function workToFormValues(work: OpenLibrarySearchWork): AddNewBookFormValues {
	return {
		title: work.title,
		authorsText: authorsToText(work.authors),
		coverId: work.coverId,
		openLibraryRating: null,
		excerpt: work.description,
		pages: 0,
		publishedIn: work.publishedIn ?? new Date().getFullYear(),
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

	const form = useAppForm(AddNewBookFormSchema, initialValues);

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
	}, [editionHints, form, work.description]);

	const title = form.watch("title");
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

	const onSubmit = form.handleSubmit(
		(values) => {
			const parsed = toAddBookInput(values);

			if (parsed.pages < 1) {
				form.setError("pages", { message: "Pages is required" });
				return;
			}

			const apiCheck = AddBookInputSchema.safeParse(parsed);
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
			</FieldSet>

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
	const [searchQuery, setSearchQuery] = useState("");
	const debouncedQuery = useDebouncedValue(searchQuery, 500);
	const [selectedWork, setSelectedWork] =
		useState<OpenLibrarySearchWork | null>(null);

	const trimmedQuery = debouncedQuery.trim();
	const searchEnabled = trimmedQuery.length >= 2 && selectedWork == null;

	const { data: searchData, isFetching: isSearching } = useQuery({
		queryKey: ["open-library-search", trimmedQuery],
		queryFn: () => searchOpenLibraryWorks(trimmedQuery),
		enabled: searchEnabled,
		staleTime: 60_000,
	});

	const handleChangeWork = () => {
		setSelectedWork(null);
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
					<OpenLibraryWorkResults
						works={searchData?.works ?? []}
						selectedWorkKey={null}
						onSelect={setSelectedWork}
						isLoading={searchEnabled && isSearching}
					/>
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
