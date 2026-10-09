import { orpc, queryClient } from "@/utils/orpc";

export async function invalidateReadQueries(bookSlug: string) {
	await Promise.all([
		queryClient.invalidateQueries({
			queryKey: orpc.read.getBookReadState.key({ input: { bookSlug } }),
		}),
		queryClient.invalidateQueries({
			queryKey: orpc.read.listForBook.key({ input: { bookSlug } }),
		}),
		queryClient.invalidateQueries({
			queryKey: orpc.favorite.getViewerLibraryEngagement.key(),
		}),
		queryClient.invalidateQueries({
			queryKey: orpc.read.listForUser.key(),
		}),
	]).then(() =>
		queryClient.invalidateQueries({
			queryKey: orpc.book.getBookList.key(),
		}),
	);
}
