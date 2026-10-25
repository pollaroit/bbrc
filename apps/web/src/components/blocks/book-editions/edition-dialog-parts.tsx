"use client";

/**
 * Small building blocks of the add / edit edition dialog:
 *
 * - `FormSection`        a plain heading with an optional one-line helper
 * - `ChoiceChips`        a radio group of chips (language, format)
 * - `StatusLine`         a one-line message with a tone (found, not found, warning…)
 * - `CoverDropzone`      drag, drop, paste or choose a cover image
 * - `EditionPreviewCard` a live card of the edition as it will look
 * - `EditionPreviewStrip` the same, compact, for phones
 */

import { isValidIsbn13 } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	AlertCircle,
	BadgeCheck,
	BookOpen,
	Check,
	ImagePlus,
	Info,
	Loader2,
	Trash2,
	Users,
} from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { useId, useRef, useState } from "react";
import { bookCoverFrameClassName } from "@/lib/book-cover";
import { cn } from "@/lib/utils";

// ── Sections ───────────────────────────────────────────────────────────────

export function FormSection({
	title,
	description,
	children,
	className,
}: {
	title: string;
	description?: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	const id = useId();
	return (
		<section
			aria-labelledby={id}
			className={cn("flex flex-col gap-3", className)}
		>
			<div className="flex flex-col gap-0.5">
				<h3 id={id} className="font-semibold text-sm tracking-tight">
					{title}
				</h3>
				{description ? (
					<p className="text-muted-foreground text-xs leading-relaxed">
						{description}
					</p>
				) : null}
			</div>
			{children}
		</section>
	);
}

export function FieldLabel({
	htmlFor,
	children,
	hint,
}: {
	htmlFor?: string;
	children: ReactNode;
	hint?: ReactNode;
}) {
	return (
		<span className="flex flex-col gap-0.5">
			<label htmlFor={htmlFor} className="font-medium text-sm">
				{children}
			</label>
			{hint ? (
				<span className="text-muted-foreground text-xs">{hint}</span>
			) : null}
		</span>
	);
}

// ── Chips ──────────────────────────────────────────────────────────────────

export type Choice<T extends string> = {
	id: T;
	label: string;
	/** A short code shown small next to the label (for example ENG). */
	code?: string;
	icon?: ReactNode;
};

/** A radio group drawn as chips (real radio inputs, so arrow keys just work). */
export function ChoiceChips<T extends string>({
	label,
	value,
	options,
	onChange,
	variant = "inline",
	className,
}: {
	label: string;
	value: T;
	options: readonly Choice<T>[];
	onChange: (value: T) => void;
	/** `tile` stacks the icon above the label. */
	variant?: "inline" | "tile";
	className?: string;
}) {
	const name = useId();

	return (
		<fieldset
			className={cn(
				"m-0 min-w-0 border-0 p-0",
				variant === "tile"
					? "grid grid-cols-3 gap-2 sm:grid-cols-5"
					: "flex flex-wrap gap-2",
				className,
			)}
		>
			<legend className="sr-only">{label}</legend>
			{options.map((option) => {
				const active = option.id === value;
				return (
					<label
						key={option.id}
						className={cn(
							"flex cursor-pointer border text-sm transition-colors has-focus-visible:outline-2 has-focus-visible:outline-ring has-focus-visible:outline-offset-2",
							variant === "tile"
								? "flex-col items-center gap-1.5 px-2 py-2.5"
								: "items-center gap-2 px-3 py-1.5",
							active
								? "border-foreground bg-foreground text-background"
								: "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
						)}
					>
						<input
							type="radio"
							name={name}
							value={option.id}
							checked={active}
							onChange={() => onChange(option.id)}
							className="sr-only"
						/>
						{option.icon ? (
							<span className="[&_svg]:size-4" aria-hidden>
								{option.icon}
							</span>
						) : null}
						<span className={variant === "tile" ? "text-xs" : undefined}>
							{option.label}
						</span>
						{option.code ? (
							<span
								className={cn(
									"font-mono text-3xs uppercase tracking-wide",
									active ? "text-background/70" : "text-muted-foreground/70",
								)}
							>
								{option.code}
							</span>
						) : null}
					</label>
				);
			})}
		</fieldset>
	);
}

// ── Status line ────────────────────────────────────────────────────────────

export type Tone = "neutral" | "success" | "warning" | "danger" | "loading";

const TONE_CLASS: Record<Tone, string> = {
	neutral: "text-muted-foreground",
	success: "text-success-ink",
	warning: "text-warning-ink",
	danger: "text-destructive",
	loading: "text-muted-foreground",
};

export function StatusLine({
	tone,
	children,
	action,
}: {
	tone: Tone;
	children: ReactNode;
	action?: ReactNode;
}) {
	const Icon =
		tone === "success"
			? Check
			: tone === "danger" || tone === "warning"
				? AlertCircle
				: tone === "loading"
					? Loader2
					: Info;
	return (
		<p
			className={cn(
				"flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-relaxed",
				TONE_CLASS[tone],
			)}
			role={tone === "danger" || tone === "warning" ? "alert" : "status"}
		>
			<span className="flex items-center gap-1.5">
				<Icon
					className={cn(
						"size-3.5 shrink-0",
						tone === "loading" && "animate-spin",
					)}
					aria-hidden
				/>
				{children}
			</span>
			{action}
		</p>
	);
}

// ── Cover dropzone ─────────────────────────────────────────────────────────

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SOURCE_BYTES = 5 * 1024 * 1024;

export function CoverDropzone({
	hasCover,
	uploading,
	onFile,
	onError,
	onRemove,
}: {
	hasCover: boolean;
	uploading: boolean;
	onFile: (file: File) => void;
	onError: (message: string) => void;
	onRemove: () => void;
}) {
	const fileRef = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);

	function accept(file: File | undefined | null) {
		if (!file) return;
		if (!IMAGE_TYPES.includes(file.type)) {
			onError("Use a JPEG, PNG or WebP image.");
			return;
		}
		if (file.size > MAX_SOURCE_BYTES) {
			onError("Choose an image under 5 MB.");
			return;
		}
		onFile(file);
	}

	return (
		<div className="flex flex-col gap-2">
			{/* biome-ignore lint/a11y/useSemanticElements: a drop target that also opens the file picker */}
			<div
				role="button"
				tabIndex={0}
				aria-label="Add a cover: drop an image here, paste one, or press Enter to choose a file"
				aria-busy={uploading}
				onClick={() => !uploading && fileRef.current?.click()}
				onKeyDown={(event) => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						if (!uploading) fileRef.current?.click();
					}
				}}
				onDragOver={(event) => {
					event.preventDefault();
					setDragging(true);
				}}
				onDragLeave={() => setDragging(false)}
				onDrop={(event) => {
					event.preventDefault();
					setDragging(false);
					accept(event.dataTransfer.files[0]);
				}}
				className={cn(
					"flex cursor-pointer items-center gap-3 border border-dashed px-4 py-4 text-start transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
					dragging
						? "border-foreground bg-muted/60"
						: "border-border hover:border-foreground/40 hover:bg-muted/30",
				)}
			>
				<span className="flex size-10 shrink-0 items-center justify-center border border-border bg-background text-muted-foreground">
					{uploading ? (
						<Loader2 className="size-4 animate-spin" aria-hidden />
					) : (
						<ImagePlus className="size-4" aria-hidden />
					)}
				</span>
				<span className="flex min-w-0 flex-col gap-0.5">
					<span className="font-medium text-sm">
						{uploading
							? "Uploading the cover…"
							: hasCover
								? "Replace the cover"
								: "Drop an image, paste it, or choose a file"}
					</span>
					<span className="text-muted-foreground text-xs">
						JPEG, PNG or WebP, up to 5 MB. You will crop it to the 2:3 shape of
						a book.
					</span>
				</span>
			</div>
			<input
				ref={fileRef}
				type="file"
				accept={IMAGE_TYPES.join(",")}
				className="sr-only"
				tabIndex={-1}
				aria-label="Choose a cover image"
				onChange={(event) => {
					const file = event.target.files?.[0];
					event.target.value = "";
					accept(file);
				}}
			/>
			{hasCover && !uploading ? (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="w-fit text-muted-foreground"
					onClick={onRemove}
				>
					<Trash2 data-icon="inline-start" aria-hidden />
					Remove the cover
				</Button>
			) : null}
		</div>
	);
}

