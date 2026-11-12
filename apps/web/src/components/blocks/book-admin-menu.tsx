"use client";

import { canManageBooks } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import { Eye, EyeOff, Pencil, Settings2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { authClient } from "@/lib/auth-client";
import { useBookHidden } from "@/lib/books/use-book-hidden";
import { useDeleteBook } from "@/lib/books/use-delete-book";
import { editBookPageHref } from "@/lib/edit-book-search-params";

/**
 * Admin tools for one book in a single menu: edit, hide from sittings (or offer
 * it again) and delete. Nothing renders for members who may not manage books.
 */
export function BookAdminMenu({
	slug,
	title,
	hidden,
}: {
	slug: string;
	title: string;
	hidden: boolean;
}) {
	const { data: session, isPending } = authClient.useSession();
	const { setHidden, isPending: hiding } = useBookHidden();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const deleteMutation = useDeleteBook(() => setConfirmOpen(false));

	if (isPending || !canManageBooks(session?.user)) {
		return null;
	}

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							type="button"
							variant="outline"
							className="size-9"
							aria-label="Manage this book"
						/>
					}
				>
					<Settings2 className="size-4" aria-hidden />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="min-w-56">
					<DropdownMenuItem
						render={<Link href={editBookPageHref(slug)} />}
						nativeButton={false}
					>
						<Pencil aria-hidden />
						Edit book
					</DropdownMenuItem>
					<DropdownMenuItem
						disabled={hiding}
						onClick={() => setHidden(slug, !hidden)}
					>
						{hidden ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
						{hidden ? "Offer to sittings again" : "Hide from sittings"}
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						variant="destructive"
						onClick={() => setConfirmOpen(true)}
					>
						<Trash2 aria-hidden />
						Delete book
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<DestructiveConfirmDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				title="Delete book?"
				description={
					<>
						<strong className="font-medium text-foreground">{title}</strong>{" "}
						will be permanently removed from the library, including reviews and
						poll options. Posts that attached this book will keep the text but
						lose the link. This cannot be undone.
					</>
				}
				confirmLabel="Delete book"
				loading={deleteMutation.isPending}
				onConfirm={() => deleteMutation.mutate(slug)}
			/>
		</>
	);
}
