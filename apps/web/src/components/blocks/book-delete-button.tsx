"use client";

import { canManageBooks } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { authClient } from "@/lib/auth-client";
import { useDeleteBook } from "@/lib/books/use-delete-book";
import { cn } from "@/lib/utils";

type BookDeleteButtonProps = {
	slug: string;
	title: string;
	className?: string;
};

export function BookDeleteButton({
	slug,
	title,
	className,
}: BookDeleteButtonProps) {
	const { data: session, isPending } = authClient.useSession();
	const [open, setOpen] = useState(false);
	const deleteMutation = useDeleteBook(() => setOpen(false));

	if (isPending || !canManageBooks(session?.user)) {
		return null;
	}

	return (
		<>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				className={cn(
					"shrink-0 text-muted-foreground hover:text-destructive",
					className,
				)}
				aria-label="Delete book"
				onClick={() => setOpen(true)}
			>
				<Trash2 className="size-4" />
			</Button>

			<DestructiveConfirmDialog
				open={open}
				onOpenChange={setOpen}
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