// ── Preview ────────────────────────────────────────────────────────────────

export type EditionPreviewData = {
	bookTitle: string;
	title: string;
	languageLabel: string;
	formatLabel: string;
	formatIcon: ReactNode;
	pages: number | null;
	isbn: string;
	publisher: string;
	year: string;
	coverUrl: string | null;
	uploading: boolean;
	status: "member" | "verified";
	addedBy: string;
	readers?: number;
};

function Fade({ id, children }: { id: string | number; children: ReactNode }) {
	// Re-keying replays a short fade, so edits to the form are felt in the card.
	return (
		<span
			key={id}
			className="fade-in-0 animate-in duration-200 motion-reduce:animate-none"
		>
			{children}
		</span>
	);
}

function cleanIsbn(value: string) {
	const digits = value.replace(/[\s-]/g, "").toUpperCase();
	return digits.length >= 10 ? digits : "";
}

function CoverFrame({
	coverUrl,
	uploading,
	formatIcon,
	className,
	sizes,
}: {
	coverUrl: string | null;
	uploading: boolean;
	formatIcon: ReactNode;
	className?: string;
	sizes: string;
}) {
	return (
		<div
			className={cn(
				"relative aspect-2/3 w-full shrink-0",
				bookCoverFrameClassName,
				className,
			)}
		>
			{coverUrl ? (
				<Image
					key={coverUrl}
					src={coverUrl}
					alt="Edition cover"
					fill
					className="fade-in-0 animate-in object-cover duration-300 motion-reduce:animate-none"
					sizes={sizes}
				/>
			) : (
				<div className="flex size-full flex-col items-center justify-center gap-2 bg-muted px-2 text-center text-muted-foreground">
					<span className="[&_svg]:size-6" aria-hidden>
						{formatIcon}
					</span>
					<span className="text-2xs">No cover yet</span>
				</div>
			)}
			{uploading ? (
				<div className="absolute inset-0 flex items-center justify-center bg-background/70">
					<Loader2 className="size-5 animate-spin" aria-hidden />
				</div>
			) : null}
		</div>
	);
}

