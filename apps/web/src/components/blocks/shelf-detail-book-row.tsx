"use client";

import type { GetShelfBySlugOutput } from "@bbrc/api/modules/shelf/shelf.schema";
import { Button } from "@bbrc/ui/components/button";
import { Textarea } from "@bbrc/ui/components/textarea";
import { useMutation } from "@tanstack/react-query";
import { GripVertical, Pencil, Plus, X } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { BookAuthorLinks } from "@/components/blocks/book-author-links";
import { RelativeTime } from "@/components/blocks/relative-time";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { bookCoverUrl } from "@/lib/book-cover";
import { formatDateTime } from "@/lib/format-datetime";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

type ShelfDetailBookRowProps = {
	/** Username of the shelf's owner. */
	username: string;
	shelfSlug: string;
	rank?: number;
	showRank: boolean;
	/** May take the book off the shelf (owner or `remove_book`). */
	canRemove: boolean;
	/** May write the note under the book (owner or `edit_notes`). */
	canEditNotes?: boolean;
	notes?: string | null;
	addedBy?: { username: string; name: string; image: string | null } | null;
	addedAt?: Date | string | null;
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

/** Edit the shelf in the cache so changes show up before the server answers. */
function patchShelf(
	username: string,
	shelfSlug: string,
	patch: (shelf: GetShelfBySlugOutput) => GetShelfBySlugOutput,
) {
	const key = orpc.shelf.getBySlug.queryKey({
		input: { username, shelfSlug },
	});
	const previous = queryClient.getQueryData(key);
	if (previous) {
		queryClient.setQueryData(key, patch(previous));
	}
	return { key, previous };
}

export function ShelfDetailBookRow({
	username,
	shelfSlug,
	rank,
	showRank,
	canRemove,
	canEditNotes = false,
	notes = null,
	addedBy = null,
	addedAt = null,
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
	const [confirmRemove, setConfirmRemove] = useState(false);

	const refresh = () =>
		Promise.all([
			queryClient.invalidateQueries({
				queryKey: orpc.shelf.getBySlug.key({
					input: { username, shelfSlug },
				}),
			}),
			queryClient.invalidateQueries({
				queryKey: orpc.shelf.listByUsername.key(),
			}),
			queryClient.invalidateQueries({ queryKey: orpc.shelf.listForBook.key() }),
		]);

	const notesMutation = useMutation(
		orpc.shelf.updateBookNotes.mutationOptions({
			onMutate: async (variables) => {
				await queryClient.cancelQueries({
					queryKey: orpc.shelf.getBySlug.key({
						input: { username, shelfSlug },
					}),
				});
				setEditingNote(false);
				return patchShelf(username, shelfSlug, (shelf) => ({
					...shelf,
					books: shelf.books.map((row) =>
						row.book.slug === variables.bookSlug
							? { ...row, notes: variables.notes?.trim() || null }
							: row,
					),
				}));
			},
			onError: (error, _variables, context) => {
				if (context?.previous) {
					queryClient.setQueryData(context.key, context.previous);
				}
				setNoteDraft(notes ?? "");
				toast.error(error.message ?? "Could not save the note.");
			},
			onSettled: () => void refresh(),
		}),
	);

	const removeMutation = useMutation(
		orpc.shelf.removeBook.mutationOptions({
			onMutate: async (variables) => {
				await queryClient.cancelQueries({
					queryKey: orpc.shelf.getBySlug.key({
						input: { username, shelfSlug },
					}),
				});
				setConfirmRemove(false);
				return patchShelf(username, shelfSlug, (shelf) => ({
					...shelf,
					bookCount: Math.max(0, shelf.bookCount - 1),
					books: shelf.books
						.filter((row) => row.book.slug !== variables.bookSlug)
						.map((row, index) => ({ ...row, position: index })),
				}));
			},
			onSuccess: () => toast.success("Removed from shelf."),
			onError: (error, _variables, context) => {
				if (context?.previous) {
					queryClient.setQueryData(context.key, context.previous);
				}
				toast.error(error.message ?? "Could not remove book.");
			},
			onSettled: () => void refresh(),
		}),
	);

	const showFooter = !sortable && addedBy != null;
	const showNote = !sortable && (editingNote || notes || canEditNotes);

	return (
		<div
			className={cn(
				"group flex gap-3 p-3 transition-colors hover:bg-muted/30 sm:gap-4 sm:p-4",
				bordered && "border border-border",
			)}
		>
			{sortable ? (
				<button
					type="button"
					className="-ml-1 flex size-10 shrink-0 touch-none items-center justify-center self-center text-muted-foreground hover:text-foreground"
					aria-label="Drag to reorder"
					{...dragHandleProps}
				>
					<GripVertical className="size-5" />
				</button>
			) : null}

			{showRank && rank != null ? (
				<span
					className="w-8 shrink-0 pt-1 text-center font-heading font-semibold text-2xl text-muted-foreground/60 tabular-nums leading-none"
					aria-hidden
				>
					{rank}
				</span>
			) : null}

			<Link href={href} className="shrink-0 self-start" tabIndex={-1}>
				<span className="relative block aspect-2/3 w-14 overflow-hidden bg-muted ring-1 ring-foreground/10 sm:w-16">
					{coverSrc ? (
						<Image
							src={coverSrc}
							alt=""
							fill
							className="object-cover"
							sizes="64px"
						/>
					) : null}
				</span>
			</Link>

			<div className="flex min-w-0 flex-1 flex-col gap-2.5">
				<div className="flex items-start gap-2">
					<div className="min-w-0 flex-1">
						<Link
							href={href}
							className="block font-medium leading-snug underline-offset-4 hover:underline"
						>
							{book.title}
						</Link>
						<p className="text-muted-foreground text-sm">
							<BookAuthorLinks authors={book.authors} />
						</p>
					</div>
					{actions}
					{!sortable ? (
						<span className="flex shrink-0 items-center">
							{canEditNotes && !editingNote ? (
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									className="text-muted-foreground"
									aria-label={
										notes
											? `Edit the note on ${book.title}`
											: `Add a note to ${book.title}`
									}
									onClick={() => {
										setNoteDraft(notes ?? "");
										setEditingNote(true);
									}}
								>
									{notes ? (
										<Pencil className="size-4" />
									) : (
										<Plus className="size-4" />
									)}
								</Button>
							) : null}
							{canRemove ? (
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									className="text-muted-foreground hover:text-destructive"
									aria-label={`Remove ${book.title} from shelf`}
									onClick={() => setConfirmRemove(true)}
								>
									<X className="size-4" />
								</Button>
							) : null}
						</span>
					) : null}
				</div>

				{showNote ? (
					editingNote ? (
						<div className="flex flex-col gap-2">
							<Textarea
								autoFocus
								value={noteDraft}
								onChange={(event) => setNoteDraft(event.target.value)}
								maxLength={500}
								rows={3}
								aria-label={`Note on ${book.title}`}
								placeholder="Why is this book here? What should people know before reading it?"
								className="min-h-20 resize-y"
							/>
							<div className="flex items-center gap-2">
								<Button
									type="button"
									size="sm"
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
								</Button>
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
					) : notes ? (
						<blockquote className="whitespace-pre-line border-foreground/25 border-s-2 ps-3 text-sm leading-relaxed">
							{notes}
						</blockquote>
					) : null
				) : null}

				{showFooter && addedBy ? (
					<p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-muted-foreground text-xs">
						<UserAvatar user={addedBy} className="size-4" />
						<span>
							Added by{" "}
							<Link
								href={`/users/${addedBy.username}` as Route}
								className="font-medium text-foreground underline-offset-4 hover:underline"
							>
								{addedBy.name}
							</Link>
						</span>
						{addedAt ? (
							<>
								<span aria-hidden>·</span>
								<span title={formatDateTime(addedAt)}>
									<RelativeTime
										date={addedAt}
										className="text-muted-foreground text-xs"
									/>
								</span>
							</>
						) : null}
					</p>
				) : null}
			</div>

			<DestructiveConfirmDialog
				open={confirmRemove}
				onOpenChange={setConfirmRemove}
				title="Remove this book?"
				description={
					<>
						<strong className="font-medium text-foreground">
							{book.title}
						</strong>{" "}
						will come off this shelf
						{notes ? ", and its note goes with it" : ""}. You can add it again
						later.
					</>
				}
				confirmLabel="Remove book"
				onConfirm={() =>
					removeMutation.mutate({
						ownerUsername: username,
						shelfSlug,
						bookSlug: book.slug,
					})
				}
			/>
		</div>
	);
}
