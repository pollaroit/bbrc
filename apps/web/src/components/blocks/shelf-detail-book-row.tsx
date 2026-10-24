"use client";

import { Button } from "@bbrc/ui/components/button";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { Textarea } from "@bbrc/ui/components/textarea";
import { useMutation } from "@tanstack/react-query";
import { GripVertical, Pencil, StickyNote, X } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

type ShelfDetailBookRowProps = {
	username: string;
	shelfSlug: string;
	rank?: number;
	showRank: boolean;
	/** May take the book off the shelf (owner or `remove_book`). */
	canRemove: boolean;
	/** May write the note under the book (owner or `edit_notes`). */
	canEditNotes?: boolean;
	notes?: string | null;
	/** Who put the book on the shelf; shown when more than one person edits it. */
	addedBy?: { username: string; name: string; image: string | null } | null;
	showAddedBy?: boolean;
	book: {
		slug: string;
		title: string;
		authors: string[];
		coverId: number | null;
	};
	/** Draw the row's own border (off when the parent list provides dividers). */
	bordered?: boolean;
	/** When true, row is a drag handle target (reorder page). */
	sortable?: boolean;
	dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
	/** Extra controls shown at the end of the row (e.g. move up/down). */
	actions?: React.ReactNode;
};

export function ShelfDetailBookRow({
	username,
	shelfSlug,
	rank,
	showRank,
	canRemove,
	canEditNotes = false,
	notes = null,
	addedBy = null,
	showAddedBy = false,
	book,
	bordered = true,
	sortable = false,
	dragHandleProps,
	actions,
}: ShelfDetailBookRowProps) {
	const href = `/books/${book.slug}` as Route;
	const coverSrc = bookCoverUrl(book.coverId);

	const [editingNote, setEditingNote] = useState(false);
	const [noteDraft, setNoteDraft] = useState(notes ?? "");

	const notesMutation = useMutation(
		orpc.shelf.updateBookNotes.mutationOptions({
			onSuccess: async () => {
				setEditingNote(false);
				await queryClient.invalidateQueries({
					queryKey: orpc.shelf.getBySlug.key({
						input: { username, shelfSlug },
					}),
				});
			},
			onError: (error) => {
				toast.error(error.message ?? "Could not save the note.");
			},
		}),
	);

	const removeMutation = useMutation(
		orpc.shelf.removeBook.mutationOptions({
			onSuccess: async () => {
				toast.success("Removed from shelf.");
				await queryClient.invalidateQueries({
					queryKey: orpc.shelf.getBySlug.key({
						input: { username, shelfSlug },
					}),
				});
				await queryClient.invalidateQueries({
					queryKey: orpc.shelf.listByUsername.key(),
				});
				await queryClient.invalidateQueries({
					queryKey: orpc.shelf.listForBook.key(),
				});
			},
			onError: (error) => {
				toast.error(error.message ?? "Could not remove book.");
			},
		}),
	);

	const showNoteArea = !sortable && (notes || canEditNotes);
	const showMeta = !sortable && showAddedBy && addedBy;

	return (
		<div
			className={cn(
				"flex flex-col transition-colors hover:bg-muted/40",
				bordered && "border border-border",
			)}
		>
			<div className="flex items-center gap-2 p-3 sm:gap-4">
				{sortable ? (
					<button
						type="button"
						className="-ml-1 flex size-10 shrink-0 touch-none items-center justify-center text-muted-foreground hover:text-foreground"
						aria-label="Drag to reorder"
						{...dragHandleProps}
					>
						<GripVertical className="size-5" />
					</button>
				) : null}
				{showRank && rank != null ? (
					<span className="w-7 shrink-0 text-center font-semibold text-lg text-muted-foreground tabular-nums">
						{rank}
					</span>
				) : null}
				<Link
					href={href}
					className="flex min-w-0 flex-1 items-center gap-4 transition-opacity hover:opacity-90"
				>
					<div className="relative aspect-2/3 w-12 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
						{coverSrc ? (
							<Image
								src={coverSrc}
								alt=""
								fill
								className="object-cover"
								sizes="48px"
							/>
						) : null}
					</div>
					<div className="min-w-0 flex-1">
						<p className="font-medium leading-snug">{book.title}</p>
						<p className="text-muted-foreground text-sm">
							{formatBookAuthors(book.authors)}
						</p>
					</div>
				</Link>
				{actions}
				{canRemove && !sortable ? (
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						className="shrink-0 text-muted-foreground hover:text-destructive"
						aria-label={`Remove ${book.title} from shelf`}
						disabled={removeMutation.isPending}
						onClick={() => {
							removeMutation.mutate({
								ownerUsername: username,
								shelfSlug,
								bookSlug: book.slug,
							});
						}}
					>
						<X className="size-4" />
					</Button>
				) : null}
			</div>
			{showMeta || showNoteArea ? (
				<div className="flex flex-col gap-2 px-3 pb-3">
					{editingNote ? (
						<div className="flex flex-col gap-2">
							<Textarea
								value={noteDraft}
								onChange={(event) => setNoteDraft(event.target.value)}
								maxLength={500}
								rows={3}
								aria-label={`Note on ${book.title}`}
								placeholder="Why is this book here?"
								className="min-h-16 resize-y"
							/>
							<div className="flex items-center gap-2">
								<LoadingButton
									type="button"
									size="sm"
									loading={notesMutation.isPending}
									onClick={() =>
										notesMutation.mutate({
											ownerUsername: username,
											shelfSlug,
											bookSlug: book.slug,
											notes: noteDraft.trim() || null,
										})
									}
								>
									Save note
								</LoadingButton>
								<Button
									type="button"
									size="sm"
									variant="ghost"
									onClick={() => {
										setEditingNote(false);
										setNoteDraft(notes ?? "");
									}}
								>
									Cancel
								</Button>
								<span className="ms-auto text-muted-foreground text-xs tabular-nums">
									{noteDraft.length}/500
								</span>
							</div>
						</div>
					) : (
						<>
							{notes ? (
								<p className="flex items-start gap-1.5 text-sm leading-relaxed">
									<StickyNote
										className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
										aria-hidden
									/>
									<span className="whitespace-pre-line">{notes}</span>
								</p>
							) : null}
							<div className="flex flex-wrap items-center gap-x-4 gap-y-1">
								{showMeta && addedBy ? (
									<span className="flex items-center gap-1.5 text-muted-foreground text-xs">
										<UserAvatar user={addedBy} className="size-4" />
										Added by {addedBy.name}
									</span>
								) : null}
								{canEditNotes ? (
									<button
										type="button"
										onClick={() => {
											setNoteDraft(notes ?? "");
											setEditingNote(true);
										}}
										className="flex items-center gap-1 text-muted-foreground text-xs underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
									>
										<Pencil className="size-3" aria-hidden />
										{notes ? "Edit note" : "Add a note"}
									</button>
								) : null}
							</div>
						</>
					)}
				</div>
			) : null}
		</div>
	);
}
