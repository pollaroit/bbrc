"use client";

import {
	type DocumentLanguageCode,
	MAX_DOCS_PER_BOOK,
	MAX_DOCUMENT_BYTES,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { FileUp } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { DocumentLanguagePicker } from "@/components/blocks/document-language-picker";
import { orpc, queryClient } from "@/utils/orpc";

function formatFileSize(bytes: number): string {
	if (bytes < 1024) {
		return `${bytes} B`;
	}
	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)} KB`;
	}
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type CreateDocumentFormProps = {
	bookSlug: string;
	bookTitle: string;
	approvedDocumentCount: number;
	isAdmin: boolean;
};

export function CreateDocumentForm({
	bookSlug,
	bookTitle,
	approvedDocumentCount,
	isAdmin,
}: CreateDocumentFormProps) {
	const router = useRouter();
	const nameId = useId();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [name, setName] = useState("");
	const [language, setLanguage] = useState<DocumentLanguageCode>("en");
	const [file, setFile] = useState<File | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const atCap = approvedDocumentCount >= MAX_DOCS_PER_BOOK;
	const slotsLeft = Math.max(0, MAX_DOCS_PER_BOOK - approvedDocumentCount);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();

		if (atCap) {
			toast.error(
				`This book already has ${MAX_DOCS_PER_BOOK} approved documents.`,
			);
			return;
		}

		if (!file) {
			toast.error("Choose a PDF file.");
			return;
		}

		if (file.type !== "application/pdf") {
			toast.error("Only PDF files are allowed.");
			return;
		}

		if (file.size > MAX_DOCUMENT_BYTES) {
			toast.error("PDF must be 10 MB or smaller.");
			return;
		}

		setSubmitting(true);
		const formData = new FormData();
		formData.append("bookSlug", bookSlug);
		formData.append("name", name.trim());
		formData.append("language", language);
		formData.append("file", file);

		try {
			const response = await fetch("/api/documents/create", {
				method: "POST",
				body: formData,
			});
			const body = (await response.json().catch(() => null)) as {
				slug?: string;
				status?: "pending" | "approved";
				error?: string;
			} | null;

			if (!response.ok) {
				throw new Error(body?.error ?? "Could not submit document.");
			}

			toast.success(
				body?.status === "approved"
					? "Document published on the book page."
					: "Document submitted for admin review.",
			);
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: orpc.document.listMine.key(),
				}),
				queryClient.invalidateQueries({
					queryKey: orpc.document.listPending.key(),
				}),
				queryClient.invalidateQueries({
					queryKey: orpc.document.listApprovedByBook.key(),
				}),
				queryClient.invalidateQueries({
					queryKey: orpc.book.getBookList.key(),
				}),
			]);
			router.push(`/books/${bookSlug}` as Route);
			router.refresh();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Could not submit document.",
			);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<form
			className="flex max-w-2xl flex-col gap-6 pb-8"
			onSubmit={handleSubmit}
		>
			{atCap ? (
				<p className="border border-destructive/40 bg-destructive/5 px-4 py-3 text-destructive text-sm leading-relaxed">
					{bookTitle} already has {MAX_DOCS_PER_BOOK} approved documents. Remove
					or replace one before adding another.
				</p>
			) : (
				<p className="text-muted-foreground text-sm leading-relaxed">
					{isAdmin
						? `As an admin, your PDF is published immediately (${slotsLeft} of ${MAX_DOCS_PER_BOOK} slots left on this book).`
						: `Members can upload up to ${MAX_DOCS_PER_BOOK} approved PDFs per book. Admins review submissions (${slotsLeft} slot${slotsLeft === 1 ? "" : "s"} left).`}
				</p>
			)}

			<Card size="sm">
				<CardHeader className="border-b">
					<CardTitle className="text-base">Document details</CardTitle>
					<CardDescription>
						How this PDF should appear in the library for {bookTitle}.
					</CardDescription>
				</CardHeader>
				<CardContent className="pt-6">
					<FieldSet>
						<FieldGroup className="gap-6">
							<Field>
								<FieldLabel htmlFor={nameId}>Title</FieldLabel>
								<FieldDescription>
									A short name members will recognize, such as &quot;Chapter
									summary&quot; or &quot;Reading guide&quot;.
								</FieldDescription>
								<Input
									id={nameId}
									value={name}
									onChange={(event) => setName(event.target.value)}
									maxLength={120}
									required
									disabled={atCap || submitting}
									placeholder="e.g. Study guide (2026 edition)"
									autoComplete="off"
								/>
							</Field>

							<Field>
								<FieldLegend className="mb-3 font-medium text-sm">
									Language
								</FieldLegend>
								<FieldDescription className="mb-3">
									Primary language of the PDF text.
								</FieldDescription>
								<DocumentLanguagePicker
									value={language}
									onChange={setLanguage}
									disabled={atCap || submitting}
								/>
							</Field>
						</FieldGroup>
					</FieldSet>
				</CardContent>
			</Card>

			<Card size="sm">
				<CardHeader className="border-b">
					<CardTitle className="text-base">PDF file</CardTitle>
					<CardDescription>
						One file per document. Maximum {formatFileSize(MAX_DOCUMENT_BYTES)}.
					</CardDescription>
				</CardHeader>
				<CardContent className="pt-6">
					<input
						ref={fileInputRef}
						type="file"
						accept="application/pdf"
						className="sr-only"
						disabled={atCap || submitting}
						onChange={(event) => {
							setFile(event.target.files?.[0] ?? null);
						}}
					/>
					<div className="flex flex-col gap-4">
						<button
							type="button"
							disabled={atCap || submitting}
							onClick={() => fileInputRef.current?.click()}
							className="flex flex-col items-center gap-2 border border-border border-dashed bg-muted/20 px-6 py-8 text-center transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<FileUp
								className="size-8 text-muted-foreground"
								strokeWidth={1.5}
								aria-hidden
							/>
							<span className="font-medium text-sm">
								{file ? "Choose a different PDF" : "Select PDF to upload"}
							</span>
							<span className="text-muted-foreground text-xs">
								application/pdf only
							</span>
						</button>
						{file ? (
							<p className="text-muted-foreground text-sm">
								<span className="font-medium text-foreground">{file.name}</span>
								{" · "}
								{formatFileSize(file.size)}
							</p>
						) : null}
					</div>
				</CardContent>
			</Card>

			<div className="flex flex-wrap items-center gap-3">
				<LoadingButton
					type="submit"
					loading={submitting}
					disabled={atCap || name.trim().length < 2 || !file}
				>
					{isAdmin ? "Publish document" : "Submit for review"}
				</LoadingButton>
				<Button
					render={<Link href={`/books/${bookSlug}` as Route} />}
					nativeButton={false}
					type="button"
					variant="outline"
					disabled={submitting}
				>
					Cancel
				</Button>
			</div>
		</form>
	);
}
