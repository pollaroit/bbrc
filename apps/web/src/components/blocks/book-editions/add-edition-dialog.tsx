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
 * An ISBN can be looked up on Open Library (or scanned with the camera) to fill
 * the form. The cover is uploaded through the same 2:3 cropper the book covers
 * use; nothing is saved until "Save edition".
 *
 * Layout: a live preview card beside the form on wide screens, a compact
 * preview row above it on phones (where the dialog fills the screen), and a
 * sticky action bar. Esc, the close button and Cancel ask before throwing
 * away changes. Ctrl/⌘+Enter saves from anywhere in the form.
 */

import type { BookEditionItem } from "@bbrc/api/modules/book-edition/book-edition.schema";
import {
	BOOK_EDITION_LANGUAGES,
	MAX_EDITIONS_PER_MEMBER_PER_DAY,
} from "@bbrc/api/modules/book-edition/book-edition.schema";
import { isbnPair, isValidIsbn, normalizeIsbn } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { Input } from "@bbrc/ui/components/input";
import { Textarea } from "@bbrc/ui/components/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
	Book,
	BookOpen,
	Headphones,
	Loader2,
	Minus,
	Plus,
	Search,
	Shapes,
	Tablet,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import {
	useHasKeyboard,
	useIsMac,
} from "@/components/blocks/book-flow/use-book-flow-hotkeys";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { authClient } from "@/lib/auth-client";
import {
	EDITION_FORMAT_LABELS,
	languageLabel,
} from "@/lib/book-edition/edition-meta";
import { fetchOpenLibraryEditionByIsbn } from "@/lib/open-library/edition-lookup";
import { uploadEditionCover } from "@/lib/storage/upload-edition-cover";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";
import {
	type Choice,
	ChoiceChips,
	CoverDropzone,
	EditionPreviewCard,
	type EditionPreviewData,
	EditionPreviewStrip,
	FieldLabel,
	FormSection,
	StatusLine,
	type Tone,
} from "./edition-dialog-parts";

const CoverCropper = dynamic(
	() =>
		import("@/components/blocks/cover-cropper").then((mod) => mod.CoverCropper),
	{ ssr: false },
);

