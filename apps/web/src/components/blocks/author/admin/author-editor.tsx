"use client";

import type { AuthorFieldMeta } from "@bbrc/shared";
import { AUTHOR_BIO_MAX_LENGTH, getBookCountryName } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import { Input } from "@bbrc/ui/components/input";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { Textarea } from "@bbrc/ui/components/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { Controller, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
	AuthorActionsPanel,
	invalidateAuthorQueries,
} from "@/components/blocks/author/admin/author-actions-panel";
import { AuthorAliasesPanel } from "@/components/blocks/author/admin/author-aliases-panel";
import { AuthorFieldShell } from "@/components/blocks/author/admin/author-field-shell";
import { AuthorPhotoPanel } from "@/components/blocks/author/admin/author-photo-panel";
import { AuthorStatusBadge } from "@/components/blocks/author/admin/author-status-badge";
import { BookOriginCountriesField } from "@/components/blocks/book-origin-countries-field";
import { useAppForm } from "@/hooks/use-app-form";
import {
	AUTHOR_GENDER_OPTIONS,
	AuthorEditFormSchema,
	type AuthorEditFormValues,
	authorToFormValues,
	toUpdateInput,
} from "@/lib/author-edit-form";
import { client, orpc, queryClient } from "@/utils/orpc";

const dateFormat = new Intl.DateTimeFormat("en", {
	dateStyle: "medium",
	timeStyle: "short",
});

function DateFields({
	prefix,
	label,
	meta,
	form,
	onToggleLock,
}: {
	prefix: "birth" | "death";
	label: string;
	meta: AuthorFieldMeta;
	form: ReturnType<typeof useAppForm<AuthorEditFormValues>>;
	onToggleLock: (field: keyof AuthorFieldMeta, locked: boolean) => void;
}) {
	const { errors } = form.formState;
	const yearKey = `${prefix}Year` as const;
	const monthKey = `${prefix}Month` as const;
	const dayKey = `${prefix}Day` as const;
	const error =
		errors[yearKey]?.message ??
		errors[monthKey]?.message ??
		errors[dayKey]?.message;

	return (
		<AuthorFieldShell
			label={label}
			htmlFor={`author-${yearKey}`}
			field={prefix}
			meta={meta}
			onToggleLock={onToggleLock}
			error={error}
			description="A year alone is fine; add the month and day when you know them."
		>
			<div className="grid grid-cols-[1fr_5rem_5rem] gap-2">
				{(
					[
						[yearKey, "Year", "1821"],
						[monthKey, "Month", "11"],
						[dayKey, "Day", "11"],
					] as const
				).map(([key, text, placeholder]) => (
					<Controller
						key={key}
						control={form.control}
						name={key}
						render={({ field, fieldState }) => (
							<Input
								id={`author-${key}`}
								inputMode="numeric"
								placeholder={`${text} (${placeholder})`}
								aria-label={`${label}: ${text.toLowerCase()}`}
								aria-invalid={fieldState.invalid}
								value={field.value}
								onChange={field.onChange}
								onBlur={field.onBlur}
								name={field.name}
								ref={field.ref}
							/>
						)}
					/>
				))}
			</div>
		</AuthorFieldShell>
	);
}

function EditorSkeleton() {
	return (
		<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]" aria-hidden>
			<div className="flex flex-col gap-4">
				<Skeleton className="h-10 w-72" />
				<Skeleton className="h-64 w-full" />
				<Skeleton className="h-64 w-full" />
			</div>
			<div className="flex flex-col gap-4">
				<Skeleton className="h-64 w-full" />
				<Skeleton className="h-40 w-full" />
			</div>
		</div>
	);
}

export function AuthorEditor({ slug }: { slug: string }) {
	const query = useQuery(
		orpc.authorAdmin.getForEdit.queryOptions({ input: { slug } }),
	);

	if (query.isPending) return <EditorSkeleton />;
	if (query.isError || !query.data) {
		return (
			<div className="flex flex-col items-start gap-3">
				<p className="text-muted-foreground text-sm">
					{query.error?.message || "Could not load this author."}
				</p>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => void query.refetch()}
				>
					Try again
				</Button>
			</div>
		);
	}

	return <AuthorEditorForm slug={slug} author={query.data} />;
}

