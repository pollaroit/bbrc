"use client";

import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import { Input } from "@bbrc/ui/components/input";
import { Label } from "@bbrc/ui/components/label";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
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
				<div className="space-y-2">
					<div className="flex flex-wrap items-center gap-2">
						<h1 className="font-bold text-2xl tracking-tight">{shelf.title}</h1>
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

				{shelf.isOwner ? (
					<div className="flex flex-wrap gap-2">
						<Button
							variant="outline"
							size="sm"
							render={
								<Link
									href={`/users/${username}/shelves/${shelfSlug}/edit` as Route}
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
					</div>
				) : null}
			</header>

			{shelf.books.length === 0 ? (
				<div className="border border-border border-dashed px-6 py-10 text-center">
					<p className="font-medium">This shelf is empty</p>
					<p className="mt-1 text-muted-foreground text-sm">
						{shelf.isOwner
							? "Add books from the library using Add to shelf on a book page."
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
					{shelf.books.map((row, index) => {
						const href = `/books/${row.book.slug}` as Route;
						const coverSrc = bookCoverUrl(row.book.coverId);
						const showRank = shelf.type === "ordered";

						return (
							<li key={row.book.slug}>
								<Link
									href={href}
									className="flex items-center gap-4 border border-border p-3 transition-colors hover:bg-muted/30"
								>
									{showRank ? (
										<span className="w-8 shrink-0 text-center font-medium text-muted-foreground tabular-nums">
											{index + 1}
										</span>
									) : null}
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
										<p className="font-medium leading-snug">{row.book.title}</p>
										<p className="text-muted-foreground text-sm">
											{formatBookAuthors(row.book.authors)}
										</p>
									</div>
								</Link>
							</li>
						);
					})}
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
