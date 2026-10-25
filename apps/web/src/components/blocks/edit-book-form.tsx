"use client";

import type { TGetBookBySlugOutputSchema } from "@bbrc/api/modules/book/book.schema";
import type { SeriesPlacementValue } from "@bbrc/shared";
import { formatSeriesNumber } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLegend,
} from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { Textarea } from "@bbrc/ui/components/textarea";
import { useMutation } from "@tanstack/react-query";
import type { Route } from "next";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useController } from "react-hook-form";
import { toast } from "sonner";
import {
	AddBookSeriesField,
	type AddBookSeriesSelection,
} from "@/components/blocks/add-book-series-field";
import type { BookCoverValue } from "@/components/blocks/book-cover-field";
import {
	BookPreviewCard,
	BookWorkspace,
	BookWorkspaceActionBar,
	HotkeyChip,
	useBookFlowHotkeys,
} from "@/components/blocks/book-flow";
import { BookOriginCountriesField } from "@/components/blocks/book-origin-countries-field";
import {
	BookReadAfterPicker,
	type ReadAfterBookSelection,
} from "@/components/blocks/book-read-after-picker";
import { BookSubjectsField } from "@/components/blocks/book-subjects-field";
import {
	SuggestExcerptButton,
	SuggestSubjectsButton,
} from "@/components/blocks/book-suggest";
import {
	EditHotkeyBar,
	EditHotkeyHelp,
} from "@/components/blocks/edit-book-hotkeys";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { useAppForm } from "@/hooks/use-app-form";
import { parseAuthorsText } from "@/lib/add-book-form";
import {
	bookToEditFormValues,
	bookToSeriesPlacement,
	bookToSeriesSelection,
	buildSeriesUpdate,
	EditBookFormSchema,
	editFormProblems,
	editFormToast,
	isCoverChanged,
	isSeriesChanged,
	toUpdateBookInput,
} from "@/lib/edit-book-form";
import { useEditBookRedirect } from "@/lib/edit-book-search-params";
import {
	bookStatuses,
	bookStatusFilterLabels,
} from "@/lib/listing/books-listing";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

// The cropper is only needed when someone changes the cover.
const BookCoverField = dynamic(
	() =>
		import("@/components/blocks/book-cover-field").then(
			(mod) => mod.BookCoverField,
		),
	{
		ssr: false,
		loading: () => <Skeleton className="h-72 w-full" aria-hidden />,
	},
);

type EditBookFormProps = {
	book: TGetBookBySlugOutputSchema;
};

