"use client";

import type { GetDocumentForEditOutput } from "@bbrc/api/modules/document/document.schema";
import {
	type DocumentLanguageCode,
	isDocumentLanguageCode,
	MAX_DOCUMENT_BYTES,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Field, FieldDescription, FieldLabel } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { DocumentLanguagePicker } from "@/components/blocks/document-language-picker";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

type EditDocumentFormProps = {
	document: GetDocumentForEditOutput;
};

export function EditDocumentForm({ document }: EditDocumentFormProps) {
	const { data: session } = authClient.useSession();
	const router = useRouter();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [name, setName] = useState(document.name);
	const [language, setLanguage] = useState<DocumentLanguageCode>(
		isDocumentLanguageCode(document.language) ? document.language : "en",
	);
	const [replaceFile, setReplaceFile] = useState<File | null>(null);
	const [replacing, setReplacing] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);

	const updateMutation = useMutation(
		orpc.document.update.mutationOptions({
			onSuccess: async () => {
				toast.success("Document updated.");
				await invalidateDocumentQueries();
				router.refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const deleteMutation = useMutation(
		orpc.document.delete.mutationOptions({
			onSuccess: async () => {
				setDeleteOpen(false);
				toast.success("Document deleted.");
				await invalidateDocumentQueries();
				router.push(`/books/${document.bookSlug}`);
				router.refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	async function invalidateDocumentQueries() {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: orpc.document.listApprovedByBook.key(),
			}),
			queryClient.invalidateQueries({
				queryKey: orpc.document.listMine.key(),
			}),
			queryClient.invalidateQueries({
				queryKey: orpc.document.listPending.key(),
			}),
		]);
	}

	async function handleReplacePdf() {
		if (!replaceFile) {
			toast.error("Choose a PDF file.");
			return;
		}

		if (replaceFile.type !== "application/pdf") {
			toast.error("Only PDF files are allowed.");
			return;
		}

		if (replaceFile.size > MAX_DOCUMENT_BYTES) {
			toast.error("PDF must be 10 MB or smaller.");
			return;
		}

		setReplacing(true);
		const formData = new FormData();
		formData.append("bookSlug", document.bookSlug);
		formData.append("documentSlug", document.slug);
		formData.append("file", replaceFile);

		try {
			const response = await fetch("/api/documents/replace", {
				method: "POST",
				body: formData,
			});
			const body = (await response.json().catch(() => null)) as {
				error?: string;
				status?: string;
			} | null;

			if (!response.ok) {
				throw new Error(body?.error ?? "Could not replace PDF.");
			}

			toast.success(
				body?.status === "pending"
					? "PDF replaced and sent for review again."
					: "PDF replaced.",
			);
			setReplaceFile(null);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
			await invalidateDocumentQueries();
			router.refresh();
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Could not replace PDF.",
			);
		} finally {
			setReplacing(false);
		}
	}

	const metadataLocked =
		document.status === "approved" && !session?.user.isAdmin;

	return (
		<div className="flex max-w-lg flex-col gap-6">
			<p className="text-muted-foreground text-sm capitalize">
				Status: {document.status}
			</p>

			<form
				className="flex flex-col gap-4"
				onSubmit={(event) => {
					event.preventDefault();
					if (metadataLocked) {
						return;
					}
					updateMutation.mutate({
						bookSlug: document.bookSlug,
						documentSlug: document.slug,
						name: name.trim(),
						language,
					});
				}}
			>
				<Field>
					<FieldLabel htmlFor="edit-doc-name">Title</FieldLabel>
					<FieldDescription>
						Shown on the book page and in download lists.
					</FieldDescription>
					<Input
						id="edit-doc-name"
						value={name}
						onChange={(event) => setName(event.target.value)}
						maxLength={120}
						required
						disabled={metadataLocked || updateMutation.isPending}
						placeholder="Document title"
					/>
				</Field>

				<Field>
					<FieldLabel>Language</FieldLabel>
					<FieldDescription className="mb-3">
						Primary language of the PDF.
					</FieldDescription>
					<DocumentLanguagePicker
						value={language}
						onChange={setLanguage}
						disabled={metadataLocked || updateMutation.isPending}
					/>
				</Field>

				{!metadataLocked ? (
					<LoadingButton
						type="submit"
						loading={updateMutation.isPending}
						disabled={name.trim().length < 2}
					>
						Save metadata
					</LoadingButton>
				) : (
					<p className="text-muted-foreground text-xs">
						Approved documents cannot change title or language here. Replace the
						PDF to submit a new version for review.
					</p>
				)}
			</form>

			<Field>
				<FieldLabel>Current PDF</FieldLabel>
				<Button
					render={
						<a
							href={document.documentUrl}
							target="_blank"
							rel="noopener noreferrer"
						/>
					}
					nativeButton={false}
					size="sm"
					variant="outline"
					className="w-fit"
				>
					Open PDF
				</Button>
			</Field>

			<Field>
				<FieldLabel>Replace PDF</FieldLabel>
				<FieldDescription>
					{session?.user.isAdmin
						? "Upload a new PDF file for this document."
						: "Replacing an approved document sends it back to pending for admins."}
				</FieldDescription>
				<input
					ref={fileInputRef}
					type="file"
					accept="application/pdf"
					className="sr-only"
					disabled={replacing}
					onChange={(event) => {
						setReplaceFile(event.target.files?.[0] ?? null);
					}}
				/>
				<div className="flex flex-wrap items-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={replacing}
						onClick={() => fileInputRef.current?.click()}
					>
						Choose PDF
					</Button>
					{replaceFile ? (
						<span className="text-muted-foreground text-sm">
							{replaceFile.name}
						</span>
					) : null}
					<LoadingButton
						type="button"
						size="sm"
						loading={replacing}
						disabled={!replaceFile}
						onClick={() => void handleReplacePdf()}
					>
						Upload replacement
					</LoadingButton>
				</div>
			</Field>

			<div className="border-border border-t pt-4">
				<Button
					type="button"
					variant="destructive"
					size="sm"
					disabled={deleteMutation.isPending}
					onClick={() => setDeleteOpen(true)}
				>
					Delete document
				</Button>
			</div>

			<DestructiveConfirmDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				title="Delete document?"
				description="The PDF will be removed from storage. This cannot be undone."
				confirmLabel="Delete"
				loading={deleteMutation.isPending}
				onConfirm={() =>
					deleteMutation.mutate({
						bookSlug: document.bookSlug,
						documentSlug: document.slug,
					})
				}
			/>
		</div>
	);
}
