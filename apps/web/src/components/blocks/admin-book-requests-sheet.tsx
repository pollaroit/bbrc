"use client";

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
import { Sheet, SheetContent } from "@bbrc/ui/components/sheet";
import { Textarea } from "@bbrc/ui/components/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BookMarked } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { OpenLibraryWorkTitleLink } from "@/components/blocks/open-library-work-title-link";
import { RelativeTime } from "@/components/blocks/relative-time";
import {
	ListingSideSheetBody,
	ListingSideSheetHeader,
	listingSideSheetContentClassName,
} from "@/components/listing/listing-side-sheet";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

type AdminBookRequestsSheetProps = {
	size?: "sm" | "default";
	triggerVariant?: "outline" | "ghost";
};

type PendingRequestItem = {
	id: string;
	olid: string;
	title: string;
	createdAt: Date;
	requester: { username: string; name: string | null };
};

function AdminBookRequestRow({
	item,
	onRejected,
	onNavigateAdd,
}: {
	item: PendingRequestItem;
	onRejected: () => void;
	onNavigateAdd: () => void;
}) {
	const [rejectOpen, setRejectOpen] = useState(false);
	const [rejectionReason, setRejectionReason] = useState("");

	const rejectMutation = useMutation(
		orpc.bookRequest.reject.mutationOptions({
			onSuccess: async () => {
				toast.success("Request rejected.");
				setRejectOpen(false);
				setRejectionReason("");
				onRejected();
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: orpc.bookRequest.listPending.key(),
					}),
					queryClient.invalidateQueries({
						queryKey: orpc.bookRequest.listMine.key(),
					}),
				]);
			},
			onError: (error) => {
				toast.error(error.message ?? "Could not reject this request.");
			},
		}),
	);

	const requesterName = item.requester.name?.trim() || item.requester.username;

	return (
		<li className="flex flex-col gap-3 border border-border bg-muted/10 p-4">
			<div className="space-y-0.5">
				<OpenLibraryWorkTitleLink olid={item.olid} title={item.title} />
				<p className="text-muted-foreground text-xs">
					Requested by{" "}
					<Link
						href={`/users/${item.requester.username}` as Route}
						className="text-foreground underline-offset-2 hover:underline"
					>
						{requesterName}
					</Link>{" "}
					· <RelativeTime date={item.createdAt} />
				</p>
				<p className="font-mono text-muted-foreground text-xs">{item.olid}</p>
			</div>
			<div className="flex flex-wrap gap-2">
				<Button
					render={
						<Link
							href={`/books/new?olid=${encodeURIComponent(item.olid)}` as Route}
						/>
					}
					nativeButton={false}
					size="sm"
					className="w-fit"
					onClick={onNavigateAdd}
				>
					Add to library
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
			</div>

			<Dialog
				open={rejectOpen}
				onOpenChange={(next) => {
					setRejectOpen(next);
					if (!next) {
						setRejectionReason("");
					}
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Reject request</DialogTitle>
						<DialogDescription>
							{requesterName} will see your reason on their request list. This
							does not block the title from being added later.
						</DialogDescription>
					</DialogHeader>
					<Field>
						<FieldLabel htmlFor={`reject-reason-${item.id}`}>
							Rejection reason
						</FieldLabel>
						<Textarea
							id={`reject-reason-${item.id}`}
							value={rejectionReason}
							maxLength={200}
							rows={4}
							placeholder="Explain why this title will not be added right now…"
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
							disabled={rejectMutation.isPending}
							onClick={() => setRejectOpen(false)}
						>
							Cancel
						</Button>
						<LoadingButton
							type="button"
							variant="destructive"
							loading={rejectMutation.isPending}
							loadingText="Rejecting…"
							disabled={rejectionReason.trim().length === 0}
							onClick={() => {
								rejectMutation.mutate({
									id: item.id,
									rejectionReason: rejectionReason.trim(),
								});
							}}
						>
							Reject request
						</LoadingButton>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</li>
	);
}

export function AdminBookRequestsSheet({
	size = "sm",
	triggerVariant = "outline",
}: AdminBookRequestsSheetProps) {
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();
	const [open, setOpen] = useState(false);

	const isAdmin = session?.user.isAdmin === true;

	const { data, isPending: isListPending } = useQuery({
		...orpc.bookRequest.listPending.queryOptions(),
		enabled: isAdmin,
		staleTime: 30_000,
	});

	if (isSessionPending || !isAdmin) {
		return null;
	}

	const count = data?.count ?? 0;
	const label = count > 0 ? `Requested (${count})` : "Requested";
	const isLoading = isListPending && data == null;

	return (
		<>
			<Button
				type="button"
				variant={triggerVariant}
				size={size}
				disabled={isLoading || count === 0}
				onClick={() => setOpen(true)}
			>
				<BookMarked data-icon="inline-start" />
				{label}
			</Button>

			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent side="right" className={listingSideSheetContentClassName}>
					<ListingSideSheetHeader
						title="Requested books"
						description="Add a title to the library or reject it with a note for the requester."
					/>
					<ListingSideSheetBody>
						{count === 0 ? (
							<p className="text-muted-foreground text-sm">
								No pending requests right now.
							</p>
						) : (
							<ul className="flex flex-col gap-3">
								{data?.items.map((item) => (
									<AdminBookRequestRow
										key={item.id}
										item={item}
										onRejected={() => {
											if (count <= 1) {
												setOpen(false);
											}
										}}
										onNavigateAdd={() => setOpen(false)}
									/>
								))}
							</ul>
						)}
					</ListingSideSheetBody>
				</SheetContent>
			</Sheet>
		</>
	);
}
