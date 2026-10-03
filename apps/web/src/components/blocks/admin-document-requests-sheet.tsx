"use client";

import { documentLanguageLabel } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { Field, FieldDescription, FieldLabel } from "@bbrc/ui/components/field";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@bbrc/ui/components/sheet";
import { Textarea } from "@bbrc/ui/components/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { RelativeTime } from "@/components/blocks/relative-time";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

type AdminDocumentRequestsSheetProps = {
	size?: "sm" | "default";
};

type PendingDocItem = {
	id: string;
	slug: string;
	name: string;
	language: string;
	createdAt: Date;
	bookSlug: string;
	bookTitle: string;
	submitter: { username: string; name: string | null };
};

function AdminDocumentRow({
	item,
	onDone,
}: {
	item: PendingDocItem;
	onDone: () => void;
}) {
	const [rejectOpen, setRejectOpen] = useState(false);
	const [rejectionReason, setRejectionReason] = useState("");
	const [approveOpen, setApproveOpen] = useState(false);
	const [acceptanceNotes, setAcceptanceNotes] = useState("");

	const invalidate = async () => {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: orpc.document.listPending.key(),
			}),
			queryClient.invalidateQueries({
				queryKey: orpc.document.listMine.key(),
			}),
			queryClient.invalidateQueries({
				queryKey: orpc.document.listApprovedByBook.key(),
			}),
			queryClient.invalidateQueries({
				queryKey: orpc.book.getBookList.key(),
			}),
		]);
	};

	const approveMutation = useMutation(
		orpc.document.approve.mutationOptions({
			onSuccess: async () => {
				toast.success("Document approved.");
				setApproveOpen(false);
				setAcceptanceNotes("");
				await invalidate();
				onDone();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const rejectMutation = useMutation(
		orpc.document.reject.mutationOptions({
			onSuccess: async () => {
				toast.success("Document rejected.");
				setRejectOpen(false);
				setRejectionReason("");
				await invalidate();
				onDone();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const submitterName = item.submitter.name?.trim() || item.submitter.username;

	return (
		<li className="flex flex-col gap-2 border border-border p-3">
			<div className="space-y-0.5">
				<p className="font-medium text-sm">{item.name}</p>
				<p className="text-muted-foreground text-xs">
					<Link
						href={`/books/${item.bookSlug}` as Route}
						className="text-foreground underline-offset-2 hover:underline"
					>
						{item.bookTitle}
					</Link>{" "}
					· {documentLanguageLabel(item.language)} · by{" "}
					<Link
						href={`/users/${item.submitter.username}` as Route}
						className="text-foreground underline-offset-2 hover:underline"
					>
						{submitterName}
					</Link>{" "}
					· <RelativeTime date={item.createdAt} />
				</p>
			</div>
			<div className="flex flex-wrap gap-2">
				<Button
					type="button"
					size="sm"
					className="w-fit"
					onClick={() => setApproveOpen(true)}
				>
					Approve
				</Button>
				<Button
					type="button"
					size="sm"
					variant="outline"
					className="w-fit"
					onClick={() => setRejectOpen(true)}
				>
					Reject
				</Button>
				<Button
					render={
						<Link
							href={
								`/books/${item.bookSlug}/edit/docs/${item.slug}/edit` as Route
							}
						/>
					}
					nativeButton={false}
					size="sm"
					variant="ghost"
					className="w-fit"
				>
					Review PDF
				</Button>
			</div>

			<Dialog open={approveOpen} onOpenChange={setApproveOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Approve document</DialogTitle>
						<DialogDescription>
							The PDF will appear on the book page. Optional note for the
							submitter.
						</DialogDescription>
					</DialogHeader>
					<Field>
						<FieldLabel htmlFor={`approve-notes-${item.id}`}>
							Acceptance notes (optional)
						</FieldLabel>
						<Textarea
							id={`approve-notes-${item.id}`}
							value={acceptanceNotes}
							maxLength={200}
							rows={3}
							onChange={(event) => setAcceptanceNotes(event.target.value)}
						/>
					</Field>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setApproveOpen(false)}
						>
							Cancel
						</Button>
						<LoadingButton
							type="button"
							loading={approveMutation.isPending}
							onClick={() =>
								approveMutation.mutate({
									id: item.id,
									acceptanceNotes: acceptanceNotes.trim() || undefined,
								})
							}
						>
							Approve
						</LoadingButton>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Reject document</DialogTitle>
						<DialogDescription>
							The submitter will see your reason on their document list.
						</DialogDescription>
					</DialogHeader>
					<Field>
						<FieldLabel htmlFor={`doc-reject-${item.id}`}>
							Rejection reason
						</FieldLabel>
						<Textarea
							id={`doc-reject-${item.id}`}
							value={rejectionReason}
							maxLength={200}
							rows={4}
							onChange={(event) => setRejectionReason(event.target.value)}
						/>
						<FieldDescription>
							Required · {rejectionReason.trim().length}/200
						</FieldDescription>
					</Field>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setRejectOpen(false)}
						>
							Cancel
						</Button>
						<LoadingButton
							type="button"
							variant="destructive"
							loading={rejectMutation.isPending}
							disabled={rejectionReason.trim().length === 0}
							onClick={() =>
								rejectMutation.mutate({
									id: item.id,
									rejectionReason: rejectionReason.trim(),
								})
							}
						>
							Reject
						</LoadingButton>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</li>
	);
}

export function AdminDocumentRequestsSheet({
	size = "sm",
}: AdminDocumentRequestsSheetProps) {
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();
	const [open, setOpen] = useState(false);
	const isAdmin = session?.user.isAdmin === true;

	const { data, isPending: isListPending } = useQuery({
		...orpc.document.listPending.queryOptions(),
		enabled: isAdmin,
		staleTime: 30_000,
	});

	if (isSessionPending || !isAdmin) {
		return null;
	}

	const count = data?.count ?? 0;
	const label = count > 0 ? `Documents (${count})` : "Documents";
	const isLoading = isListPending && data == null;

	return (
		<>
			<Button
				type="button"
				variant="outline"
				size={size}
				disabled={isLoading || count === 0}
				onClick={() => setOpen(true)}
			>
				<FileText data-icon="inline-start" />
				{label}
			</Button>

			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent side="right" className="flex flex-col gap-0 sm:max-w-md">
					<SheetHeader>
						<SheetTitle>Pending documents</SheetTitle>
						<SheetDescription>
							Approve PDFs for club books or reject with a reason.
						</SheetDescription>
					</SheetHeader>
					<div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
						{count === 0 ? (
							<p className="text-muted-foreground text-sm">
								No pending documents right now.
							</p>
						) : (
							<ul className="flex flex-col gap-3">
								{data?.items.map((item) => (
									<AdminDocumentRow
										key={item.id}
										item={item}
										onDone={() => {
											if (count <= 1) {
												setOpen(false);
											}
										}}
									/>
								))}
							</ul>
						)}
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}
