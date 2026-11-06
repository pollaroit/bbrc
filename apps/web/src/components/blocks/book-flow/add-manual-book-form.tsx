"use client";

import {
	type AddManualBookInput,
	AddManualBookInputSchema,
} from "@bbrc/api/modules/book/book.schema";
import { BOOK_EDITION_LANGUAGES } from "@bbrc/api/modules/book-edition/book-edition.schema";
import { generateSlug } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { Switch } from "@bbrc/ui/components/switch";
import { Textarea } from "@bbrc/ui/components/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Book, BookOpen, Headphones, Shapes, Tablet } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
	AddBookSeriesField,
	type AddBookSeriesPlacement,
	type AddBookSeriesSelection,
	DEFAULT_SERIES_PLACEMENT,
} from "@/components/blocks/add-book-series-field";
import {
	type Choice,
	ChoiceChips,
	CoverDropzone,
} from "@/components/blocks/book-editions/edition-dialog-parts";
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
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
	EDITION_FORMAT_LABELS,
	languageLabel,
} from "@/lib/book-edition/edition-meta";
import { uploadEditionCover } from "@/lib/storage/upload-edition-cover";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";
import {
	type AuthorChip,
	AuthorChipInput,
	authorChipNames,
	authorChipsProblem,
	persistAuthorChips,
} from "./author-chip-input";
import { HotkeyChip } from "./book-flow-hotkeys-help";
import { BookPreviewCard } from "./book-preview-card";
import {
	BookWorkspace,
	BookWorkspaceActionBar,
	type WorkspaceSection,
} from "./book-workspace";
import { TagList } from "./tag-list";

/*
 * Adding a book Open Library does not have: the same workspace as the Open Library
 * form (live preview, sections that follow your scrolling, an accordion on phones,
 * one action bar), with the work and its first edition filled in together.
 *
 * Sections: The work, First edition, Cover, Classification, Series and order,
 * Reading order, In the library. Pages and the cover belong to the edition and are
 * asked for once; the book follows its primary edition afterwards.
 */

const CoverCropper = dynamic(
	() =>
		import("@/components/blocks/cover-cropper").then((mod) => mod.CoverCropper),
	{ ssr: false },
);

type Format = AddManualBookInput["edition"]["format"];
type Language = (typeof BOOK_EDITION_LANGUAGES)[number];

const FORMAT_CHOICES: Choice<Format>[] = (
	Object.keys(EDITION_FORMAT_LABELS) as Format[]
).map((format) => ({
	id: format,
	label: EDITION_FORMAT_LABELS[format],
	icon: {
		paperback: <BookOpen />,
		hardcover: <Book />,
		ebook: <Tablet />,
		audiobook: <Headphones />,
		other: <Shapes />,
	}[format],
}));

const LANGUAGE_CHOICES: Choice<Language>[] = BOOK_EDITION_LANGUAGES.map(
	(code) => ({ id: code, label: languageLabel(code), code }),
);

/** Which section an error belongs to, so the form can open it. */
const SECTION_OF_FIELD: Record<string, string> = {
	title: "work",
	authorIds: "work",
	publishedIn: "work",
	excerpt: "work",
	"edition.pages": "edition",
	"edition.publishedYear": "edition",
	"edition.isbn": "edition",
	"edition.coverUrl": "cover",
	countries: "classification",
	subjects: "classification",
	seriesSlug: "series",
	newSeries: "series",
	seriesPosition: "series",
};

/** Whole-number text field: empty means "not given". */
function toInt(value: string): number | undefined {
	const trimmed = value.trim();
	if (trimmed === "") return undefined;
	const parsed = Number.parseInt(trimmed, 10);
	return Number.isFinite(parsed) ? parsed : undefined;
}

function FieldError({ message }: { message: string | undefined }) {
	return message ? (
		<p className="text-destructive text-xs" role="alert">
			{message}
		</p>
	) : null;
}

/** A labelled on/off row, like the options of the Open Library form. */
function ToggleRow({
	id,
	label,
	description,
	checked,
	onCheckedChange,
}: {
	id: string;
	label: string;
	description: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
}) {
	return (
		<div className="flex items-start justify-between gap-4 border border-border bg-muted/20 p-3">
			<label htmlFor={id} className="flex min-w-0 flex-col gap-0.5 text-sm">
				<span className="font-medium">{label}</span>
				<span className="text-muted-foreground text-xs leading-relaxed">
					{description}
				</span>
			</label>
			<Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
		</div>
	);
}

