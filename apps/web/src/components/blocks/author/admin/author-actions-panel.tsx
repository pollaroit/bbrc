"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation } from "@tanstack/react-query";
import { BadgeCheck, GitMerge, RefreshCw, Trash2 } from "lucide-react";
import type { Route } from "next";
import { useState } from "react";
import { toast } from "sonner";
import {
	AuthorPicker,
	type PickedAuthor,
} from "@/components/blocks/author/admin/author-picker";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { useRouter } from "@/i18n/navigation";
import { client, orpc, queryClient } from "@/utils/orpc";

type ActionAuthor = {
	id: string;
	slug: string;
	name: string;
	status: "verified" | "auto" | "needs_review";
	bookCount: number;
	followerCount: number;
	aliasCount: number;
};

/** Refresh the lists and pages that show authors after something changed. */
export function invalidateAuthorQueries() {
	void queryClient.invalidateQueries({ queryKey: orpc.authorAdmin.key() });
	void queryClient.invalidateQueries({ queryKey: orpc.author.key() });
	void queryClient.invalidateQueries({ queryKey: orpc.authorBackfill.key() });
}

export function MergeAuthorDialog({
	author,
	open,
	onOpenChange,
	onMerged,
}: {
	author: Pick<ActionAuthor, "id" | "name" | "bookCount"> &
		Partial<Pick<ActionAuthor, "followerCount" | "aliasCount">>;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onMerged: (into: { slug: string; name: string }) => void;
}) {
	const [target, setTarget] = useState<PickedAuthor | null>(null);

	const merge = useMutation({
		mutationFn: (intoId: string) =>
			client.authorAdmin.merge({ fromId: author.id, intoId }),
		onSuccess: (result) => {
			invalidateAuthorQueries();
			void queryClient.invalidateQueries({ queryKey: orpc.book.key() });
			toast.success(`Merged into ${result.into.name}.`);
			onOpenChange(false);
			onMerged(result.into);
		},
		onError: (error) =>
			toast.error(error.message || "Could not merge these authors."),
	});

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				onOpenChange(next);
				if (!next) setTarget(null);
			}}
		>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Merge {author.name} into another author</DialogTitle>
					<DialogDescription>
						Use this when two records are the same person.
					</DialogDescription>
				</DialogHeader>
				{target ? (
					<div className="flex flex-col gap-3 text-sm">
						<p>
							Everything moves to <strong>{target.name}</strong>:
						</p>
						<ul className="flex list-disc flex-col gap-1 ps-5 text-muted-foreground">
							<li>
								{author.bookCount} {author.bookCount === 1 ? "book" : "books"}{" "}
								(a book that already lists {target.name} keeps one entry)
							</li>
							{author.followerCount != null ? (
								<li>
									{author.followerCount}{" "}
									{author.followerCount === 1 ? "follower" : "followers"}{" "}
									(nobody ends up following twice)
								</li>
							) : (
								<li>Followers (nobody ends up following twice)</li>
							)}
							<li>
								“{author.name}”
								{author.aliasCount != null
									? ` and its ${author.aliasCount} other ${author.aliasCount === 1 ? "spelling" : "spellings"}`
									: " and its other spellings"}{" "}
								become spellings of {target.name}
							</li>
							<li>
								The old address redirects to {target.name}. Details{" "}
								{target.name} already has are kept; empty ones are filled from{" "}
								{author.name}.
							</li>
						</ul>
						<p className="text-muted-foreground">
							{author.name} is then deleted. This cannot be undone.
						</p>
					</div>
				) : (
					<AuthorPicker
						excludeId={author.id}
						autoFocus
						placeholder="Search for the author to keep…"
						onPick={setTarget}
					/>
				)}
				<DialogFooter>
					{target ? (
						<Button
							type="button"
							variant="ghost"
							onClick={() => setTarget(null)}
						>
							Choose another
						</Button>
					) : null}
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					{target ? (
						<LoadingButton
							type="button"
							variant="destructive"
							loading={merge.isPending}
							onClick={() => merge.mutate(target.id)}
						>
							<GitMerge data-icon="inline-start" />
							Merge into {target.name}
						</LoadingButton>
					) : null}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function AuthorActionsPanel({
	author,
	dirty,
}: {
	author: ActionAuthor;
	/** Unsaved edits: a refresh replaces them, so it asks first. */
	dirty: boolean;
}) {
	const router = useRouter();
	const [mergeOpen, setMergeOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [refreshOpen, setRefreshOpen] = useState(false);

	const confirm = useMutation({
		mutationFn: () => client.authorAdmin.confirm({ id: author.id }),
		onSuccess: () => {
			invalidateAuthorQueries();
			toast.success("Marked as verified.");
		},
		onError: (error) =>
			toast.error(error.message || "Could not verify this author."),
	});

	const refresh = useMutation({
		mutationFn: () => client.authorAdmin.refresh({ id: author.id }),
		onSuccess: (result) => {
			invalidateAuthorQueries();
			const count = result.changed.length;
			toast.success(
				count > 0
					? `Updated ${count} ${count === 1 ? "field" : "fields"}.`
					: "Nothing new was found.",
			);
		},
		onError: (error) =>
			toast.error(error.message || "Could not refresh from the sources."),
	});

	const remove = useMutation({
		mutationFn: () => client.authorAdmin.delete({ id: author.id }),
		onSuccess: () => {
			invalidateAuthorQueries();
			toast.success("Author deleted.");
			router.push("/admin/authors/list" as Route);
		},
		onError: (error) =>
			toast.error(error.message || "Could not delete this author."),
	});

	const canDelete = author.bookCount === 0;

	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle>Actions</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-2">
				<LoadingButton
					type="button"
					variant="outline"
					className="justify-start"
					loading={confirm.isPending}
					disabled={author.status === "verified"}
					onClick={() => confirm.mutate()}
				>
					<BadgeCheck data-icon="inline-start" />
					{author.status === "verified"
						? "Verified"
						: "Confirm details are right"}
				</LoadingButton>
				<LoadingButton
					type="button"
					variant="outline"
					className="justify-start"
					loading={refresh.isPending}
					onClick={() => (dirty ? setRefreshOpen(true) : refresh.mutate())}
				>
					<RefreshCw data-icon="inline-start" />
					Refresh from sources
				</LoadingButton>
				<Button
					type="button"
					variant="outline"
					className="justify-start"
					onClick={() => setMergeOpen(true)}
				>
					<GitMerge data-icon="inline-start" />
					Merge into another author…
				</Button>
				<Button
					type="button"
					variant="destructive"
					className="justify-start"
					disabled={!canDelete}
					onClick={() => setDeleteOpen(true)}
				>
					<Trash2 data-icon="inline-start" />
					Delete author
				</Button>
				{!canDelete ? (
					<p className="text-muted-foreground text-xs">
						{author.name} has {author.bookCount}{" "}
						{author.bookCount === 1 ? "book" : "books"}, so they can't be
						deleted. Merge them into another author or remove them from the
						books first.
					</p>
				) : null}
			</CardContent>

			<MergeAuthorDialog
				author={author}
				open={mergeOpen}
				onOpenChange={setMergeOpen}
				onMerged={(into) => router.push(`/authors/${into.slug}/edit` as Route)}
			/>
			<DestructiveConfirmDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				title={`Delete ${author.name}?`}
				description="Their details, spellings and followers are removed. This cannot be undone."
				confirmLabel="Delete author"
				loading={remove.isPending}
				onConfirm={() => remove.mutate()}
			/>
			<DestructiveConfirmDialog
				open={refreshOpen}
				onOpenChange={setRefreshOpen}
				title="Replace your unsaved edits?"
				description="Refreshing reads the sources again and fills fields that are not locked. Edits you have not saved will be replaced."
				confirmLabel="Refresh anyway"
				onConfirm={() => {
					setRefreshOpen(false);
					refresh.mutate();
				}}
			/>
		</Card>
	);
}