type EditData = Awaited<ReturnType<typeof client.authorAdmin.getForEdit>>;

function AuthorEditorForm({
	slug,
	author,
}: {
	slug: string;
	author: EditData;
}) {
	const initialValues = useMemo(() => authorToFormValues(author), [author]);
	const serverKey = JSON.stringify(initialValues);
	const form = useAppForm(AuthorEditFormSchema, initialValues);
	const meta = author.fieldMeta;
	const queryKey = orpc.authorAdmin.getForEdit.queryOptions({
		input: { slug },
	}).queryKey;

	// New values from the server (a refresh, a save) replace the form; lock toggles do not change them.
	const lastKey = useRef(serverKey);
	useEffect(() => {
		if (lastKey.current === serverKey) return;
		lastKey.current = serverKey;
		form.reset(initialValues);
	}, [serverKey, initialValues, form]);

	const dirty = form.formState.isDirty;
	const bioLength = useWatch({ control: form.control, name: "bio" }).trim()
		.length;
	const nationalities = useWatch({
		control: form.control,
		name: "nationalities",
	});

	const save = useMutation({
		mutationFn: (input: NonNullable<ReturnType<typeof toUpdateInput>>) =>
			client.authorAdmin.update(input),
		onSuccess: () => {
			invalidateAuthorQueries();
			toast.success("Saved.");
		},
		onError: (error) =>
			toast.error(error.message || "Could not save this author."),
	});

	const lock = useMutation({
		mutationFn: (vars: { field: keyof AuthorFieldMeta; locked: boolean }) =>
			client.authorAdmin.setLock({ id: author.id, ...vars }),
		onMutate: async (vars) => {
			await queryClient.cancelQueries({ queryKey });
			const previous = queryClient.getQueryData(queryKey);
			queryClient.setQueryData(queryKey, (old: EditData | undefined) =>
				old
					? {
							...old,
							fieldMeta: {
								...old.fieldMeta,
								[vars.field]: {
									source: old.fieldMeta[vars.field]?.source ?? "admin",
									locked: vars.locked,
								},
							},
						}
					: old,
			);
			return { previous };
		},
		onError: (error, _vars, context) => {
			if (context?.previous)
				queryClient.setQueryData(queryKey, context.previous);
			toast.error(error.message || "Could not change the lock.");
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey });
		},
	});

	const toggleLock = (field: keyof AuthorFieldMeta, locked: boolean) =>
		lock.mutate({ field, locked });

	const onSubmit = form.handleSubmit(
		(values) => {
			const input = toUpdateInput(author.id, values, initialValues);
			if (!input) return;
			save.mutate(input);
		},
		() => toast.error("Fix the highlighted fields to save."),
	);

	const { errors } = form.formState;
	const canonicalSlug = author.slug;

	return (
		<form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
			<div className="flex flex-col gap-3">
				<Link
					href={`/authors/${canonicalSlug}` as Route}
					className="inline-flex w-fit items-center gap-1 text-muted-foreground text-sm transition-colors hover:text-foreground"
				>
					<ArrowLeft className="size-4" aria-hidden />
					Back to the author page
				</Link>
				<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
					<h1 className="font-bold text-2xl tracking-tight">
						Edit {author.name}
					</h1>
					<AuthorStatusBadge status={author.status} />
				</div>
				<p className="max-w-2xl text-muted-foreground text-sm">
					Fields you change are saved as “added by an admin”. Lock a field to
					keep a refresh from the sources from changing it.
					{author.enrichmentStatus === "failed" ? (
						<span className="text-destructive">
							{" "}
							The last automatic lookup failed
							{author.enrichmentError ? `: ${author.enrichmentError}` : "."}
						</span>
					) : author.enrichedAt ? (
						<>
							{" "}
							Last looked up {dateFormat.format(new Date(author.enrichedAt))}.
						</>
					) : null}
				</p>
			</div>

			<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
				<div className="flex min-w-0 flex-col gap-6">
					<Card size="sm">
						<CardHeader>
							<CardTitle>Name</CardTitle>
							<CardDescription>
								Renaming never changes the author's address:{" "}
								<span className="font-mono">/authors/{canonicalSlug}</span>
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-4 sm:grid-cols-2">
							<AuthorFieldShell
								label="Name"
								htmlFor="author-name"
								field="name"
								meta={meta}
								onToggleLock={toggleLock}
								error={errors.name?.message}
							>
								<Input
									id="author-name"
									aria-invalid={Boolean(errors.name)}
									{...form.register("name")}
								/>
							</AuthorFieldShell>
							<AuthorFieldShell
								label="Sort name"
								htmlFor="author-sortName"
								field="sortName"
								meta={meta}
								onToggleLock={toggleLock}
								error={errors.sortName?.message}
								description="Like “Tolkien, J. R. R.”. Used when ordering by name."
							>
								<Input id="author-sortName" {...form.register("sortName")} />
							</AuthorFieldShell>
							<AuthorFieldShell
								label="Gender"
								htmlFor="author-gender"
								field="gender"
								meta={meta}
								onToggleLock={toggleLock}
							>
								<Controller
									control={form.control}
									name="gender"
									render={({ field }) => (
										<Select value={field.value} onValueChange={field.onChange}>
											<SelectTrigger id="author-gender" className="w-full">
												<SelectValue placeholder="Gender" />
											</SelectTrigger>
											<SelectContent alignItemWithTrigger={false}>
												{AUTHOR_GENDER_OPTIONS.map((option) => (
													<SelectItem key={option.value} value={option.value}>
														{option.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
								/>
							</AuthorFieldShell>
						</CardContent>
					</Card>

					<Card size="sm">
						<CardHeader>
							<CardTitle>Biography</CardTitle>
							<CardDescription>
								Plain text. A bio taken from Wikipedia is credited on the About
								tab.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<AuthorFieldShell
								label="Bio"
								htmlFor="author-bio"
								field="bio"
								meta={meta}
								onToggleLock={toggleLock}
								error={errors.bio?.message}
								description={
									<span className="tabular-nums">
										{bioLength.toLocaleString()} /{" "}
										{AUTHOR_BIO_MAX_LENGTH.toLocaleString()} characters
									</span>
								}
							>
								<Textarea
									id="author-bio"
									rows={8}
									aria-invalid={Boolean(errors.bio)}
									{...form.register("bio")}
								/>
							</AuthorFieldShell>
						</CardContent>
					</Card>

					<Card size="sm">
						<CardHeader>
							<CardTitle>Life</CardTitle>
						</CardHeader>
						<CardContent className="grid gap-4 sm:grid-cols-2">
							<DateFields
								prefix="birth"
								label="Born"
								meta={meta}
								form={form}
								onToggleLock={toggleLock}
							/>
							<DateFields
								prefix="death"
								label="Died"
								meta={meta}
								form={form}
								onToggleLock={toggleLock}
							/>
							<AuthorFieldShell
								label="Place of birth"
								htmlFor="author-birthPlace"
								field="birthPlace"
								meta={meta}
								onToggleLock={toggleLock}
								error={errors.birthPlace?.message}
							>
								<Input
									id="author-birthPlace"
									{...form.register("birthPlace")}
								/>
							</AuthorFieldShell>
							<AuthorFieldShell
								label="Place of death"
								htmlFor="author-deathPlace"
								field="deathPlace"
								meta={meta}
								onToggleLock={toggleLock}
								error={errors.deathPlace?.message}
							>
								<Input
									id="author-deathPlace"
									{...form.register("deathPlace")}
								/>
							</AuthorFieldShell>
							<AuthorFieldShell
								label="Nationality"
								field="nationalities"
								meta={meta}
								onToggleLock={toggleLock}
								error={errors.nationalities?.message}
								className="sm:col-span-2"
							>
								<BookOriginCountriesField
									value={nationalities}
									onChange={(next) =>
										form.setValue("nationalities", next, {
											shouldDirty: true,
											shouldValidate: true,
										})
									}
								/>
								{nationalities.length > 0 ? (
									<p className="sr-only">
										{nationalities
											.map((code) => getBookCountryName(code) ?? code)
											.join(", ")}
									</p>
								) : null}
							</AuthorFieldShell>
						</CardContent>
					</Card>

					<Card size="sm">
						<CardHeader>
							<CardTitle>Links and ids</CardTitle>
							<CardDescription>
								Links must start with https://. The Wikidata id lets us suggest
								a photo and fill the details.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-4 sm:grid-cols-2">
							{(
								[
									["wikipediaUrl", "Wikipedia", true],
									["goodreadsUrl", "Goodreads", true],
									["websiteUrl", "Website", true],
								] as const
							).map(([key, label]) => (
								<AuthorFieldShell
									key={key}
									label={label}
									htmlFor={`author-${key}`}
									field={key}
									meta={meta}
									onToggleLock={toggleLock}
									error={errors[key]?.message}
								>
									<Input
										id={`author-${key}`}
										inputMode="url"
										placeholder="https://"
										{...form.register(key)}
									/>
								</AuthorFieldShell>
							))}
							<AuthorFieldShell
								label="Open Library author id"
								htmlFor="author-openLibraryId"
								error={errors.openLibraryId?.message}
							>
								<Input
									id="author-openLibraryId"
									placeholder="OL26320A"
									{...form.register("openLibraryId")}
								/>
							</AuthorFieldShell>
							<AuthorFieldShell
								label="Wikidata id"
								htmlFor="author-wikidataId"
								error={errors.wikidataId?.message}
							>
								<Input
									id="author-wikidataId"
									placeholder="Q892"
									{...form.register("wikidataId")}
								/>
							</AuthorFieldShell>
							{author.openLibraryId ? (
								<a
									href={`https://openlibrary.org/authors/${author.openLibraryId}`}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex w-fit items-center gap-1 text-muted-foreground text-xs hover:text-foreground"
								>
									Open on Open Library
									<ExternalLink className="size-3" aria-hidden />
								</a>
							) : null}
						</CardContent>
					</Card>
				</div>

				<aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-4">
					<AuthorPhotoPanel
						authorId={author.id}
						name={author.name}
						photoUrl={author.photoUrl}
						photoCredit={author.photoCredit}
						photoLicense={author.photoLicense}
						photoSourceUrl={author.photoSourceUrl}
						hasWikidata={Boolean(author.wikidataId)}
						onChanged={invalidateAuthorQueries}
					/>
					<AuthorAliasesPanel
						authorId={author.id}
						aliases={author.aliases}
						onChanged={invalidateAuthorQueries}
					/>
					<AuthorActionsPanel
						author={{
							id: author.id,
							slug: author.slug,
							name: author.name,
							status: author.status,
							bookCount: author.bookCount,
							followerCount: author.followerCount,
							aliasCount: author.aliases.length,
						}}
						dirty={dirty}
					/>
					<p className="text-muted-foreground text-xs tabular-nums">
						{author.bookCount} {author.bookCount === 1 ? "book" : "books"} ·{" "}
						{author.followerCount}{" "}
						{author.followerCount === 1 ? "follower" : "followers"}
						{author.createdBy ? ` · added by ${author.createdBy.name}` : ""}
					</p>
				</aside>
			</div>

			<div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-end gap-2 border-border border-t bg-background/95 px-1 py-3 backdrop-blur">
				<span className="me-auto text-muted-foreground text-xs">
					{dirty ? "You have unsaved changes." : "All changes saved."}
				</span>
				<Button
					type="button"
					variant="ghost"
					disabled={!dirty || save.isPending}
					onClick={() => form.reset(initialValues)}
				>
					Discard changes
				</Button>
				<LoadingButton type="submit" loading={save.isPending} disabled={!dirty}>
					Save changes
				</LoadingButton>
			</div>
		</form>
	);
}
