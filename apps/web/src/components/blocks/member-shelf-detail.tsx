"use client";

import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import { Input } from "@bbrc/ui/components/input";
import { Label } from "@bbrc/ui/components/label";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ResourceShareMenu } from "@/components/blocks/resource-share-menu";
import { ShelfAddBookSearch } from "@/components/blocks/shelf-add-book-search";
import {
	resolveShelfCoverIds,
	ShelfCover,
} from "@/components/blocks/shelf-cover";
import { ShelfDetailBookRow } from "@/components/blocks/shelf-detail-book-row";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { orpc, queryClient } from "@/utils/orpc";

type MemberShelfDetailProps = {
	username: string;
	shelfSlug: string;
};

export function MemberShelfDetail({
	username,
	shelfSlug,
}: MemberShelfDetailProps) {
	const router = useRouter();
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [confirmTitle, setConfirmTitle] = useState("");

	const shelfQuery = useQuery(
		orpc.shelf.getBySlug.queryOptions({
			input: { username, shelfSlug },
		}),
	);

	const deleteMutation = useMutation(
		orpc.shelf.delete.mutationOptions({
			onSuccess: async () => {
				toast.success("Shelf deleted.");
				setDeleteOpen(false);
				await queryClient.invalidateQueries({
					queryKey: orpc.shelf.listByUsername.key(),
				});
				router.push(`/users/${username}/shelves` as Route);
				router.refresh();
			},
			onError: (error) => {
				toast.error(error.message ?? "Could not delete shelf.");
			},
		}),
	);

	const shelfBooks = shelfQuery.data?.books;
	const onShelfSlugs = useMemo(
		() => new Set(shelfBooks?.map((row) => row.book.slug) ?? []),
		[shelfBooks],
	);

	if (shelfQuery.isPending) {
		return (
			<div className="flex flex-col gap-6">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-24 w-full" />
			</div>
		);
	}

	if (shelfQuery.isError || !shelfQuery.data) {
		return (
			<p className="text-destructive text-sm" role="alert">
				{shelfQuery.error?.message ?? "Shelf not found."}
			</p>
		);
	}

	const shelf = shelfQuery.data;
	const needsTitleConfirm = shelf.bookCount > 0;
	const coverIds = resolveShelfCoverIds(
		shelf.coverPreviewCoverIds,
		shelf.books,
	);

	return (
		<div className="flex flex-col gap-8">
			<Link
				href={`/users/${username}/shelves` as Route}
				className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
			>
				<ArrowLeft className="size-4" />
				All shelves
			</Link>

			{shelf.isOwner && shelf.status !== "active" ? (
				<p className="border border-border bg-muted/30 px-4 py-3 text-sm">
					Only you can see this shelf while it is {shelf.status}.
				</p>
			) : null}

			<header className="flex flex-col gap-4 border-border border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex gap-4">
					<div className="shrink-0 self-start">
						<ShelfCover
							coverIds={coverIds}
							coverImageUrl={shelf.coverImageUrl}
							size="lg"
						/>
					</div>
					<div className="min-w-0 space-y-2">
						<div className="flex flex-wrap items-center gap-2">
							<h1 className="font-bold text-2xl tracking-tight">
								{shelf.title}
							</h1>
							{shelf.type === "ordered" ? (
								<Badge variant="secondary">Ranked</Badge>
							) : (
								<Badge variant="outline">List</Badge>
							)}
						</div>
						{shelf.description ? (
							<p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
								{shelf.description}
							</p>
						) : null}
						<p className="text-muted-foreground text-xs tabular-nums">
							{shelf.bookCount} {shelf.bookCount === 1 ? "book" : "books"}
						</p>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					{shelf.status === "active" ? (
						<ResourceShareMenu
							path={`/users/${username}/shelves/${shelfSlug}`}
							shareText={shelf.title}
							label="Share shelf"
							shareInPost={{
								kind: "shelf",
								ownerUsername: username,
								slug: shelfSlug,
							}}
							size="md"
						/>
					) : null}
					{shelf.isOwner ? (
						<>
							<Button
								variant="outline"
								size="sm"
								render={
									<Link
										href={
											`/users/${username}/shelves/${shelfSlug}/edit` as Route
										}
									/>
								}
								nativeButton={false}
							>
								<Pencil className="size-4" />
								Edit
							</Button>
							<Button
								variant="outline"
								size="sm"
								render={
									<Link
										href={
											`/users/${username}/shelves/${shelfSlug}/edit/order` as Route
										}
									/>
								}
								nativeButton={false}
							>
								Reorder
							</Button>
							<Button
								variant="ghost"
								size="sm"
								className="text-destructive hover:text-destructive"
								onClick={() => setDeleteOpen(true)}
							>
								<Trash2 className="size-4" />
								Delete
							</Button>
						</>
					) : null}
				</div>
			</header>

			{shelf.isOwner ? (
				<ShelfAddBookSearch
					username={username}
					shelfSlug={shelfSlug}
					bookCount={shelf.bookCount}
					onShelfSlugs={onShelfSlugs}
				/>
			) : null}

			{shelf.books.length === 0 ? (
				<div className="border border-border border-dashed px-6 py-10 text-center">
					<p className="font-medium">This shelf is empty</p>
					<p className="mt-1 text-muted-foreground text-sm">
						{shelf.isOwner
							? "Use the search above to add books from the club library."
							: "No books on this list yet."}
					</p>
					{shelf.isOwner ? (
						<Button
							className="mt-4"
							render={<Link href={"/books" as Route} />}
							nativeButton={false}
							variant="outline"
						>
							Browse library
						</Button>
					) : null}
				</div>
			) : (
				<ol className="flex flex-col gap-3">
					{shelf.books.map((row, index) => (
						<li key={row.book.slug}>
							<ShelfDetailBookRow
								username={username}
								shelfSlug={shelfSlug}
								rank={index + 1}
								showRank={shelf.type === "ordered"}
								isOwner={shelf.isOwner}
								book={{
									...row.book,
									coverId: row.book.coverId ?? null,
								}}
							/>
						</li>
					))}
				</ol>
			)}

			<DestructiveConfirmDialog
				open={deleteOpen}
				onOpenChange={(open) => {
					setDeleteOpen(open);
					if (!open) setConfirmTitle("");
				}}
				title="Delete shelf?"
				description={
					needsTitleConfirm ? (
						<>
							This removes{" "}
							<strong className="font-medium text-foreground">
								{shelf.title}
							</strong>{" "}
							and all {shelf.bookCount} books on it. Type the shelf title to
							confirm.
						</>
					) : (
						<>
							Delete{" "}
							<strong className="font-medium text-foreground">
								{shelf.title}
							</strong>
							? This cannot be undone.
						</>
					)
				}
				confirmLabel="Delete shelf"
				loading={deleteMutation.isPending}
				onConfirm={() => {
					if (needsTitleConfirm && confirmTitle.trim() !== shelf.title) {
						toast.error("Type the shelf title exactly to confirm.");
						return;
					}
					deleteMutation.mutate({
						shelfSlug,
						confirmTitle: needsTitleConfirm ? confirmTitle : undefined,
					});
				}}
			>
				{needsTitleConfirm ? (
					<div className="grid gap-2 py-2">
						<Label htmlFor="confirm-shelf-title">Shelf title</Label>
						<Input
							id="confirm-shelf-title"
							value={confirmTitle}
							onChange={(e) => setConfirmTitle(e.target.value)}
							autoComplete="off"
						/>
					</div>
				) : null}
			</DestructiveConfirmDialog>
		</div>
	);
}
