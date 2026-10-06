"use client";

import type { ListAdminBooksOutput } from "@bbrc/api/modules/admin/admin-book.schema";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@bbrc/ui/components/alert-dialog";
import { Button } from "@bbrc/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { orpc, queryClient } from "@/utils/orpc";

type BookRow = ListAdminBooksOutput["items"][number];

type AdminBookRowActionsProps = {
	book: BookRow;
};

export function AdminBookRowActions({ book }: AdminBookRowActionsProps) {
	const [removeOpen, setRemoveOpen] = useState(false);
	const canRemove = book.status === "wishlist";

	const removeMutation = useMutation(
		orpc.book.removeBook.mutationOptions({
			onSuccess: async () => {
				toast.success("Book removed from the catalog.");
				setRemoveOpen(false);
				await queryClient.invalidateQueries({
					queryKey: orpc.admin.listBooks.key(),
				});
				await queryClient.invalidateQueries({
					queryKey: orpc.admin.getBookOverview.key(),
				});
				await queryClient.invalidateQueries({
					queryKey: orpc.admin.getBookStats.key(),
				});
				await queryClient.invalidateQueries({
					queryKey: orpc.book.getBookList.key(),
				});
			},
			onError: (error) => {
				toast.error(error.message);
			},
		}),
	);

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button variant="ghost" size="icon-sm" aria-label="Book actions" />
					}
				>
					<MoreHorizontal />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem
						render={<Link href={`/books/${book.slug}` as Route} />}
					>
						View
					</DropdownMenuItem>
					<DropdownMenuItem
						render={<Link href={`/books/${book.slug}/edit` as Route} />}
					>
						Edit
					</DropdownMenuItem>
					{book.latestSittingSlug ? (
						<DropdownMenuItem
							render={
								<Link href={`/sittings/${book.latestSittingSlug}` as Route} />
							}
						>
							Open sitting
						</DropdownMenuItem>
					) : null}
					<DropdownMenuSeparator />
					<DropdownMenuItem
						disabled={!canRemove}
						onClick={() => {
							if (canRemove) {
								setRemoveOpen(true);
							}
						}}
					>
						Remove
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove this book?</AlertDialogTitle>
						<AlertDialogDescription>
							“{book.title}” will be permanently deleted from the catalog. This
							cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<LoadingButton
							variant="destructive"
							loading={removeMutation.isPending}
							onClick={() => {
								removeMutation.mutate(book.slug);
							}}
						>
							Remove
						</LoadingButton>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