// Only phones and laptops with a camera get the button; it loads on demand.
const IsbnScannerButton = dynamic(
	() =>
		import("@/components/blocks/book-flow/isbn-scanner").then(
			(mod) => mod.IsbnScannerButton,
		),
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

const FORMAT_ICONS: Record<Format, React.ReactNode> = {
	paperback: <BookOpen />,
	hardcover: <Book />,
	ebook: <Tablet />,
	audiobook: <Headphones />,
	other: <Shapes />,
};

const LANGUAGE_CHOICES: Choice<Lang>[] = BOOK_EDITION_LANGUAGES.map((code) => ({
	id: code,
	label: languageLabel(code),
	code,
}));

const FORMAT_CHOICES: Choice<Format>[] = FORMATS.map((format) => ({
	id: format,
	label: EDITION_FORMAT_LABELS[format],
	icon: FORMAT_ICONS[format],
}));

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

type Lookup =
	| { state: "idle" }
	| { state: "loading" }
	| { state: "found"; title: string | null }
	| { state: "missing" }
	| { state: "error"; message: string };

const MIN_PAGES = 1;
const MAX_PAGES = 20000;

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
	const isMac = useIsMac();
	const hasKeyboard = useHasKeyboard();
	const { data: session } = authClient.useSession();
	const isAdmin = session?.user.isAdmin === true;

	const initial = useMemo(
		() => (edition ? fromEdition(edition) : EMPTY),
		[edition],
	);
	const [form, setForm] = useState<FormState>(initial);
	const [lookup, setLookup] = useState<Lookup>({ state: "idle" });
	const [cropFile, setCropFile] = useState<File | null>(null);
	const [uploading, setUploading] = useState(false);
	const [duplicateId, setDuplicateId] = useState<string | null>(null);
	const [touched, setTouched] = useState({ pages: false, year: false });
	const [showTitle, setShowTitle] = useState(false);
	const [showTranslator, setShowTranslator] = useState(false);
	const [discardOpen, setDiscardOpen] = useState(false);
	const isbnRef = useRef<HTMLInputElement>(null);
	const pagesRef = useRef<HTMLInputElement>(null);

	// A fresh form each time it opens (or the form of the edition being edited).
	useEffect(() => {
		if (!open) return;
		setForm(initial);
		setLookup({ state: "idle" });
		setDuplicateId(null);
		setCropFile(null);
		setDiscardOpen(false);
		setTouched({ pages: false, year: false });
		setShowTitle(initial.title !== "");
		setShowTranslator(initial.translator !== "");
	}, [open, initial]);

	const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
		setForm((current) => ({ ...current, [key]: value }));

	const dirty = JSON.stringify(form) !== JSON.stringify(initial);

	// Closing asks first when there is something to lose.
	const requestClose = useCallback(
		(next: boolean) => {
			if (next) {
				onOpenChange(true);
				return;
			}
			if (cropFile) return;
			if (dirty && !uploading) {
				setDiscardOpen(true);
				return;
			}
			onOpenChange(false);
		},
		[cropFile, dirty, onOpenChange, uploading],
	);

	// ── Checks ──
	const isbnTrimmed = form.isbn.trim();
	const isbnValid = isbnTrimmed === "" || isValidIsbn(isbnTrimmed);
	const pages = Number.parseInt(form.pages, 10);
	const pagesValid =
		Number.isFinite(pages) && pages >= MIN_PAGES && pages <= MAX_PAGES;
	const year = form.year.trim() === "" ? null : Number.parseInt(form.year, 10);
	const yearValid = year == null || (year >= 1000 && year <= 2100);

	// The list is usually already loaded on the editions page and in the picker.
	const listQuery = useQuery({
		...orpc.bookEdition.list.queryOptions({ input: { bookSlug } }),
		enabled: open,
		staleTime: 30_000,
	});
	const addsLeft = isAdmin ? null : (listQuery.data?.addsLeftToday ?? null);
	const outOfAdds = !editing && addsLeft === 0;

	// The same ISBN may already be on the list: say so before saving.
	const existingByIsbn = useMemo(() => {
		if (editing || !isbnValid || isbnTrimmed === "") return null;
		const pair = isbnPair(isbnTrimmed);
		return (
			listQuery.data?.items.find(
				(item) =>
					(pair.isbn13 && item.isbn13 === pair.isbn13) ||
					(pair.isbn10 && item.isbn10 === pair.isbn10),
			) ?? null
		);
	}, [editing, isbnValid, isbnTrimmed, listQuery.data?.items]);
	const duplicateTarget = duplicateId ?? existingByIsbn?.id ?? null;

	const blocker = uploading
		? "Waiting for the cover to upload…"
		: !pagesValid
			? "Add the number of pages to save."
			: !isbnValid
				? "Fix the ISBN to save."
				: !yearValid
					? "Fix the year to save."
					: outOfAdds
						? `You have added ${MAX_EDITIONS_PER_MEMBER_PER_DAY} editions today. Try again tomorrow.`
						: duplicateTarget
							? "This ISBN is already listed."
							: null;
	const canSave = blocker == null;

	// ── Look up on Open Library ──
	async function lookUp(raw = form.isbn) {
		const value = raw.trim();
		if (!isValidIsbn(value)) {
			setLookup({ state: "error", message: "Enter a valid ISBN first." });
			return;
		}
		setLookup({ state: "loading" });
		try {
			const found = await fetchOpenLibraryEditionByIsbn(value);
			if (!found) {
				setLookup({ state: "missing" });
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
			if (
				found.title &&
				found.title.toLowerCase() !== bookTitle.toLowerCase()
			) {
				setShowTitle(true);
			}
			setLookup({ state: "found", title: found.title });
		} catch (error) {
			setLookup({
				state: "error",
				message: error instanceof Error ? error.message : "Lookup failed.",
			});
		}
	}

	// ── Cover ──
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

	// Paste an image anywhere in the dialog.
	useEffect(() => {
		if (!open || cropFile) return;
		function onPaste(event: ClipboardEvent) {
			const file = Array.from(event.clipboardData?.files ?? []).find((entry) =>
				entry.type.startsWith("image/"),
			);
			if (!file) return;
			event.preventDefault();
			if (file.size > 5 * 1024 * 1024) {
				toast.error("Choose an image under 5 MB.");
				return;
			}
			setCropFile(file);
		}
		document.addEventListener("paste", onPaste);
		return () => document.removeEventListener("paste", onPaste);
	}, [open, cropFile]);

	// ── Saving ──
	const payload = () => ({
		title: form.title.trim() || null,
		language: form.language,
		pages,
		isbn: isbnTrimmed ? normalizeIsbn(isbnTrimmed) : null,
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
		setTouched({ pages: true, year: true });
		if (!canSave || pending) return;
		setDuplicateId(null);
		if (editing && edition) {
			update.mutate({ id: edition.id, ...payload() });
		} else {
			create.mutate({ bookSlug, ...payload() });
		}
	}

	// ── Preview ──
	const preview: EditionPreviewData = {
		bookTitle,
		title: form.title,
		languageLabel: languageLabel(form.language),
		formatLabel: EDITION_FORMAT_LABELS[form.format],
		formatIcon: FORMAT_ICONS[form.format],
		pages: pagesValid ? pages : null,
		isbn: form.isbn,
		publisher: form.publisher,
		year: form.year,
		coverUrl: form.coverUrl,
		uploading,
		status:
			editing && edition?.status === "verified" && isAdmin
				? "verified"
				: "member",
		addedBy: editing
			? (edition?.createdBy?.name ?? "a member")
			: (session?.user.name ?? "you"),
		readers: edition?.readers,
	};

	const pagesInvalid = touched.pages && !pagesValid;
	const yearInvalid = touched.year && !yearValid;
	const stepPages = (delta: number) => {
		const base = Number.isFinite(pages) ? pages : 0;
		const next = Math.min(MAX_PAGES, Math.max(MIN_PAGES, base + delta));
		set("pages", String(next));
		setTouched((current) => ({ ...current, pages: true }));
	};

	const lookupTone: Tone =
		lookup.state === "found"
			? "success"
			: lookup.state === "loading"
				? "loading"
				: lookup.state === "error"
					? "danger"
					: "neutral";

	const warnsVerifiedReset =
		editing && edition?.status === "verified" && !isAdmin;

	return (
		<>
			<Dialog open={open} onOpenChange={requestClose}>
				<DialogContent
					initialFocus={editing ? pagesRef : isbnRef}
					className={cn(
						"flex flex-col gap-0 overflow-hidden p-0 text-sm",
						// Phones: the dialog fills the screen like a sheet.
						"top-0 left-0 h-dvh max-h-dvh max-w-none translate-x-0 translate-y-0",
						"sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[min(92vh,54rem)] sm:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2",
					)}
				>
					<DialogHeader className="border-border border-b px-5 py-4 pe-14">
						<DialogTitle className="text-base">
							{editing ? "Edit edition" : "Add an edition"}
						</DialogTitle>
						<DialogDescription className="text-sm">
							{editing
								? "Fix what is wrong. Everyone reading this edition sees the change."
								: `Your copy of “${bookTitle}” is not on Open Library? Add it so you and other members can pick it.`}
						</DialogDescription>
					</DialogHeader>

					<div className="md:hidden">
						<EditionPreviewStrip data={preview} />
					</div>

					<form
						className="flex min-h-0 flex-1 flex-col"
						noValidate
						onSubmit={(event) => {
							event.preventDefault();
							submit();
						}}
						onKeyDown={(event) => {
							if (
								event.key === "Enter" &&
								(event.metaKey || event.ctrlKey) &&
								!event.repeat
							) {
								event.preventDefault();
								submit();
							}
						}}
					>
						<div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-5 md:grid-cols-[14rem_minmax(0,1fr)]">
							<div className="hidden md:block">
								<div className="sticky top-0">
									<EditionPreviewCard data={preview} />
								</div>
							</div>

							<div className="flex min-w-0 flex-col gap-7">
								<FormSection
									title="Find it by ISBN"
									description="The number on the back of the book. We fill in the rest from Open Library, and it stops the same edition being listed twice."
								>
									<div className="flex flex-col gap-2">
										<FieldLabel htmlFor={`${uid}-isbn`}>ISBN</FieldLabel>
										<div className="flex gap-2">
											<Input
												id={`${uid}-isbn`}
												ref={isbnRef}
												value={form.isbn}
												onChange={(event) => {
													set("isbn", event.target.value);
													setLookup({ state: "idle" });
													setDuplicateId(null);
												}}
												onKeyDown={(event) => {
													if (
														event.key === "Enter" &&
														!event.metaKey &&
														!event.ctrlKey
													) {
														event.preventDefault();
														void lookUp();
													}
												}}
												placeholder="978-0-306-40615-7"
												inputMode="numeric"
												autoComplete="off"
												className="h-10 font-mono text-sm tabular-nums"
												aria-invalid={!isbnValid}
												aria-describedby={`${uid}-isbn-status`}
											/>
											<IsbnScannerButton
												disabled={lookup.state === "loading"}
												onDetected={(isbn) => {
													set("isbn", isbn);
													void lookUp(isbn);
												}}
											/>
											<Button
												type="button"
												className="h-10"
												disabled={
													lookup.state === "loading" ||
													isbnTrimmed === "" ||
													!isbnValid
												}
												onClick={() => void lookUp()}
											>
												{lookup.state === "loading" ? (
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
										<div id={`${uid}-isbn-status`} className="min-h-5">
											{!isbnValid ? (
												<StatusLine tone="danger">
													That is not a valid ISBN. Check the last digit.
												</StatusLine>
											) : duplicateTarget ? (
												<StatusLine
													tone="warning"
													action={
														<Button
															type="button"
															size="xs"
															variant="outline"
															onClick={() => {
																onDuplicate?.(duplicateTarget);
																onOpenChange(false);
															}}
														>
															Use the existing one
														</Button>
													}
												>
													This ISBN is already listed.
												</StatusLine>
											) : lookup.state === "found" ? (
												<StatusLine tone={lookupTone}>
													Found on Open Library
													{lookup.title ? `: ${lookup.title}` : ""}. Filled in
													below; check it matches your copy.
												</StatusLine>
											) : lookup.state === "missing" ? (
												<StatusLine tone="neutral">
													Open Library has no edition with that ISBN. Fill it in
													by hand.
												</StatusLine>
											) : lookup.state === "error" ? (
												<StatusLine tone="danger">{lookup.message}</StatusLine>
											) : lookup.state === "loading" ? (
												<StatusLine tone="loading">
													Looking it up on Open Library…
												</StatusLine>
											) : (
												<StatusLine tone="neutral">
													No ISBN? Skip this and fill the details in below.
												</StatusLine>
											)}
										</div>
									</div>
								</FormSection>

								<FormSection title="About this edition">
									<div className="flex flex-col gap-2">
										<FieldLabel>Language</FieldLabel>
										<ChoiceChips
											label="Language"
											value={form.language}
											options={LANGUAGE_CHOICES}
											onChange={(value) => set("language", value)}
										/>
									</div>
									<div className="flex flex-col gap-2">
										<FieldLabel>Format</FieldLabel>
										<ChoiceChips
											label="Format"
											variant="tile"
											value={form.format}
											options={FORMAT_CHOICES}
											onChange={(value) => set("format", value)}
										/>
									</div>

									<div className="grid gap-4 sm:grid-cols-2">
										<div className="flex flex-col gap-1.5">
											<FieldLabel htmlFor={`${uid}-pages`}>Pages</FieldLabel>
											<div className="flex items-stretch gap-1.5">
												<Button
													type="button"
													variant="outline"
													size="icon"
													className="size-10 shrink-0"
													aria-label="One page less"
													disabled={
														!Number.isFinite(pages) || pages <= MIN_PAGES
													}
													onClick={() => stepPages(-1)}
												>
													<Minus aria-hidden />
												</Button>
												<Input
													id={`${uid}-pages`}
													ref={pagesRef}
													type="number"
													min={MIN_PAGES}
													max={MAX_PAGES}
													value={form.pages}
													onChange={(event) => set("pages", event.target.value)}
													onBlur={() =>
														setTouched((current) => ({
															...current,
															pages: true,
														}))
													}
													inputMode="numeric"
													className="h-10 text-center tabular-nums"
													aria-invalid={pagesInvalid}
													aria-describedby={`${uid}-pages-help`}
													required
												/>
												<Button
													type="button"
													variant="outline"
													size="icon"
													className="size-10 shrink-0"
													aria-label="One page more"
													disabled={pages >= MAX_PAGES}
													onClick={() => stepPages(1)}
												>
													<Plus aria-hidden />
												</Button>
											</div>
											<p
												id={`${uid}-pages-help`}
												className={cn(
													"text-xs",
													pagesInvalid
														? "text-destructive"
														: "text-muted-foreground",
												)}
											>
												{pagesInvalid
													? `Pages must be between ${MIN_PAGES} and ${MAX_PAGES.toLocaleString("en-US")}.`
													: "Used for progress and pace."}
											</p>
										</div>
										<div className="flex flex-col gap-1.5">
											<FieldLabel htmlFor={`${uid}-year`}>
												Year published
											</FieldLabel>
											<Input
												id={`${uid}-year`}
												type="number"
												value={form.year}
												onChange={(event) => set("year", event.target.value)}
												onBlur={() =>
													setTouched((current) => ({ ...current, year: true }))
												}
												placeholder="2003"
												inputMode="numeric"
												className="h-10 tabular-nums"
												aria-invalid={yearInvalid}
											/>
											{yearInvalid ? (
												<p className="text-destructive text-xs">
													Year must be between 1000 and 2100.
												</p>
											) : null}
										</div>
									</div>

									<div className="flex flex-col gap-1.5">
										<FieldLabel htmlFor={`${uid}-publisher`}>
											Publisher
										</FieldLabel>
										<Input
											id={`${uid}-publisher`}
											value={form.publisher}
											maxLength={200}
											onChange={(event) => set("publisher", event.target.value)}
											autoComplete="off"
											className="h-10"
										/>
									</div>

									{showTranslator || form.language !== "eng" ? (
										<div className="flex flex-col gap-1.5">
											<FieldLabel
												htmlFor={`${uid}-translator`}
												hint="For a translated edition."
											>
												Translator
											</FieldLabel>
											<Input
												id={`${uid}-translator`}
												value={form.translator}
												maxLength={200}
												onChange={(event) =>
													set("translator", event.target.value)
												}
												autoComplete="off"
												className="h-10"
											/>
										</div>
									) : null}
									{showTitle ? (
										<div className="flex flex-col gap-1.5">
											<FieldLabel
												htmlFor={`${uid}-title`}
												hint="Only if it differs from the book's title, like a translated title."
											>
												Title in this edition
											</FieldLabel>
											<Input
												id={`${uid}-title`}
												value={form.title}
												maxLength={300}
												onChange={(event) => set("title", event.target.value)}
												autoComplete="off"
												className="h-10"
											/>
										</div>
									) : null}
									{!showTitle ||
									(!showTranslator && form.language === "eng") ? (
										<div className="flex flex-wrap gap-x-4 gap-y-1">
											{!showTitle ? (
												<Button
													type="button"
													variant="link"
													size="xs"
													className="h-auto px-0 text-muted-foreground"
													onClick={() => setShowTitle(true)}
												>
													<Plus data-icon="inline-start" aria-hidden />
													Different title in this edition
												</Button>
											) : null}
											{!showTranslator && form.language === "eng" ? (
												<Button
													type="button"
													variant="link"
													size="xs"
													className="h-auto px-0 text-muted-foreground"
													onClick={() => setShowTranslator(true)}
												>
													<Plus data-icon="inline-start" aria-hidden />
													Add a translator
												</Button>
											) : null}
										</div>
									) : null}
								</FormSection>

								<FormSection
									title="Cover"
									description="Optional. It appears on the editions page and on your reading card."
								>
									<CoverDropzone
										hasCover={form.coverUrl != null}
										uploading={uploading}
										onFile={setCropFile}
										onError={(message) => toast.error(message)}
										onRemove={() => set("coverUrl", null)}
									/>
								</FormSection>

								<FormSection title="Notes">
									<div className="flex flex-col gap-1.5">
										<Textarea
											id={`${uid}-notes`}
											aria-label="Notes"
											value={form.notes}
											maxLength={300}
											rows={3}
											onChange={(event) => set("notes", event.target.value)}
											placeholder="Anything that helps others recognise this edition, like “free PDF from the publisher”"
											className="text-sm"
										/>
										<p className="text-end text-muted-foreground text-xs tabular-nums">
											{form.notes.length}/300
										</p>
									</div>
								</FormSection>

								{warnsVerifiedReset ? (
									<StatusLine tone="neutral">
										This edition is verified. After you edit it, an admin has to
										verify it again.
									</StatusLine>
								) : null}
							</div>
						</div>

						<div className="flex flex-col gap-3 border-border border-t bg-popover px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
							<p
								className={cn(
									"text-xs leading-relaxed",
									canSave ? "text-muted-foreground" : "text-foreground",
								)}
								role="status"
							>
								{blocker ??
									(!editing && addsLeft != null
										? `You can add ${addsLeft} more ${addsLeft === 1 ? "edition" : "editions"} today (${MAX_EDITIONS_PER_MEMBER_PER_DAY} a day keeps the list tidy).`
										: editing
											? "Changes are saved for everyone."
											: "Nothing is saved until you press Save edition.")}
							</p>
							<div className="flex items-center justify-end gap-2">
								<Button
									type="button"
									variant="ghost"
									onClick={() => requestClose(false)}
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
									{hasKeyboard ? (
										<kbd className="ms-1 border border-primary-foreground/30 px-1 font-mono text-3xs opacity-80">
											{isMac ? "⌘↵" : "Ctrl+↵"}
										</kbd>
									) : null}
								</Button>
							</div>
						</div>
					</form>

					<DestructiveConfirmDialog
						open={discardOpen}
						onOpenChange={setDiscardOpen}
						title="Discard this edition?"
						description={
							editing
								? "Your changes to this edition will be lost."
								: "What you entered will be lost."
						}
						confirmLabel="Discard"
						cancelLabel="Keep editing"
						onConfirm={() => {
							setDiscardOpen(false);
							onOpenChange(false);
						}}
					/>
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
