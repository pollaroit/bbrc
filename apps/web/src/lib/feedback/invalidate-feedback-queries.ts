import { orpc, queryClient } from "@/utils/orpc";

export async function invalidateFeedbackQueries() {
	await queryClient.invalidateQueries({
		queryKey: orpc.feedback.getBookFeedbackState.key(),
	});
	await queryClient.invalidateQueries({
		queryKey: orpc.feedback.getBookFeedbackList.key(),
	});
	await queryClient.invalidateQueries({
		queryKey: orpc.book.getBookBySlug.key(),
	});
	await queryClient.invalidateQueries({
		queryKey: orpc.feedback.getUserFeedbackList.key(),
	});
}