export function EditBookForm({ book }: EditBookFormProps) {
	const router = useRouter();
	const [redirectAfterSave] = useEditBookRedirect();
	const initialValues = useMemo(() => bookToEditFormValues(book), [book]);
	const form = useAppForm(EditBookFormSchema, initialValues);
	const countriesField = useController({
		name: "countries",
		control: form.control,
		defaultValue: initialValues.countries,
	});

	const [readAfterBooks, setReadAfterBooks] = useState<
		ReadAfterBookSelection[]
	>(() =>
		book.readAfterBooks.map((item) => ({
			...item,
			coverId: item.coverId ?? null,
		})),
	);

	const initialCoverId = book.coverId ?? null;
	const [cover, setCover] = useState<BookCoverValue>({
		coverId: initialCoverId,
		customCoverUrl: null,
	});

	const initialSelection = useMemo(() => bookToSeriesSelection(book), [book]);
	const initialPlacement = useMemo(() => bookToSeriesPlacement(book), [book]);
	const [seriesSelection, setSeriesSelection] =
		useState<AddBookSeriesSelection | null>(initialSelection);
	const [seriesPlacement, setSeriesPlacement] =
		useState<SeriesPlacementValue>(initialPlacement);

	const [helpOpen, setHelpOpen] = useState(false);
	const [leaveOpen, setLeaveOpen] = useState(false);
	const [openRequest, setOpenRequest] = useState<{
		id: string;
		nonce: number;
	} | null>(null);
	const savedRef = useRef(false);

	const title = form.watch("title");
	const authorsText = form.watch("authorsText");
	const excerpt = form.watch("excerpt");
	const pages = form.watch("pages");
	const publishedIn = form.watch("publishedIn");
	const status = form.watch("status");
	const subjects = form.watch("subjects");
	const authors = useMemo(() => parseAuthorsText(authorsText), [authorsText]);

	const dirty =
		form.formState.isDirty ||
		isCoverChanged(initialCoverId, cover) ||
		isSeriesChanged({
			initialSelection,
			initialPlacement,
			selection: seriesSelection,
			placement: seriesPlacement,
		});

	// Closing the tab or reloading with unsaved changes asks first.
	useEffect(() => {
		if (!dirty) return;
		function warn(event: BeforeUnloadEvent) {
			if (savedRef.current) return;
			event.preventDefault();
		}
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [dirty]);

	const leaveHref = (
		redirectAfterSave === "books" ? "/books" : `/books/${book.slug}`
	) as Route;

	function requestLeave() {
		if (dirty && !savedRef.current) {
			setLeaveOpen(true);
			return;
		}
		router.push(leaveHref);
	}

	const updateBookMutation = useMutation(
		orpc.book.updateBook.mutationOptions({
			onSuccess: () => {
				savedRef.current = true;
				void queryClient.invalidateQueries({
					queryKey: orpc.book.getBookList.key(),
				});
				void queryClient.invalidateQueries({
					queryKey: orpc.book.getBookBySlug.key(),
				});
				void queryClient.invalidateQueries({
					queryKey: orpc.series.key(),
				});
				toast.success("Book updated.");
				router.push(leaveHref);
			},
			onError: (error) => {
				toast.error(error.message ?? "Could not update this book.");
			},
		}),
	);

	const onReadAfterChange = (books: ReadAfterBookSelection[]) => {
		setReadAfterBooks(books);
		form.setValue(
			"readAfterBookSlugs",
			books.map((item) => item.slug),
			{ shouldDirty: true },
		);
	};

	const onSubmit = form.handleSubmit(
		(values) => {
			updateBookMutation.mutate(
				toUpdateBookInput(
					book.slug,
					{
						...values,
						readAfterBookSlugs: readAfterBooks.map((item) => item.slug),
					},
					{
						initialCoverId,
						cover,
						initialSubjects: initialValues.subjects,
						series: buildSeriesUpdate({
							initialSelection,
							initialPlacement,
							selection: seriesSelection,
							placement: seriesPlacement,
						}),
					},
				),
			);
		},
		(errors) => {
			// Say exactly what is wrong, open that section and move to the field.
			const problems = editFormProblems(errors);
			toast.error(editFormToast(problems));
			const first = problems[0];
			if (!first) return;
			setOpenRequest((current) => ({
				id: first.section,
				nonce: (current?.nonce ?? 0) + 1,
			}));
			window.setTimeout(() => {
				const target = document.getElementById(first.field);
				const holder =
					target ??
					document.getElementById(first.field === "subjects" ? "subjects" : "");
				const focusable =
					target instanceof HTMLElement &&
					["INPUT", "TEXTAREA", "BUTTON", "SELECT"].includes(target.tagName)
						? target
						: holder?.querySelector<HTMLElement>("input, textarea, button");
				focusable?.focus({ preventScroll: true });
				(focusable ?? holder)?.scrollIntoView({
					behavior: "smooth",
					block: "center",
				});
			}, 350);
		},
	);

	useBookFlowHotkeys(
		{
			save: () => {
				if (dirty && !updateBookMutation.isPending) void onSubmit();
			},
			back: requestLeave,
			help: () => setHelpOpen(true),
		},
		{ stage: "form" },
	);

	const errors = form.formState.errors;
	const seriesLabel = useMemo(() => {
		if (!seriesSelection) return null;
		const name =
			seriesSelection.kind === "existing"
				? seriesSelection.title
				: seriesSelection.draft.title;
		if (seriesSelection.kind === "new") return `#1 ${name}`;
		return seriesPlacement.position != null
			? `${formatSeriesNumber(seriesPlacement.position)} ${name}`
			: name;
	}, [seriesSelection, seriesPlacement.position]);

	const coverLabel = cover.customCoverUrl
		? "New uploaded cover"
		: cover.coverId == null
			? "No cover"
			: cover.coverId < 0
				? "Uploaded cover"
				: "Open Library cover";

	const preview = (
		<BookPreviewCard
			title={title}
			authors={authors}
			coverId={cover.coverId}
			coverUrl={cover.customCoverUrl}
			pages={pages}
			publishedIn={publishedIn}
			status={status}
			seriesLabel={seriesLabel}
			excerpt={excerpt}
		/>
	);

	return (
		<form onSubmit={onSubmit} noValidate className="pb-24">
			<BookWorkspace
				openRequest={openRequest}
				header={<EditHotkeyBar onOpenHelp={() => setHelpOpen(true)} />}
				preview={preview}
				sections={[
					{
						id: "cover",
						title: "Cover",
						description:
							"Pick another Open Library cover, or upload your own. Covers are always saved at the same 2:3 size.",
						status:
							cover.coverId != null || cover.customCoverUrl
								? "complete"
								: "attention",
						summary: coverLabel,
						content: (
							<BookCoverField
								title={title}
								olid={book.olid}
								value={cover}
								onChange={setCover}
								uploadedCoverPresent={
									initialCoverId != null && initialCoverId < 0
								}
							/>
						),
					},
					{
						id: "details",
						title: "Details",
						description: "What members see on the book page.",
						status:
							errors.title ||
							errors.authorsText ||
							errors.excerpt ||
							errors.pages ||
							errors.publishedIn ||
							errors.openLibraryRating ||
							errors.averageRating
								? "attention"
								: undefined,
						summary: [authors.join(", "), pages ? `${pages} pages` : null]
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

								<Field>
									<FieldLegend variant="label">Slug</FieldLegend>
									<Input
										readOnly
										value={book.slug}
										className="bg-muted/40 font-mono text-muted-foreground text-sm"
										aria-readonly
									/>
									<FieldDescription>
										Catalog URL slug cannot be changed after the book is
										created.
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

								<div className="flex flex-col gap-2">
									<form.Input
										name="excerpt"
										label="Excerpt"
										render={(field, fieldState) => (
											<Textarea
												id={field.name}
												rows={6}
												className="min-h-32 resize-y"
												aria-invalid={fieldState.invalid}
												value={field.value ?? ""}
												onChange={(event) => {
													const next = event.target.value;
													field.onChange(next === "" ? null : next);
												}}
												onBlur={field.onBlur}
												name={field.name}
												ref={field.ref}
											/>
										)}
									/>
									<SuggestExcerptButton
										title={title}
										authors={authors}
										publishedIn={publishedIn || undefined}
										excerpt={excerpt ?? undefined}
										onAccept={(text) =>
											form.setValue("excerpt", text, {
												shouldDirty: true,
												shouldValidate: true,
											})
										}
									/>
								</div>

								<div className="grid gap-4 sm:grid-cols-2">
									<form.Input
										name="pages"
										label="Pages"
										render={(field, fieldState) => (
											<Input
												id={field.name}
												type="number"
												min={1}
												inputMode="numeric"
												aria-invalid={fieldState.invalid}
												value={field.value}
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

									<form.Input
										name="openLibraryRating"
										label="Open Library rating"
										render={(field, fieldState) => (
											<Input
												id={field.name}
												type="number"
												min={0}
												max={5}
												step={0.1}
												inputMode="decimal"
												placeholder="Optional"
												aria-invalid={fieldState.invalid}
												value={
													field.value == null || field.value === 0
														? ""
														: field.value
												}
												onChange={(event) => {
													const next = event.target.value;
													field.onChange(
														next === "" ? null : Number.parseFloat(next),
													);
												}}
												onBlur={field.onBlur}
												name={field.name}
												ref={field.ref}
											/>
										)}
									/>

									<form.Input
										name="averageRating"
										label="Club average rating"
										render={(field, fieldState) => (
											<Input
												id={field.name}
												type="number"
												min={0}
												max={5}
												step={0.1}
												inputMode="decimal"
												placeholder="Optional"
												aria-invalid={fieldState.invalid}
												value={
													field.value == null || field.value === 0
														? ""
														: field.value
												}
												onChange={(event) => {
													const next = event.target.value;
													field.onChange(
														next === "" ? null : Number.parseFloat(next),
													);
												}}
												onBlur={field.onBlur}
												name={field.name}
												ref={field.ref}
											/>
										)}
									/>
								</div>
							</FieldGroup>
						),
					},
					{
						id: "classification",
						title: "Classification",
						description:
							"Reading status, subjects and where the book comes from.",
						status:
							errors.status || errors.subjects || errors.countries
								? "attention"
								: undefined,
						summary: `${bookStatusFilterLabels[status]}${subjects.length ? ` · ${subjects.length} subjects` : ""}`,
						content: (
							<FieldGroup>
								<form.Input
									name="status"
									label="Club reading status"
									render={(field, fieldState) => (
										<Select value={field.value} onValueChange={field.onChange}>
											<SelectTrigger
												id={field.name}
												className="w-full sm:max-w-xs"
												aria-invalid={fieldState.invalid}
											>
												<SelectValue placeholder="Status" />
											</SelectTrigger>
											<SelectContent alignItemWithTrigger={false}>
												{bookStatuses.map((value) => (
													<SelectItem key={value} value={value}>
														{bookStatusFilterLabels[value]}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
								/>

								<BookSubjectsField
									value={subjects}
									onChange={(next) =>
										form.setValue("subjects", next, {
											shouldDirty: true,
											shouldValidate: true,
										})
									}
									suggest={
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
								{errors.subjects?.message ? (
									<FieldError>{errors.subjects.message}</FieldError>
								) : null}

								<BookOriginCountriesField
									value={countriesField.field.value}
									onChange={countriesField.field.onChange}
								/>
								{errors.countries?.message ? (
									<FieldError id="countries">
										{errors.countries.message}
									</FieldError>
								) : null}
							</FieldGroup>
						),
					},
					{
						id: "series",
						title: "Series and order",
						description:
							"Move this book within its series, to another one, or out of it.",
						summary: seriesLabel ?? "Not in a series",
						content: (
							<AddBookSeriesField
								mode="edit"
								selection={seriesSelection}
								onChange={setSeriesSelection}
								placement={seriesPlacement}
								onPlacementChange={setSeriesPlacement}
								bookTitle={title}
								restoreSelection={initialSelection}
								excludeBookSlug={book.slug}
							/>
						),
					},
					{
						id: "reading-order",
						title: "Reading order",
						description: "Books members should read before this one.",
						summary: readAfterBooks.length
							? `After ${readAfterBooks.length} ${readAfterBooks.length === 1 ? "book" : "books"}`
							: "No prerequisites",
						content: (
							<BookReadAfterPicker
								selected={readAfterBooks}
								onChange={onReadAfterChange}
								excludeSlug={book.slug}
							/>
						),
					},
				]}
				actionBar={
					<BookWorkspaceActionBar
						hint={dirty ? "You have unsaved changes." : undefined}
						leading={
							<Button type="button" variant="outline" onClick={requestLeave}>
								Cancel
							</Button>
						}
						trailing={
							<form.Submit
								className={cn("min-w-36 gap-2")}
								disabled={!dirty}
								loading={updateBookMutation.isPending}
								loadingText="Saving…"
							>
								Save changes
								<HotkeyChip id="save" className="opacity-70" />
							</form.Submit>
						}
					/>
				}
			/>

			<EditHotkeyHelp open={helpOpen} onOpenChange={setHelpOpen} />
			<DestructiveConfirmDialog
				open={leaveOpen}
				onOpenChange={setLeaveOpen}
				title="Discard your changes?"
				description="You changed this book but have not saved. Leaving now throws those changes away."
				confirmLabel="Discard changes"
				cancelLabel="Keep editing"
				onConfirm={() => {
					savedRef.current = true;
					setLeaveOpen(false);
					router.push(leaveHref);
				}}
			/>
		</form>
	);
}
