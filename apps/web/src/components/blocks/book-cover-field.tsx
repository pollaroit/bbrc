"use client";

/**
 * Cover chooser for the add and edit pages.
 *
 * Props
 * - `title`   the book title (used in labels).
 * - `olid`    the Open Library work id, to offer the covers of its editions.
 * - `value`   `{ coverId, customCoverUrl, removeUploaded? }`
 *               coverId        the cover id in use (positive = Open Library, negative = uploaded).
 *               customCoverUrl a cover uploaded in this session that is not saved yet.
 *               removeUploaded set when the book's saved upload should be dropped.
 * - `onChange`  called with the next value.
 * - `uploadedCoverPresent`  edit page: the saved book already has an uploaded cover
 *                           (its coverId is negative); shows "Remove uploaded cover".
 *
 * Mapping to the API: send `coverId` as is; send `customCoverUrl` when it is a string;
 * when `removeUploaded` is true send `customCoverUrl: null` (add page: leave it out).
 *
 * Upload your own: drop a file on the field, pick one, or paste an image (click in
 * the field, then Ctrl/⌘+V). JPEG, PNG or WebP up to 5 MB; it is cropped to the
 * fixed 2:3 shape and saved as a 600 × 900 WebP. Remote image URLs are never accepted.
 */

import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BookOpen, ImagePlus, Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import { useId, useRef, useState } from "react";
import { CoverCropper } from "@/components/blocks/cover-cropper";
import { bookCoverFrameClassName, bookCoverUrl } from "@/lib/book-cover";
import { fetchOpenLibraryEditionCovers } from "@/lib/open-library/covers";
import { uploadBookCover } from "@/lib/storage/upload-book-cover";
import { cn } from "@/lib/utils";

export type BookCoverValue = {
	coverId: number | null;
	customCoverUrl: string | null;
	removeUploaded?: boolean;
};

export type BookCoverFieldProps = {
	title: string;
	olid?: string | null;
	value: BookCoverValue;
	onChange: (value: BookCoverValue) => void;
	uploadedCoverPresent?: boolean;
	className?: string;
};

const SOURCE_MAX_BYTES = 5 * 1024 * 1024;
const SOURCE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function Frame({
	src,
	label,
	className,
}: {
	src: string | null;
	label: string;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"relative block aspect-2/3 shrink-0",
				bookCoverFrameClassName,
				className,
			)}
		>
			{src ? (
				<Image
					src={src}
					alt={label}
					fill
					className="object-cover"
					sizes="180px"
				/>
			) : (
				<span className="flex size-full flex-col items-center justify-center gap-1 px-1 text-center text-2xs text-muted-foreground">
					<BookOpen className="size-5" aria-hidden />
					No cover
				</span>
			)}
		</span>
	);
}

