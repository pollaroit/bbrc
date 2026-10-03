"use client";

import { Button } from "@bbrc/ui/components/button";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowUp } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatBookAuthors } from "@/lib/book-cover";
import { orpc, queryClient } from "@/utils/orpc";

type ShelfReorderEditorProps = {
	username: string;
	shelfSlug: string;
};

type BookRow = {
	slug: string;
	title: string;
	authors: string[];
};

export function ShelfReorderEditor({
	username,
	shelfSlug,
}: ShelfReorderEditorProps) {
	const router = useRouter();
	const shelfQuery = useQuery(
		orpc.shelf.getBySlug.queryOptions({
			input: { username, shelfSlug },
		}),
	);

	const [order, setOrder] = useState<BookRow[]>([]);

	useEffect(() => {
		if (!shelfQuery.data) return;
		setOrder(
			shelfQuery.data.books.map((row) => ({
				slug: row.book.slug,
				title: row.book.title,
				authors: row.book.authors,
			})),
		);
	}, [shelfQuery.data]);

	const reorderMutation = useMutation(
		orpc.shelf.reorderBooks.mutationOptions({
			onSuccess: async () => {
				toast.success("Order saved.");
				await queryClient.invalidateQueries({
					queryKey: orpc.shelf.getBySlug.key({
						input: { username, shelfSlug },
					}),
				});
				router.push(`/users/${username}/shelves/${shelfSlug}` as Route);
				router.refresh();
			},
			onError: (error) => {
				toast.error(error.message ?? "Could not save order.");
			},
		}),
	);

	function move(index: number, direction: -1 | 1) {
		const next = index + direction;
		if (next < 0 || next >= order.length) return;
		setOrder((current) => {
			const copy = [...current];
			const [item] = copy.splice(index, 1);
			if (!item) return current;
			copy.splice(next, 0, item);
			return copy;
		});
	}

	if (shelfQuery.isPending) {
		return <Skeleton className="h-48 w-full" />;
	}

	if (shelfQuery.isError || !shelfQuery.data?.isOwner) {
		return (
			<p className="text-destructive text-sm" role="alert">
				{shelfQuery.error?.message ?? "You cannot reorder this shelf."}
			</p>
		);
	}

	const shelf = shelfQuery.data;

	return (
		<div className="flex flex-col gap-6">
			<Link
				href={`/users/${username}/shelves/${shelfSlug}` as Route}
				className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
			>
				<ArrowLeft className="size-4" />
				Back to shelf
			</Link>

			<div className="space-y-1">
				<h1 className="font-bold text-xl tracking-tight">Reorder books</h1>
				<p className="text-muted-foreground text-sm">
					{shelf.type === "ordered"
						? "Visitors will see these ranks on the public shelf page."
						: "Order is saved but rank numbers stay hidden on the public page."}
				</p>
			</div>

			{order.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Add books before reordering.
				</p>
			) : (
				<ol className="flex flex-col gap-2">
					{order.map((book, index) => (
						<li
							key={book.slug}
							className="flex items-center gap-3 border border-border p-3"
						>
							<span className="w-8 shrink-0 text-center font-medium text-muted-foreground tabular-nums">
								{index + 1}
							</span>
							<div className="min-w-0 flex-1">
								<p className="font-medium leading-snug">{book.title}</p>
								<p className="text-muted-foreground text-sm">
									{formatBookAuthors(book.authors)}
								</p>
							</div>
							<div className="flex shrink-0 flex-col gap-1">
								<Button
									type="button"
									variant="outline"
									size="icon-sm"
									disabled={index === 0}
									aria-label="Move up"
									onClick={() => move(index, -1)}
								>
									<ArrowUp className="size-4" />
								</Button>
								<Button
									type="button"
									variant="outline"
									size="icon-sm"
									disabled={index === order.length - 1}
									aria-label="Move down"
									onClick={() => move(index, 1)}
								>
									<ArrowDown className="size-4" />
								</Button>
							</div>
						</li>
					))}
				</ol>
			)}

			<div className="flex flex-wrap gap-3">
				<LoadingButton
					type="button"
					disabled={order.length === 0}
					loading={reorderMutation.isPending}
					onClick={() => {
						reorderMutation.mutate({
							shelfSlug,
							bookSlugs: order.map((b) => b.slug),
						});
					}}
				>
					Save order
				</LoadingButton>
				<Button
					type="button"
					variant="outline"
					render={
						<Link href={`/users/${username}/shelves/${shelfSlug}` as Route} />
					}
					nativeButton={false}
				>
					Cancel
				</Button>
			</div>
		</div>
	);
}
