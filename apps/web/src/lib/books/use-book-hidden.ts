"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { orpc, queryClient } from "@/utils/orpc";

/** Everything that shows a book's hidden state, so it never lags behind a change. */
async function refreshBookQueries() {
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: orpc.book.getBookBySlug.key() }),
		queryClient.invalidateQueries({ queryKey: orpc.book.getBookList.key() }),
		queryClient.invalidateQueries({ queryKey: orpc.admin.listBooks.key() }),
		queryClient.invalidateQueries({
			queryKey: orpc.admin.getBookOverview.key(),
		}),
		queryClient.invalidateQueries({ queryKey: orpc.admin.getBookStats.key() }),
	]);
}

/**
 * Hide a book from sittings or offer it to them again (admins). The server refuses to
 * hide a book a sitting has claimed and says why; that message is shown as is.
 */
export function useBookHidden() {
	const router = useRouter();

	const onSettled = async () => {
		await refreshBookQueries();
		router.refresh();
	};

	const hide = useMutation(
		orpc.book.hideBook.mutationOptions({
			onSuccess: () => toast.success("Hidden from sittings."),
			onError: (error) => toast.error(error.message),
			onSettled,
		}),
	);
	const unhide = useMutation(
		orpc.book.unhideBook.mutationOptions({
			onSuccess: () => toast.success("Offered to sittings again."),
			onError: (error) => toast.error(error.message),
			onSettled,
		}),
	);

	return {
		isPending: hide.isPending || unhide.isPending,
		setHidden: (slug: string, hidden: boolean) =>
			hidden ? hide.mutate({ slug }) : unhide.mutate({ slug }),
	};
}
