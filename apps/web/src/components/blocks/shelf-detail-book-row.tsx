"use client";

import { Button } from "@bbrc/ui/components/button";
import { useMutation } from "@tanstack/react-query";
import { GripVertical, X } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { orpc, queryClient } from "@/utils/orpc";

type ShelfDetailBookRowProps = {
	username: string;
	shelfSlug: string;
	rank?: number;
	showRank: boolean;
	isOwner: boolean;
	book: {
		slug: string;
		title: string;
		authors: string[];
		coverId: number | null;
	};
	/** When true, row is a drag handle target (reorder page). */
	sortable?: boolean;
	dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
};

export function ShelfDetailBookRow({
	username,
	shelfSlug,
	rank,
	showRank,
	isOwner,
	book,
	sortable = false,
	dragHandleProps,
}: ShelfDetailBookRowProps) {
	const href = `/books/${book.slug}` as Route;
	const coverSrc = bookCoverUrl(book.coverId);

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

	return (
		<div className="flex items-center gap-2 border border-border p-3 sm:gap-4">
			{sortable ? (
				<button
					type="button"
					className="touch-none text-muted-foreground hover:text-foreground"
					aria-label="Drag to reorder"
					{...dragHandleProps}
				>
					<GripVertical className="size-5" />
				</button>
			) : null}
			{showRank && rank != null ? (
				<span className="w-8 shrink-0 text-center font-medium text-muted-foreground tabular-nums">
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
			{isOwner && !sortable ? (
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					className="shrink-0 text-muted-foreground hover:text-destructive"
					aria-label={`Remove ${book.title} from shelf`}
					disabled={removeMutation.isPending}
					onClick={() => {
						removeMutation.mutate({ shelfSlug, bookSlug: book.slug });
					}}
				>
					<X className="size-4" />
				</Button>
			) : null}
		</div>
	);
}