export function BookCoverField({
	title,
	olid,
	value,
	onChange,
	uploadedCoverPresent = false,
	className,
}: BookCoverFieldProps) {
	const uid = useId();
	const fileInput = useRef<HTMLInputElement>(null);
	const [pendingFile, setPendingFile] = useState<File | null>(null);
	const [dragging, setDragging] = useState(false);
	const [problem, setProblem] = useState<string | null>(null);

	const covers = useQuery({
		queryKey: ["open-library-edition-covers", olid],
		queryFn: () => fetchOpenLibraryEditionCovers(olid as string),
		enabled: Boolean(olid),
		staleTime: 5 * 60_000,
	});

	const upload = useMutation({
		mutationFn: (file: File) => uploadBookCover(file),
		onSuccess: ({ publicUrl }) => {
			setProblem(null);
			onChange({ coverId: value.coverId, customCoverUrl: publicUrl });
		},
		onError: (error) =>
			setProblem(error instanceof Error ? error.message : "Upload failed."),
	});

	const editionCovers = (covers.data ?? []).map((cover) => cover.coverId);
	// The cover already chosen (for example from the search result) comes first.
	const choices = [
		...(value.coverId != null &&
		value.coverId > 0 &&
		!editionCovers.includes(value.coverId)
			? [value.coverId]
			: []),
		...editionCovers,
	];

	const hasFreshUpload = value.customCoverUrl != null;
	const usesSavedUpload =
		!hasFreshUpload &&
		uploadedCoverPresent &&
		!value.removeUploaded &&
		value.coverId != null &&
		value.coverId < 0;
	const previewSrc = hasFreshUpload
		? value.customCoverUrl
		: bookCoverUrl(value.coverId, "L");

	function acceptFiles(files: FileList | File[] | null | undefined) {
		const file = Array.from(files ?? []).find((entry) =>
			entry.type.startsWith("image/"),
		);
		if (!file) {
			setProblem("Pick or drop an image file.");
			return;
		}
		if (!SOURCE_TYPES.includes(file.type)) {
			setProblem("Use a JPEG, PNG or WebP image.");
			return;
		}
		if (file.size > SOURCE_MAX_BYTES) {
			setProblem("That image is over 5 MB. Pick a smaller one.");
			return;
		}
		setProblem(null);
		setPendingFile(file);
	}

	function pickEdition(coverId: number) {
		setProblem(null);
		onChange({
			coverId,
			customCoverUrl: null,
			removeUploaded: uploadedCoverPresent ? true : undefined,
		});
	}

	function removeUpload() {
		setProblem(null);
		if (hasFreshUpload) {
			// Only drops the new file; a saved upload (if any) stays.
			onChange({ coverId: value.coverId, customCoverUrl: null });
			return;
		}
		onChange({
			coverId: choices.find((id) => id > 0) ?? null,
			customCoverUrl: null,
			removeUploaded: true,
		});
	}

	const busy = upload.isPending;

	return (
		<section
			aria-label={`Cover of ${title || "this book"}`}
			className={cn(
				"flex flex-col gap-4 border p-3 transition-colors sm:flex-row sm:p-4",
				dragging ? "border-primary bg-primary/5" : "border-border",
				className,
			)}
			onDragOver={(event) => {
				if (event.dataTransfer.types.includes("Files")) {
					event.preventDefault();
					setDragging(true);
				}
			}}
			onDragLeave={() => setDragging(false)}
			onDrop={(event) => {
				event.preventDefault();
				setDragging(false);
				acceptFiles(event.dataTransfer.files);
			}}
			onPaste={(event) => {
				const files = Array.from(event.clipboardData.files);
				if (files.length > 0) {
					event.preventDefault();
					acceptFiles(files);
				}
			}}
		>
			<div className="relative mx-auto w-36 shrink-0 sm:mx-0 sm:w-40">
				<Frame
					src={previewSrc}
					label={`Cover of ${title || "this book"}`}
					className="w-full"
				/>
				{busy ? (
					<span className="absolute inset-0 flex items-center justify-center gap-2 bg-background/70 text-sm">
						<Loader2 className="size-4 animate-spin" aria-hidden />
						Uploading…
					</span>
				) : null}
			</div>

			<div className="flex min-w-0 flex-1 flex-col gap-3">
				<div className="flex flex-col gap-0.5">
					<h3 className="font-medium text-sm">Cover</h3>
					<p className="text-muted-foreground text-xs leading-relaxed">
						Pick a cover from the editions, or upload your own. Covers are
						always 2:3, so every book on the shelf lines up.
					</p>
				</div>

				<ul
					className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]"
					aria-label="Cover choices"
				>
					<li className="shrink-0">
						<button
							type="button"
							disabled={busy}
							onClick={() => fileInput.current?.click()}
							className={cn(
								"flex aspect-2/3 w-14 flex-col items-center justify-center gap-1 border border-dashed text-2xs text-muted-foreground transition-colors hover:border-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50",
								hasFreshUpload || usesSavedUpload
									? "border-primary bg-primary/10 text-foreground"
									: "border-border",
							)}
							aria-label="Upload your own cover"
						>
							{usesSavedUpload ? (
								<Frame
									src={bookCoverUrl(value.coverId, "M")}
									label="Your uploaded cover"
									className="w-full"
								/>
							) : (
								<>
									<ImagePlus className="size-4" aria-hidden />
									Upload
								</>
							)}
						</button>
					</li>
					{covers.isPending && olid
						? Array.from({ length: 4 }, (_, index) => (
								<li key={index} className="shrink-0">
									<Skeleton className="aspect-2/3 w-14" aria-hidden />
								</li>
							))
						: choices.map((coverId) => {
								const selected =
									!hasFreshUpload &&
									!usesSavedUpload &&
									value.coverId === coverId;
								return (
									<li key={coverId} className="shrink-0">
										<button
											type="button"
											disabled={busy}
											aria-pressed={selected}
											onClick={() => pickEdition(coverId)}
											className={cn(
												"block w-14 transition-opacity focus-visible:outline-2 focus-visible:outline-ring",
												selected
													? "outline-2 outline-primary"
													: "opacity-80 hover:opacity-100",
											)}
										>
											<Frame
												src={bookCoverUrl(coverId, "S")}
												label={`Edition cover ${coverId}`}
												className="w-full"
											/>
										</button>
									</li>
								);
							})}
				</ul>

				{covers.isError ? (
					<p className="text-muted-foreground text-xs">
						Could not load edition covers. You can still upload your own.
					</p>
				) : !covers.isPending && choices.length === 0 ? (
					<p className="text-muted-foreground text-xs">
						Open Library has no covers for this work. Upload your own.
					</p>
				) : null}

				<input
					ref={fileInput}
					id={`${uid}-file`}
					type="file"
					accept="image/jpeg,image/png,image/webp"
					className="sr-only"
					tabIndex={-1}
					onChange={(event) => {
						acceptFiles(event.target.files);
						event.target.value = "";
					}}
				/>

				<p className="text-muted-foreground text-xs">
					Drop an image here, or click here and press{" "}
					<kbd className="border border-border bg-muted px-1 font-mono text-3xs">
						Ctrl/⌘ V
					</kbd>{" "}
					to paste one. JPEG, PNG or WebP, up to 5 MB.
				</p>

				{problem ? (
					<p className="text-destructive text-xs" role="alert">
						{problem}
					</p>
				) : null}

				{hasFreshUpload || usesSavedUpload ? (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="w-fit text-destructive"
						disabled={busy}
						onClick={removeUpload}
					>
						<Trash2 data-icon="inline-start" />
						{hasFreshUpload ? "Discard the new cover" : "Remove uploaded cover"}
					</Button>
				) : null}
			</div>

			{pendingFile ? (
				<CoverCropper
					file={pendingFile}
					onCancel={() => setPendingFile(null)}
					onDone={(cropped) => {
						setPendingFile(null);
						upload.mutate(cropped);
					}}
				/>
			) : null}
		</section>
	);
}