function StatusBadge({ status }: { status: "member" | "verified" }) {
	return status === "verified" ? (
		<span className="inline-flex items-center gap-1 border border-success/40 bg-success/10 px-1.5 py-0.5 text-2xs text-success-ink">
			<BadgeCheck className="size-3" aria-hidden />
			Verified
		</span>
	) : (
		<span className="inline-flex items-center gap-1 border border-border bg-muted/40 px-1.5 py-0.5 text-2xs text-muted-foreground">
			<Users className="size-3" aria-hidden />
			Member-added
		</span>
	);
}

/** The edition as it will look on the editions page (desktop, sticky). */
export function EditionPreviewCard({ data }: { data: EditionPreviewData }) {
	const isbn = cleanIsbn(data.isbn);
	const showsTitle = data.title.trim() !== "";
	const meta = [data.publisher.trim(), data.year.trim()].filter(Boolean);
	return (
		<aside
			aria-label="Preview of this edition"
			className="flex flex-col gap-4 border border-border bg-muted/20 p-4"
		>
			<p className="text-muted-foreground text-xs">How it will look</p>
			<CoverFrame
				coverUrl={data.coverUrl}
				uploading={data.uploading}
				formatIcon={data.formatIcon}
				className="mx-auto max-w-[11rem]"
				sizes="176px"
			/>
			<div className="flex min-w-0 flex-col gap-2">
				<div className="flex flex-col gap-0.5">
					<Fade id={showsTitle ? data.title : data.bookTitle}>
						<span className="line-clamp-2 font-semibold text-sm leading-snug">
							{showsTitle ? data.title : data.bookTitle}
						</span>
					</Fade>
					{showsTitle ? (
						<span className="line-clamp-1 text-muted-foreground text-xs">
							Edition of {data.bookTitle}
						</span>
					) : null}
				</div>
				<div className="flex flex-wrap items-center gap-1.5">
					<Fade id={data.languageLabel}>
						<span className="border border-border bg-background px-1.5 py-0.5 text-2xs">
							{data.languageLabel}
						</span>
					</Fade>
					<Fade id={data.formatLabel}>
						<span className="inline-flex items-center gap-1 border border-border bg-background px-1.5 py-0.5 text-2xs [&_svg]:size-3">
							{data.formatIcon}
							{data.formatLabel}
						</span>
					</Fade>
				</div>
				<dl className="flex flex-col gap-1 text-muted-foreground text-xs tabular-nums">
					<div className="flex items-center gap-1.5">
						<BookOpen className="size-3.5 shrink-0" aria-hidden />
						<dt className="sr-only">Pages</dt>
						<dd>
							<Fade id={data.pages ?? "none"}>
								{data.pages
									? `${data.pages.toLocaleString("en-US")} pages`
									: "Pages: not set"}
							</Fade>
						</dd>
					</div>
					{meta.length > 0 ? (
						<div>
							<dt className="sr-only">Publisher and year</dt>
							<dd>
								<Fade id={meta.join("|")}>{meta.join(", ")}</Fade>
							</dd>
						</div>
					) : null}
					{isbn ? (
						<div>
							<dt className="sr-only">ISBN</dt>
							<dd className="flex items-center gap-1.5">
								<Fade id={isbn}>ISBN {isbn}</Fade>
								{isbn.length === 13 && !isValidIsbn13(isbn) ? (
									<span className="text-destructive">check digit</span>
								) : null}
							</dd>
						</div>
					) : null}
				</dl>
				<div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-border border-t pt-2">
					<StatusBadge status={data.status} />
					<span className="text-muted-foreground text-xs">
						Added by {data.addedBy}
					</span>
					{data.readers ? (
						<span className="text-muted-foreground text-xs">
							{data.readers} {data.readers === 1 ? "reader" : "readers"}
						</span>
					) : null}
				</div>
			</div>
		</aside>
	);
}

/** The same card, shrunk to a row for phones and narrow windows. */
export function EditionPreviewStrip({ data }: { data: EditionPreviewData }) {
	const showsTitle = data.title.trim() !== "";
	const bits = [
		data.languageLabel,
		data.formatLabel,
		data.pages ? `${data.pages} pages` : null,
		data.year.trim() || null,
	].filter(Boolean);
	return (
		<section
			aria-label="Preview of this edition"
			className="flex items-center gap-3 border-border border-b bg-muted/20 px-4 py-2.5"
		>
			<CoverFrame
				coverUrl={data.coverUrl}
				uploading={data.uploading}
				formatIcon={data.formatIcon}
				className="w-9"
				sizes="36px"
			/>
			<div className="flex min-w-0 flex-col gap-0.5">
				<span className="line-clamp-1 font-medium text-sm">
					{showsTitle ? data.title : data.bookTitle}
				</span>
				<span className="line-clamp-1 text-muted-foreground text-xs">
					{bits.join(" · ")}
				</span>
			</div>
			<span className="ms-auto shrink-0">
				<StatusBadge status={data.status} />
			</span>
		</section>
	);
}
