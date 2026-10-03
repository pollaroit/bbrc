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
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

type BookAddToShelfDialogProps = {
	bookSlug: string;
	username: string;
};

export function BookAddToShelfDialog({
	bookSlug,
	username,
}: BookAddToShelfDialogProps) {
	const [open, setOpen] = useState(false);
	const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

	const shelvesQuery = useQuery({
		...orpc.shelf.listMineEditable.queryOptions({
			input: { bookSlug },
		}),
		enabled: open,
	});

	const addMutation = useMutation(
		orpc.shelf.addBook.mutationOptions({
			onSuccess: async () => {
				toast.success("Added to shelf.");
				setOpen(false);
				setSelectedSlug(null);
				await queryClient.invalidateQueries({
					queryKey: orpc.shelf.listForBook.key(),
				});
				await queryClient.invalidateQueries({
					queryKey: orpc.shelf.listMineEditable.key(),
				});
				await queryClient.invalidateQueries({
					queryKey: orpc.shelf.getBySlug.key(),
				});
			},
			onError: (error) => {
				toast.error(error.message ?? "Could not add book.");
			},
		}),
	);

	const items = shelvesQuery.data?.items ?? [];
	const max = shelvesQuery.data?.maxBooksPerShelf ?? 50;

	const newShelfHref =
		`/users/${username}/shelves/new?addBookSlug=${encodeURIComponent(bookSlug)}&returnTo=${encodeURIComponent(`/books/${bookSlug}`)}` as Route;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => setOpen(true)}
			>
				Add to shelf
			</Button>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Add to shelf</DialogTitle>
					<DialogDescription>
						Pick a draft or active shelf. Each shelf holds up to {max} books.
					</DialogDescription>
				</DialogHeader>

				{shelvesQuery.isPending ? (
					<p className="text-muted-foreground text-sm">Loading shelves…</p>
				) : items.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						You do not have any shelves yet.
					</p>
				) : (
					<ul className="max-h-64 space-y-2 overflow-y-auto py-1">
						{items.map((shelf) => {
							const atCap = shelf.bookCount >= max;
							const onShelf = shelf.containsBook;
							const disabled = atCap || onShelf;
							const selected = selectedSlug === shelf.slug;

							return (
								<li key={shelf.slug}>
									<button
										type="button"
										disabled={disabled}
										onClick={() => setSelectedSlug(shelf.slug)}
										className={cn(
											"w-full border border-border p-3 text-left transition-colors",
											selected && "border-foreground ring-1 ring-foreground",
											disabled && "cursor-not-allowed opacity-50",
											!disabled && !selected && "hover:bg-muted/40",
										)}
									>
										<p className="font-medium leading-snug">{shelf.title}</p>
										<p className="text-muted-foreground text-xs">
											{shelf.bookCount}/{max} books
											{shelf.status === "draft" ? ", draft" : ""}
											{onShelf ? ", already on shelf" : ""}
											{atCap && !onShelf ? ", full" : ""}
										</p>
									</button>
								</li>
							);
						})}
					</ul>
				)}

				<DialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch">
					<LoadingButton
						type="button"
						disabled={!selectedSlug}
						loading={addMutation.isPending}
						onClick={() => {
							if (!selectedSlug) return;
							addMutation.mutate({ shelfSlug: selectedSlug, bookSlug });
						}}
					>
						Add book
					</LoadingButton>
					<Button
						type="button"
						variant="ghost"
						render={<Link href={newShelfHref} />}
						nativeButton={false}
						onClick={() => setOpen(false)}
					>
						Create new shelf
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
