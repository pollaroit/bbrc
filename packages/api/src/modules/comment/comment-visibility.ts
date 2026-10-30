import type { Prisma } from "@bbrc/db";
import type { Viewer } from "@bbrc/shared";
import {
	commentVisibleWhere,
	reviewVisibleWhere,
} from "../visibility/visibility-resources";
import { notBlockedWhere } from "../visibility/visibility-where";

/**
 * Comments the viewer may see. A comment on a post follows its post; a comment on a
 * review follows its review (`commentVisibleWhere` alone would drop those, they have
 * no post). Either way a blocked author's comment is left out. Counts do not use this.
 */
export function threadCommentVisibleWhere(
	viewer: Viewer,
): Prisma.CommentWhereInput {
	return {
		OR: [
			commentVisibleWhere(viewer) as Prisma.CommentWhereInput,
			{
				AND: [
					{ feedback: reviewVisibleWhere(viewer) as Prisma.FeedbackWhereInput },
					notBlockedWhere(viewer, "authorId") as Prisma.CommentWhereInput,
				],
			},
		],
	};
}
