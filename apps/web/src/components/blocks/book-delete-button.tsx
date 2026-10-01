"use client";

import { Button } from "@bbrc/ui/components/button";
import { useMutation } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

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
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();
	const [open, setOpen] = useState(false);

	const deleteMutation = useMutation(
		orpc.book.removeBook.mutationOptions({
			onSuccess: async () => {
				toast.success("Book removed from the library.");
				setOpen(false);
				await queryClient.invalidateQueries({
					queryKey: orpc.book.getBookList.key(),
				});
				router.push("/books" as Route);
				router.refresh();
			},
			onError: (error) => {
				toast.error(error.message ?? "Could not delete this book.");
			},
		}),
	);

	if (isPending || !session?.user.isAdmin) {
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
