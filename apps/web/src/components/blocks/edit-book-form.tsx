"use client";

import type { TGetBookBySlugOutputSchema } from "@bbrc/api/modules/book/book.schema";
import { Button } from "@bbrc/ui/components/button";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLegend,
	FieldSet,
} from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { Textarea } from "@bbrc/ui/components/textarea";
import { useMutation } from "@tanstack/react-query";
import type { Route } from "next";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useController } from "react-hook-form";
import { toast } from "sonner";
import { BookOriginCountriesField } from "@/components/blocks/book-origin-countries-field";
import {
	BookReadAfterPicker,
	type ReadAfterBookSelection,
} from "@/components/blocks/book-read-after-picker";
import { useAppForm } from "@/hooks/use-app-form";
import { bookCoverUrl } from "@/lib/book-cover";
import {
	bookToEditFormValues,
	EditBookFormSchema,
	toUpdateBookInput,
} from "@/lib/edit-book-form";
import {
	bookStatuses,
	bookStatusFilterLabels,
} from "@/lib/listing/books-listing";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

type EditBookFormProps = {
	book: TGetBookBySlugOutputSchema;
};

export function EditBookForm({ book }: EditBookFormProps) {
	const router = useRouter();
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

	const coverId = form.watch("coverId");
	const coverSrc = bookCoverUrl(coverId);

	const updateBookMutation = useMutation(
		orpc.book.updateBook.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({
					queryKey: orpc.book.getBookList.key(),
				});
				void queryClient.invalidateQueries({
					queryKey: orpc.book.getBookBySlug.key(),
				});
				toast.success("Book updated.");
				router.push(`/books/${book.slug}` as Route);
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
				toUpdateBookInput(book.slug, {
					...values,
					readAfterBookSlugs: readAfterBooks.map((item) => item.slug),
				}),
			);
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
						<FieldLegend variant="label">Slug</FieldLegend>
						<Input
							readOnly
							value={book.slug}
							className="bg-muted/40 font-mono text-muted-foreground text-sm"
							aria-readonly
						/>
						<FieldDescription>
							Catalog URL slug cannot be changed after the book is created.
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

					<form.Input
						name="excerpt"
						label="Excerpt"
						render={(field, fieldState) => (
							<Textarea
								id={field.name}
								rows={5}
								className="min-h-28 resize-y"
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
									type="number"
									inputMode="numeric"
									aria-invalid={fieldState.invalid}
									value={field.value ?? ""}
									onChange={(event) => {
										const next = event.target.value;
										field.onChange(
											next === "" ? null : Number.parseInt(next, 10),
										);
									}}
									onBlur={field.onBlur}
									name={field.name}
									ref={field.ref}
								/>
							)}
						/>
					</div>

					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
										field.onChange(next === "" ? 0 : Number.parseInt(next, 10));
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
									type="number"
									min={0}
									max={5}
									step={0.1}
									inputMode="decimal"
									placeholder="Optional"
									aria-invalid={fieldState.invalid}
									value={
										field.value == null || field.value === 0 ? "" : field.value
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
										field.value == null || field.value === 0 ? "" : field.value
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
									{bookStatuses.map((status) => (
										<SelectItem key={status} value={status}>
											{bookStatusFilterLabels[status]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					/>

					<BookOriginCountriesField
						value={countriesField.field.value}
						onChange={countriesField.field.onChange}
					/>

					<BookReadAfterPicker
						selected={readAfterBooks}
						onChange={onReadAfterChange}
						excludeSlug={book.slug}
					/>
				</FieldGroup>
			</FieldSet>

			<div className="flex flex-wrap gap-2">
				<form.Submit
					className={cn("min-w-32")}
					loading={updateBookMutation.isPending}
					loadingText="Saving…"
				>
					Save changes
				</form.Submit>
				<Button
					type="button"
					variant="outline"
					onClick={() => {
						router.push(`/books/${book.slug}` as Route);
					}}
				>
					Cancel
				</Button>
			</div>
		</form>
	);
}
