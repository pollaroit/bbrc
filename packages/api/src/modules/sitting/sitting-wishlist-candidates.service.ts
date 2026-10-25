import type { Database } from "@bbrc/db";
import { wishlistPopularityForUsers } from "../reading/wishlist.service";
import { loadPollDrawContext, loadPollPreviewBooks } from "./sitting-poll-pool";
import type {
	WishlistPollCandidatesInput,
	WishlistPollCandidatesOutput,
} from "./sitting-wishlist-candidates.schema";

/**
 * Wishlist books the participants want most that also pass the poll's filters
 * and rules (the same pool the poll is drawn from). Counts only.
 */
export async function wishlistPollCandidates(
	input: WishlistPollCandidatesInput,
	db: Database,
): Promise<WishlistPollCandidatesOutput> {
	const context = await loadPollDrawContext(
		input.participantUserIds,
		input.poll,
		db,
	);
	const { items } = await wishlistPopularityForUsers(
		db,
		context.participantIds,
		input.limit,
		context.eligibleBookIds,
	);
	const options = await loadPollPreviewBooks(
		items.map((item) => item.id),
		context.readCountByBookId,
		db,
	);
	const byBookId = new Map(options.map((option) => [option.book.id, option]));
	return {
		participantCount: context.participantIds.length,
		items: items.flatMap((item) => {
			const option = byBookId.get(item.id);
			return option ? [{ option, wishlisted: item.wishlisted }] : [];
		}),
	};
}
