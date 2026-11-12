"use client";

import { useMutation } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { orpc, queryClient } from "@/utils/orpc";

/** Remove a book from the library (admins), then leave its page for the library list. */
export function useDeleteBook(onDone?: () => void) {
	const router = useRouter();

	return useMutation(
		orpc.book.removeBook.mutationOptions({
			onSuccess: async () => {
				toast.success("Book removed from the library.");
				onDone?.();
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
}