export function AddManualBookForm() {
	const uid = useId();
	const router = useRouter();

	const [title, setTitle] = useState("");
	const [authorChips, setAuthorChips] = useState<AuthorChip[]>([]);
	const [publishedIn, setPublishedIn] = useState("");
	const [excerpt, setExcerpt] = useState("");

	const [format, setFormat] = useState<Format>("paperback");
	const [language, setLanguage] = useState<Language>("eng");
	const [pages, setPages] = useState("");
	const [editionYear, setEditionYear] = useState("");
	const [isbn, setIsbn] = useState("");
	const [publisher, setPublisher] = useState("");

	const [coverUrl, setCoverUrl] = useState<string | null>(null);
	const [cropFile, setCropFile] = useState<File | null>(null);
	const [uploading, setUploading] = useState(false);

	const [countries, setCountries] = useState<string[]>([]);
	const [subjects, setSubjects] = useState<string[]>([]);

	const [series, setSeries] = useState<AddBookSeriesSelection | null>(null);
	const [placement, setPlacement] = useState<AddBookSeriesPlacement>(
		DEFAULT_SERIES_PLACEMENT,
	);
	const [readAfterBooks, setReadAfterBooks] = useState<
		ReadAfterBookSelection[]
	>([]);

	const [hidden, setHidden] = useState(false);
	const [notifyMembers, setNotifyMembers] = useState(true);

	const [errors, setErrors] = useState<Record<string, string>>({});
	const [preparing, setPreparing] = useState(false);
	const [authorProgress, setAuthorProgress] = useState<string | null>(null);
	const [openRequest, setOpenRequest] = useState<{
		id: string;
		nonce: number;
	} | null>(null);

	// The work's year follows the edition's year until it is typed in by hand: a reissue
	// is the only case where they differ, and then the admin overwrites it.
	const workYearEdited = useRef(false);
	// Countries are suggested once the basics are in, until they are edited.
	const countriesTouched = useRef(false);

	const authors = useMemo(() => authorChipNames(authorChips), [authorChips]);
	const authorsKey = authors.join("\n");
	const slugPreview = title.trim() ? generateSlug(title) : "";
	const pagesNumber = toInt(pages) ?? 0;
	const yearNumber = toInt(publishedIn) ?? 0;

	const originInput = useDebouncedValue(
		{ title, authorsKey, publishedIn: yearNumber, excerpt },
		700,
	);
	const originAuthors = useMemo(
		() => originInput.authorsKey.split("\n").filter(Boolean),
		[originInput.authorsKey],
	);
	const { data: originSuggestion, isFetching: isSuggestingOrigin } = useQuery({
		...orpc.book.suggestOriginCountries.queryOptions({
			input: {
				title: originInput.title.trim(),
				authors: originAuthors,
				publishedIn: originInput.publishedIn,
				excerpt: originInput.excerpt.trim() || undefined,
			},
		}),
		// The suggestion waits for the title, an author and the year.
		enabled:
			originInput.title.trim().length >= 2 &&
			originAuthors.length > 0 &&
			originInput.publishedIn > 0,
		staleTime: Number.POSITIVE_INFINITY,
		retry: false,
	});
	const suggestedKey = originSuggestion?.countries?.join("\0") ?? "";
	useEffect(() => {
		if (countriesTouched.current || !suggestedKey) return;
		const next = originSuggestion?.countries;
		if (next?.length) setCountries(next);
	}, [suggestedKey, originSuggestion]);

	const addMutation = useMutation(
		orpc.book.addManualBook.mutationOptions({
			onSuccess: async (result) => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: orpc.book.getBookList.key(),
					}),
					queryClient.invalidateQueries({
						queryKey: orpc.admin.listBooks.key(),
					}),
					queryClient.invalidateQueries({
						queryKey: orpc.admin.getBookOverview.key(),
					}),
					queryClient.invalidateQueries({
						queryKey: orpc.series.getList.key(),
					}),
				]);
				toast.success("Book added to the library.");
				router.push(`/books/${result.slug}` as never);
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

	async function onCropped(file: File) {
		setCropFile(null);
		setUploading(true);
		try {
			const { publicUrl } = await uploadEditionCover(file);
			setCoverUrl(publicUrl);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Upload failed.");
		} finally {
			setUploading(false);
		}
	}

	function onEditionYearChange(value: string) {
		setEditionYear(value);
		if (!workYearEdited.current) setPublishedIn(value);
	}

	const saving = addMutation.isPending || preparing;

	async function save() {
		if (saving) return;

		const chipProblem = authorChipsProblem(authorChips);
		const draft = {
			title: title.trim(),
			publishedIn: toInt(publishedIn),
			excerpt: excerpt.trim() || null,
			subjects,
			countries,
			hidden: hidden || undefined,
			notifyMembers: notifyMembers ? undefined : false,
			readAfterBookSlugs: readAfterBooks.map((book) => book.slug),
			edition: {
				format,
				language,
				pages: toInt(pages),
				publishedYear: toInt(editionYear),
				isbn: isbn.trim() || null,
				publisher: publisher.trim() || null,
				coverUrl,
			},
			...(series?.kind === "existing"
				? {
						seriesSlug: series.slug,
						seriesPosition: placement.position ?? undefined,
						shiftLater: placement.shiftLater || undefined,
					}
				: series?.kind === "new"
					? { newSeries: series.draft }
					: {}),
		};

		// Real author ids exist only once the authors do, so the shape is checked with a
		// placeholder id and the real ids are sent below.
		const check = AddManualBookInputSchema.safeParse({
			...draft,
			authorIds: authorChips.length > 0 ? [crypto.randomUUID()] : undefined,
		});
		const next: Record<string, string> = {};
		if (!check.success) {
			for (const issue of check.error.issues) {
				next[issue.path.join(".")] ??= issue.message;
			}
		}
		if (chipProblem) next.authorIds = chipProblem;
		setErrors(next);

		const firstProblem = Object.keys(next)[0];
		if (!check.success || chipProblem) {
			toast.error("Fix the highlighted fields and try again.");
			const sectionId = firstProblem
				? (SECTION_OF_FIELD[firstProblem] ?? "work")
				: "work";
			setOpenRequest({ id: sectionId, nonce: Date.now() });
			return;
		}

		setPreparing(true);
		try {
			const authorIds = await persistAuthorChips(authorChips, (done, total) =>
				setAuthorProgress(`Creating authors (${done} of ${total})…`),
			);
			addMutation.mutate({ ...check.data, authorIds });
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Could not create the authors.",
			);
		} finally {
			setPreparing(false);
			setAuthorProgress(null);
		}
	}

	const seriesLabel =
		series?.kind === "existing"
			? `${placement.position != null ? `#${placement.position} ` : ""}${series.title}`
			: series?.kind === "new"
				? `#1 ${series.draft.title}`
				: null;

	const workComplete =
		title.trim().length > 0 && authors.length > 0 && yearNumber > 0;

	const sections: WorkspaceSection[] = [
		{
			id: "work",
			title: "The work",
			description:
				"What the book is, whichever copy you hold. This is what the library shows on its page.",
			status: workComplete ? "complete" : "attention",
			summary: [title.trim(), authors.length > 0 ? authors.join(", ") : null]
				.filter(Boolean)
				.join(" · "),
			content: (
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor={`${uid}-title`}>Title</FieldLabel>
						<Input
							id={`${uid}-title`}
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							placeholder="e.g. The Dispossessed"
							aria-invalid={Boolean(errors.title)}
							autoComplete="off"
						/>
						<FieldError message={errors.title} />
						<FieldDescription>
							Address:{" "}
							<span className="font-mono">/books/{slugPreview || "…"}</span>
						</FieldDescription>
					</Field>
					<Field>
						<FieldLabel htmlFor={`${uid}-authors`}>Authors</FieldLabel>
						<AuthorChipInput
							id={`${uid}-authors`}
							value={authorChips}
							onChange={setAuthorChips}
							invalid={Boolean(errors.authorIds)}
							disabled={saving}
						/>
						<FieldError message={errors.authorIds} />
						<FieldDescription>
							{authorProgress ??
								"Each chip is an author of the library. Drag to set the order."}
						</FieldDescription>
					</Field>
					<Field className="sm:max-w-56">
						<FieldLabel htmlFor={`${uid}-year`}>First published</FieldLabel>
						<Input
							id={`${uid}-year`}
							type="number"
							inputMode="numeric"
							min={0}
							max={new Date().getFullYear()}
							value={publishedIn}
							placeholder="e.g. 1974"
							onChange={(event) => {
								workYearEdited.current = true;
								setPublishedIn(event.target.value);
							}}
							aria-invalid={Boolean(errors.publishedIn)}
						/>
						<FieldError message={errors.publishedIn} />
						<FieldDescription>
							The year the work first came out, not this printing.
						</FieldDescription>
					</Field>
					<Field>
						<div className="flex flex-wrap items-center justify-between gap-2">
							<FieldLabel htmlFor={`${uid}-excerpt`}>Description</FieldLabel>
							<SuggestExcerptButton
								title={title}
								authors={authors}
								publishedIn={yearNumber || undefined}
								excerpt={excerpt || undefined}
								onAccept={setExcerpt}
							/>
						</div>
						<Textarea
							id={`${uid}-excerpt`}
							rows={5}
							maxLength={4000}
							value={excerpt}
							onChange={(event) => setExcerpt(event.target.value)}
							placeholder="A few spoiler-free sentences about the book."
							aria-invalid={Boolean(errors.excerpt)}
						/>
						<FieldError message={errors.excerpt} />
						<FieldDescription>
							Write one, or ask for a suggestion.
						</FieldDescription>
					</Field>
				</FieldGroup>
			),
		},
		{
			id: "edition",
			title: "First edition",
			description:
				"The copy this record is based on. Its page count becomes the book's, and you can add more editions later.",
			status: pagesNumber > 0 ? "complete" : "attention",
			summary: [
				pagesNumber > 0 ? `${pagesNumber} pages` : "pages missing",
				format,
			].join(" · "),
			content: (
				<FieldGroup>
					<ChoiceChips
						label="Format"
						value={format}
						options={FORMAT_CHOICES}
						onChange={setFormat}
					/>
					<div className="grid gap-4 sm:grid-cols-2">
						<Field>
							<FieldLabel htmlFor={`${uid}-pages`}>Pages</FieldLabel>
							<Input
								id={`${uid}-pages`}
								type="number"
								inputMode="numeric"
								min={1}
								value={pages}
								placeholder="e.g. 320"
								onChange={(event) => setPages(event.target.value)}
								aria-invalid={Boolean(errors["edition.pages"])}
							/>
							<FieldError message={errors["edition.pages"]} />
							<FieldDescription>
								Pace and progress are worked out from this.
							</FieldDescription>
						</Field>
						<Field>
							<FieldLabel htmlFor={`${uid}-edition-year`}>
								Year of this edition
							</FieldLabel>
							<Input
								id={`${uid}-edition-year`}
								type="number"
								inputMode="numeric"
								min={1000}
								max={2100}
								value={editionYear}
								placeholder="e.g. 2017"
								onChange={(event) => onEditionYearChange(event.target.value)}
								aria-invalid={Boolean(errors["edition.publishedYear"])}
							/>
							<FieldError message={errors["edition.publishedYear"]} />
							<FieldDescription>
								Fills "First published" until you change it.
							</FieldDescription>
						</Field>
					</div>
					<ChoiceChips
						label="Language"
						value={language}
						options={LANGUAGE_CHOICES}
						onChange={setLanguage}
					/>
					<div className="grid gap-4 sm:grid-cols-2">
						<Field>
							<FieldLabel htmlFor={`${uid}-isbn`}>ISBN</FieldLabel>
							<Input
								id={`${uid}-isbn`}
								value={isbn}
								placeholder="10 or 13 digits"
								onChange={(event) => setIsbn(event.target.value)}
								aria-invalid={Boolean(errors["edition.isbn"])}
								autoComplete="off"
							/>
							<FieldError message={errors["edition.isbn"]} />
						</Field>
						<Field>
							<FieldLabel htmlFor={`${uid}-publisher`}>Publisher</FieldLabel>
							<Input
								id={`${uid}-publisher`}
								value={publisher}
								placeholder="e.g. Harper Voyager"
								onChange={(event) => setPublisher(event.target.value)}
								autoComplete="off"
							/>
						</Field>
					</div>
				</FieldGroup>
			),
		},
		{
			id: "cover",
			title: "Cover",
			description:
				"Upload it once: it is this edition's cover and the book's (always 2:3).",
			status: coverUrl ? "complete" : undefined,
			summary: coverUrl ? "Uploaded cover" : "No cover yet",
			content: (
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start">
					<CoverDropzone
						hasCover={coverUrl != null}
						uploading={uploading}
						onFile={setCropFile}
						onError={(message) => toast.error(message)}
						onRemove={() => setCoverUrl(null)}
					/>
					<FieldError message={errors["edition.coverUrl"]} />
				</div>
			),
		},
		{
			id: "classification",
			title: "Classification",
			description: "Where the book comes from and what it is about.",
			summary: [
				countries.length > 0
					? `${countries.length} countr${countries.length === 1 ? "y" : "ies"}`
					: "no country",
				`${subjects.length} subjects`,
			].join(" · "),
			content: (
				<div className="flex flex-col gap-5">
					<BookOriginCountriesField
						value={countries}
						isSuggesting={isSuggestingOrigin && !countriesTouched.current}
						onTouched={() => {
							countriesTouched.current = true;
						}}
						onChange={(next) => {
							countriesTouched.current = true;
							setCountries(next);
						}}
						disabled={saving}
					/>
					<TagList
						label="Subjects"
						values={subjects}
						onChange={setSubjects}
						empty="No subjects yet."
						action={
							<SuggestSubjectsButton
								title={title}
								authors={authors}
								publishedIn={yearNumber || undefined}
								excerpt={excerpt || undefined}
								subjects={subjects}
								onAccept={setSubjects}
							/>
						}
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
					selection={series}
					onChange={setSeries}
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
					onChange={setReadAfterBooks}
				/>
			),
		},
		{
			id: "library",
			title: "In the library",
			description:
				"Whether it can be picked for a sitting, and who hears about it.",
			summary: [
				hidden ? "Hidden from sittings" : "Open to sittings",
				notifyMembers ? "members told" : "quiet add",
			].join(" · "),
			content: (
				<div className="flex flex-col gap-3">
					<ToggleRow
						id={`${uid}-hidden`}
						label="Hidden from sittings"
						description="It never appears on a poll. Members can still read, review and shelve it."
						checked={hidden}
						onCheckedChange={setHidden}
					/>
					<ToggleRow
						id={`${uid}-notify`}
						label="Tell members about the new book"
						description="Members who follow one of its authors hear about it. Turn off for a quiet add."
						checked={notifyMembers}
						onCheckedChange={setNotifyMembers}
					/>
				</div>
			),
		},
	];

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				void save();
			}}
			onKeyDown={(event) => {
				if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
					event.preventDefault();
					void save();
				}
			}}
			noValidate
			className="flex flex-col"
		>
			<BookWorkspace
				header={<SimilarBooksWarning title={title} authors={authors} />}
				openRequest={openRequest}
				preview={
					<BookPreviewCard
						title={title}
						authors={authors}
						coverUrl={coverUrl}
						pages={pagesNumber || null}
						publishedIn={yearNumber || null}
						seriesLabel={seriesLabel}
						excerpt={excerpt}
					/>
				}
				sections={sections}
				actionBar={
					<BookWorkspaceActionBar
						hint={
							pagesNumber > 0
								? undefined
								: "Add the page count to save this book."
						}
						leading={
							<Button
								render={<Link href={"/books/new" as never} />}
								nativeButton={false}
								variant="ghost"
								disabled={saving}
							>
								Back to Open Library search
							</Button>
						}
						trailing={
							<LoadingButton
								type="submit"
								className={cn("min-w-32")}
								loading={saving}
							>
								Add book
								<HotkeyChip id="save" />
							</LoadingButton>
						}
					/>
				}
			/>

			{cropFile ? (
				<CoverCropper
					file={cropFile}
					onCancel={() => setCropFile(null)}
					onDone={(file) => void onCropped(file)}
				/>
			) : null}
		</form>
	);
}
