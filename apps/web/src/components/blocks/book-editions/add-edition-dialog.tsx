"use client";

/**
 * Add (or edit) a member edition: the second source of editions, for when a
 * member's copy is not on Open Library.
 *
 * <AddEditionDialog
 *   bookSlug, bookTitle   the book it belongs to
 *   open, onOpenChange    controlled visibility
 *   onCreated(edition)    called with the saved edition (create or edit)
 *   onDuplicate?(id)      the ISBN is already listed: id of the existing edition
 *   edition?              pass an existing edition to edit it instead
 * />
 *
 * An ISBN can be looked up on Open Library to fill the form. The cover is
 * uploaded through the same 2:3 cropper the book covers use; nothing is
 * saved until "Save edition".
 */

import type { BookEditionItem } from "@bbrc/api/modules/book-edition/book-edition.schema";
import { BOOK_EDITION_LANGUAGES } from "@bbrc/api/modules/book-edition/book-edition.schema";
import { isValidIsbn } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
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
import { ImagePlus, Loader2, Search, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { bookCoverFrameClassName } from "@/lib/book-cover";
import {
	EDITION_FORMAT_LABELS,
	languageLabel,
} from "@/lib/book-edition/edition-meta";
import { fetchOpenLibraryEditionByIsbn } from "@/lib/open-library/edition-lookup";
import { uploadEditionCover } from "@/lib/storage/upload-edition-cover";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

const CoverCropper = dynamic(
	() =>
		import("@/components/blocks/cover-cropper").then((mod) => mod.CoverCropper),
	{ ssr: false },
);

type Props = {
	bookSlug: string;
	bookTitle: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated?: (edition: BookEditionItem) => void;
	onDuplicate?: (editionId: string) => void;
	edition?: BookEditionItem | null;
};

type Lang = (typeof BOOK_EDITION_LANGUAGES)[number];
type Format = BookEditionItem["format"];
const FORMATS = Object.keys(EDITION_FORMAT_LABELS) as Format[];

type FormState = {
	isbn: string;
	title: string;
	language: Lang;
	format: Format;
	pages: string;
	publisher: string;
	year: string;
	translator: string;
	notes: string;
	coverUrl: string | null;
};

const EMPTY: FormState = {
	isbn: "",
	title: "",
	language: "eng",
	format: "paperback",
	pages: "",
	publisher: "",
	year: "",
	translator: "",
	notes: "",
	coverUrl: null,
};

function fromEdition(edition: BookEditionItem): FormState {
	return {
		isbn: edition.isbn13 ?? edition.isbn10 ?? "",
		title: edition.title ?? "",
		language: edition.language as Lang,
		format: edition.format,
		pages: String(edition.pages),
		publisher: edition.publisher ?? "",
		year: edition.publishedYear ? String(edition.publishedYear) : "",
		translator: edition.translator ?? "",
		notes: edition.notes ?? "",
		coverUrl: edition.coverUrl,
	};
}

const listKey = (bookSlug: string) =>
	orpc.bookEdition.list.queryKey({ input: { bookSlug } });

type ListData = { items: BookEditionItem[]; addsLeftToday: number | null };

export function AddEditionDialog({
	bookSlug,
	bookTitle,
	open,
	onOpenChange,
	onCreated,
	onDuplicate,
	edition = null,
}: Props) {
	const uid = useId();
	const editing = edition != null;
	const [form, setForm] = useState<FormState>(EMPTY);
	const [lookingUp, setLookingUp] = useState(false);
	const [lookupNote, setLookupNote] = useState<string | null>(null);
	const [cropFile, setCropFile] = useState<File | null>(null);
	const [uploading, setUploading] = useState(false);
	const [duplicateId, setDuplicateId] = useState<string | null>(null);
	const fileRef = useRef<HTMLInputElement>(null);

	// A fresh form each time it opens (or the form of the edition being edited).
	useEffect(() => {
		if (!open) return;
		setForm(edition ? fromEdition(edition) : EMPTY);
		setLookupNote(null);
		setDuplicateId(null);
	}, [open, edition]);

	const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
		setForm((current) => ({ ...current, [key]: value }));

	const isbnTrimmed = form.isbn.trim();
	const isbnValid = isbnTrimmed === "" || isValidIsbn(isbnTrimmed);
	const pages = Number.parseInt(form.pages, 10);
	const pagesValid = Number.isFinite(pages) && pages >= 1 && pages <= 20000;
	const year = form.year.trim() === "" ? null : Number.parseInt(form.year, 10);
	const yearValid = year == null || (year >= 1000 && year <= 2100);
	const canSave = pagesValid && isbnValid && yearValid && !uploading;

	async function lookUp() {
		setLookupNote(null);
		if (!isValidIsbn(isbnTrimmed)) {
			setLookupNote("Enter a valid ISBN first.");
			return;
		}
		setLookingUp(true);
		try {
			const found = await fetchOpenLibraryEditionByIsbn(isbnTrimmed);
			if (!found) {
				setLookupNote(
					"Open Library has no edition with that ISBN. Fill it in by hand.",
				);
				return;
			}
			setForm((current) => ({
				...current,
				// A title only matters when it differs from the book's own.
				title:
					found.title && found.title.toLowerCase() !== bookTitle.toLowerCase()
						? found.title
						: current.title,
				pages: found.pages ? String(found.pages) : current.pages,
				publisher: found.publisher ?? current.publisher,
				year: found.publishedYear ? String(found.publishedYear) : current.year,
				language:
					found.language &&
					(BOOK_EDITION_LANGUAGES as readonly string[]).includes(found.language)
						? (found.language as Lang)
						: current.language,
				format: found.format ?? current.format,
			}));
			setLookupNote("Filled in from Open Library. Check it matches your copy.");
		} catch (error) {
			setLookupNote(error instanceof Error ? error.message : "Lookup failed.");
		} finally {
			setLookingUp(false);
		}
	}

	async function onCropped(file: File) {
		setCropFile(null);
		setUploading(true);
		try {
			const { publicUrl } = await uploadEditionCover(file);
			set("coverUrl", publicUrl);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Upload failed.");
		} finally {
			setUploading(false);
		}
	}

	const payload = () => ({
		title: form.title.trim() || null,
		language: form.language,
		pages,
		isbn: isbnTrimmed || null,
		publisher: form.publisher.trim() || null,
		publishedYear: year,
		format: form.format,
		translator: form.translator.trim() || null,
		notes: form.notes.trim() || null,
		coverUrl: form.coverUrl,
	});

	const onError = (error: Error) => {
		const data = (error as { data?: { editionId?: string } }).data;
		if (data?.editionId) {
			setDuplicateId(data.editionId);
			return;
		}
		toast.error(error.message);
	};

	const afterSave = (saved: BookEditionItem, created: boolean) => {
		queryClient.setQueryData<ListData>(listKey(bookSlug), (current) =>
			current
				? {
						...current,
						items: created
							? [saved, ...current.items.filter((item) => item.id !== saved.id)]
							: current.items.map((item) =>
									item.id === saved.id ? saved : item,
								),
						addsLeftToday:
							created && current.addsLeftToday != null
								? Math.max(0, current.addsLeftToday - 1)
								: current.addsLeftToday,
					}
				: current,
		);
		void queryClient.invalidateQueries({ queryKey: listKey(bookSlug) });
		toast.success(created ? "Edition added" : "Edition saved");
		onCreated?.(saved);
		onOpenChange(false);
	};

	const create = useMutation(
		orpc.bookEdition.create.mutationOptions({
			onError,
			onSuccess: (saved) => afterSave(saved, true),
		}),
	);
	const update = useMutation(
		orpc.bookEdition.update.mutationOptions({
			onError,
			onSuccess: (saved) => afterSave(saved, false),
		}),
	);
	const pending = create.isPending || update.isPending;

	function submit() {
		if (!canSave || pending) return;
		setDuplicateId(null);
		if (editing && edition) {
			update.mutate({ id: edition.id, ...payload() });
		} else {
			create.mutate({ bookSlug, ...payload() });
		}
	}

	const field = (id: string, label: string, hint?: string) => (
		<label htmlFor={`${uid}-${id}`} className="flex flex-col gap-1.5 text-sm">
			<span className="font-medium">{label}</span>
			{hint ? (
				<span className="-mt-1 text-muted-foreground text-xs">{hint}</span>
			) : null}
		</label>
	);

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
					<DialogHeader className="border-border border-b p-5">
						<DialogTitle>
							{editing ? "Edit edition" : "Add an edition"}
						</DialogTitle>
						<DialogDescription>
							{editing
								? "Fix what is wrong. Everyone reading this edition sees the change."
								: `Your copy of “${bookTitle}” is not on Open Library? Add it here so you and other members can pick it.`}
						</DialogDescription>
					</DialogHeader>

					<form
						className="grid gap-5 p-5 sm:grid-cols-[10rem_minmax(0,1fr)]"
						onSubmit={(event) => {
							event.preventDefault();
							submit();
						}}
					>
						<div className="flex flex-col gap-2">
							<div
								className={cn(
									"relative mx-auto aspect-2/3 w-full max-w-[10rem]",
									bookCoverFrameClassName,
								)}
							>
								{form.coverUrl ? (
									<Image
										src={form.coverUrl}
										alt="Edition cover"
										fill
										className="object-cover"
										sizes="160px"
									/>
								) : (
									<div className="flex size-full flex-col items-center justify-center gap-1 px-2 text-center text-muted-foreground text-xs">
										<ImagePlus className="size-5" aria-hidden />
										No cover yet
									</div>
								)}
								{uploading ? (
									<div className="absolute inset-0 flex items-center justify-center bg-background/70">
										<Loader2 className="size-5 animate-spin" aria-hidden />
									</div>
								) : null}
							</div>
							<input
								ref={fileRef}
								type="file"
								accept="image/jpeg,image/png,image/webp"
								className="sr-only"
								aria-label="Choose a cover image"
								onChange={(event) => {
									const file = event.target.files?.[0];
									event.target.value = "";
									if (!file) return;
									if (file.size > 5 * 1024 * 1024) {
										toast.error("Choose an image under 5 MB.");
										return;
									}
									setCropFile(file);
								}}
							/>
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={uploading}
								onClick={() => fileRef.current?.click()}
							>
								<ImagePlus data-icon="inline-start" aria-hidden />
								{form.coverUrl ? "Change cover" : "Upload cover"}
							</Button>
							{form.coverUrl ? (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="text-muted-foreground"
									onClick={() => set("coverUrl", null)}
								>
									<Trash2 data-icon="inline-start" aria-hidden />
									Remove cover
								</Button>
							) : null}
						</div>

						<div className="flex min-w-0 flex-col gap-4">
							<div className="flex flex-col gap-1.5">
								{field(
									"isbn",
									"ISBN",
									"On the back of the book. Optional, but it stops duplicates.",
								)}
								<div className="flex gap-2">
									<Input
										id={`${uid}-isbn`}
										value={form.isbn}
										onChange={(event) => set("isbn", event.target.value)}
										placeholder="978-0-306-40615-7"
										inputMode="numeric"
										autoComplete="off"
										aria-invalid={!isbnValid}
									/>
									<Button
										type="button"
										variant="outline"
										disabled={lookingUp || isbnTrimmed === ""}
										onClick={() => void lookUp()}
									>
										{lookingUp ? (
											<Loader2
												data-icon="inline-start"
												className="animate-spin"
												aria-hidden
											/>
										) : (
											<Search data-icon="inline-start" aria-hidden />
										)}
										Look up
									</Button>
								</div>
								{!isbnValid ? (
									<p className="text-destructive text-xs">
										That is not a valid ISBN.
									</p>
								) : lookupNote ? (
									<p className="text-muted-foreground text-xs" role="status">
										{lookupNote}
									</p>
								) : null}
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<div className="flex flex-col gap-1.5">
									{field("language", "Language")}
									<Select
										value={form.language}
										onValueChange={(value) => set("language", value as Lang)}
									>
										<SelectTrigger id={`${uid}-language`}>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{BOOK_EDITION_LANGUAGES.map((code) => (
												<SelectItem key={code} value={code}>
													{languageLabel(code)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="flex flex-col gap-1.5">
									{field("format", "Format")}
									<Select
										value={form.format}
										onValueChange={(value) => set("format", value as Format)}
									>
										<SelectTrigger id={`${uid}-format`}>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{FORMATS.map((format) => (
												<SelectItem key={format} value={format}>
													{EDITION_FORMAT_LABELS[format]}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="flex flex-col gap-1.5">
									{field("pages", "Pages")}
									<Input
										id={`${uid}-pages`}
										type="number"
										min={1}
										max={20000}
										value={form.pages}
										onChange={(event) => set("pages", event.target.value)}
										inputMode="numeric"
										aria-invalid={form.pages !== "" && !pagesValid}
										required
									/>
								</div>
								<div className="flex flex-col gap-1.5">
									{field("year", "Year published")}
									<Input
										id={`${uid}-year`}
										type="number"
										value={form.year}
										onChange={(event) => set("year", event.target.value)}
										placeholder="2003"
										inputMode="numeric"
										aria-invalid={!yearValid}
									/>
								</div>
							</div>

							<div className="flex flex-col gap-1.5">
								{field("publisher", "Publisher")}
								<Input
									id={`${uid}-publisher`}
									value={form.publisher}
									maxLength={200}
									onChange={(event) => set("publisher", event.target.value)}
									autoComplete="off"
								/>
							</div>
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="flex flex-col gap-1.5">
									{field(
										"title",
										"Title in this edition",
										"Only if it differs, like a translated title.",
									)}
									<Input
										id={`${uid}-title`}
										value={form.title}
										maxLength={300}
										onChange={(event) => set("title", event.target.value)}
										autoComplete="off"
									/>
								</div>
								<div className="flex flex-col gap-1.5">
									{field("translator", "Translator")}
									<Input
										id={`${uid}-translator`}
										value={form.translator}
										maxLength={200}
										onChange={(event) => set("translator", event.target.value)}
										autoComplete="off"
									/>
								</div>
							</div>
							<div className="flex flex-col gap-1.5">
								{field("notes", "Notes")}
								<Textarea
									id={`${uid}-notes`}
									value={form.notes}
									maxLength={300}
									rows={2}
									onChange={(event) => set("notes", event.target.value)}
									placeholder="Anything that helps others recognise this edition"
								/>
								<p className="text-end text-muted-foreground text-xs tabular-nums">
									{form.notes.length}/300
								</p>
							</div>

							{duplicateId ? (
								<div
									className="flex flex-wrap items-center justify-between gap-2 border border-warning/40 bg-warning/10 p-3 text-sm"
									role="alert"
								>
									<span>This edition (same ISBN) is already listed.</span>
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={() => {
											onDuplicate?.(duplicateId);
											onOpenChange(false);
										}}
									>
										Use the existing one
									</Button>
								</div>
							) : null}
						</div>

						<DialogFooter className="border-border border-t pt-4 sm:col-span-2">
							<Button
								type="button"
								variant="ghost"
								onClick={() => onOpenChange(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={!canSave || pending}>
								{pending ? (
									<Loader2
										data-icon="inline-start"
										className="animate-spin"
										aria-hidden
									/>
								) : null}
								Save edition
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{cropFile ? (
				<CoverCropper
					file={cropFile}
					onCancel={() => setCropFile(null)}
					onDone={(file) => void onCropped(file)}
				/>
			) : null}
		</>
	);
}
