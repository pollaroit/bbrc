import type { Prisma } from "@bbrc/db";
import { mergeWhereFragments } from "../../utils/searching";
import { activeParticipationWhere } from "../sitting/participation-active";
import { bookListRanging, bookListSearching } from "./book.listing";
import type { GetBookListInput } from "./book.schema";

export type BookListQueryInput = Omit<GetBookListInput, "cursor" | "limit"> & {
	limit?: number;
};

export function buildBookListWhere(
	input: BookListQueryInput,
	viewerUserId?: string,
): Prisma.BookWhereInput {
	const ranging = bookListRanging.from(input);
	const searching = bookListSearching.from(input);

	const viewerFragments: Prisma.BookWhereInput[] = [];

	if (viewerUserId && input.viewerRead) {
		viewerFragments.push({
			sittingsSelectedFor: {
				some: {
					status: { in: ["reading", "finished"] },
					participants: {
						some: {
							userId: viewerUserId,
							...activeParticipationWhere,
							progress: "completed",
						},
					},
				},
			},
		});
	}

	if (viewerUserId && input.viewerFavorite) {
		viewerFragments.push({
			favorites: {
				some: { userId: viewerUserId },
			},
		});
	}

	if (viewerUserId && input.viewerReviewed) {
		viewerFragments.push({
			feedbacks: {
				some: { authorId: viewerUserId },
			},
		});
	}

	return mergeWhereFragments<Prisma.BookWhereInput>(
		ranging.use(),
		searching.use(),
		{
			status: input.statuses ? { in: input.statuses } : undefined,
			openLibraryRating:
				input.minOpenLibraryRating == null && input.maxOpenLibraryRating == null
					? undefined
					: {
							gte: input.minOpenLibraryRating ?? undefined,
							lte: input.maxOpenLibraryRating ?? undefined,
						},
		},
		...viewerFragments,
	);
}
