import type { Database, Prisma } from "@bbrc/db";
import type { Viewer } from "@bbrc/shared";
import {
	commentVisibleWhere,
	goalVisibleWhere,
	postVisibleWhere,
	reviewVisibleWhere,
} from "../visibility/visibility-resources";
import { visibleWhere } from "../visibility/visibility-where";

export type XpEntitySource = {
	label: string;
	href: string | null;
};

function sourceKey(reason: string, entityId: string): string {
	return `${reason}:${entityId}`;
}

const REASON_FALLBACK_LABEL: Record<
	Prisma.XPEventCreateInput["reason"],
	string
> = {
	participation: "Sitting participation",
	vote: "Poll vote",
	feedback: "Book feedback",
	post: "Post",
	comment: "Comment",
	request: "Book request",
	shelf: "Shelf created",
	goal: "Goal created",
};

export async function resolveXpEntitySources(
	db: Database,
	events: readonly {
		reason: Prisma.XPEventCreateInput["reason"];
		entityId: string;
	}[],
	viewer: Viewer,
): Promise<Map<string, XpEntitySource>> {
	const result = new Map<string, XpEntitySource>();

	if (events.length === 0) {
		return result;
	}

	const sittingIds = new Set<string>();
	const pollIds = new Set<string>();
	const feedbackIds = new Set<string>();
	const postIds = new Set<string>();
	const commentIds = new Set<string>();
	const bookRequestIds = new Set<string>();
	const shelfIds = new Set<string>();
	const goalIds = new Set<string>();

	for (const event of events) {
		if (event.reason === "participation") {
			sittingIds.add(event.entityId);
		} else if (event.reason === "vote") {
			pollIds.add(event.entityId);
		} else if (event.reason === "feedback") {
			feedbackIds.add(event.entityId);
		} else if (event.reason === "post") {
			postIds.add(event.entityId);
		} else if (event.reason === "comment") {
			commentIds.add(event.entityId);
		} else if (event.reason === "request") {
			bookRequestIds.add(event.entityId);
		} else if (event.reason === "shelf") {
			shelfIds.add(event.entityId);
		} else if (event.reason === "goal") {
			goalIds.add(event.entityId);
		}
	}

	const [
		sittings,
		polls,
		feedbacks,
		posts,
		comments,
		bookRequests,
		shelves,
		goals,
	] = await Promise.all([
		sittingIds.size > 0
			? db.sitting.findMany({
					where: { id: { in: [...sittingIds] } },
					select: { id: true, slug: true },
				})
			: Promise.resolve([]),
		pollIds.size > 0
			? db.poll.findMany({
					where: { id: { in: [...pollIds] } },
					select: {
						id: true,
						sitting: { select: { slug: true } },
					},
				})
			: Promise.resolve([]),
		feedbackIds.size > 0
			? db.feedback.findMany({
					where: {
						id: { in: [...feedbackIds] },
						AND: [reviewVisibleWhere(viewer) as Prisma.FeedbackWhereInput],
					},
					select: {
						id: true,
						slug: true,
						book: { select: { slug: true, title: true } },
					},
				})
			: Promise.resolve([]),
		postIds.size > 0
			? db.post.findMany({
					where: {
						id: { in: [...postIds] },
						AND: [postVisibleWhere(viewer) as Prisma.PostWhereInput],
					},
					select: { id: true, slug: true },
				})
			: Promise.resolve([]),
		commentIds.size > 0
			? db.comment.findMany({
					where: {
						id: { in: [...commentIds] },
						AND: [commentVisibleWhere(viewer) as Prisma.CommentWhereInput],
					},
					select: {
						id: true,
						slug: true,
						post: { select: { slug: true } },
						feedback: {
							select: {
								slug: true,
								book: { select: { slug: true } },
							},
						},
					},
				})
			: Promise.resolve([]),
		bookRequestIds.size > 0
			? db.bookRequest.findMany({
					where: { id: { in: [...bookRequestIds] } },
					select: { id: true, olid: true },
				})
			: Promise.resolve([]),
		shelfIds.size > 0
			? db.shelf.findMany({
					where: {
						id: { in: [...shelfIds] },
						AND: [
							visibleWhere(viewer, {
								ownerIdField: "userId",
								ownerRelation: "user",
								itemField: "visibility",
							}) as Prisma.ShelfWhereInput,
						],
					},
					select: {
						id: true,
						slug: true,
						title: true,
						user: { select: { username: true } },
					},
				})
			: Promise.resolve([]),
		goalIds.size > 0
			? db.goal.findMany({
					where: {
						id: { in: [...goalIds] },
						AND: [goalVisibleWhere(viewer) as Prisma.GoalWhereInput],
					},
					select: {
						id: true,
						slug: true,
						title: true,
						user: { select: { username: true } },
					},
				})
			: Promise.resolve([]),
	]);

	const sittingById = new Map(sittings.map((row) => [row.id, row]));
	const pollById = new Map(polls.map((row) => [row.id, row]));
	const feedbackById = new Map(feedbacks.map((row) => [row.id, row]));
	const postById = new Map(posts.map((row) => [row.id, row]));
	const commentById = new Map(comments.map((row) => [row.id, row]));
	const bookRequestById = new Map(bookRequests.map((row) => [row.id, row]));
	const shelfById = new Map(shelves.map((row) => [row.id, row]));
	const goalById = new Map(goals.map((row) => [row.id, row]));

	for (const event of events) {
		const key = sourceKey(event.reason, event.entityId);

		if (result.has(key)) {
			continue;
		}

		if (event.reason === "participation") {
			const sitting = sittingById.get(event.entityId);
			result.set(key, {
				label: sitting ? `Sitting ${sitting.slug}` : "Sitting",
				href: sitting ? `/sittings/${sitting.slug}` : null,
			});
			continue;
		}

		if (event.reason === "vote") {
			const poll = pollById.get(event.entityId);
			const slug = poll?.sitting.slug;
			result.set(key, {
				label: slug ? `Vote · ${slug}` : "Poll vote",
				href: slug ? `/sittings/${slug}` : null,
			});
			continue;
		}

		if (event.reason === "feedback") {
			const feedback = feedbackById.get(event.entityId);
			result.set(key, {
				label: feedback?.book.title ?? "A review",
				href:
					feedback?.book.slug && feedback.slug
						? `/books/${feedback.book.slug}/feedbacks/${feedback.slug}`
						: null,
			});
			continue;
		}

		if (event.reason === "post") {
			const post = postById.get(event.entityId);
			result.set(key, {
				label: post ? "Club post" : "A post",
				href: post ? `/posts/${post.slug}` : null,
			});
			continue;
		}

		if (event.reason === "comment") {
			const comment = commentById.get(event.entityId);
			const postSlug = comment?.post?.slug;
			const feedbackHref =
				comment?.feedback != null && comment.slug
					? `/books/${comment.feedback.book.slug}/feedbacks/${comment.feedback.slug}/comments/${comment.slug}`
					: null;
			const postHref =
				postSlug && comment?.slug
					? `/posts/${postSlug}/comments/${comment.slug}`
					: null;
			result.set(key, {
				label: comment ? "Comment" : "A comment",
				href: postHref ?? feedbackHref,
			});
			continue;
		}

		if (event.reason === "request") {
			const bookRequest = bookRequestById.get(event.entityId);
			result.set(key, {
				label: bookRequest
					? `Book request · ${bookRequest.olid}`
					: "Book request",
				href: bookRequest
					? `/books/new?olid=${encodeURIComponent(bookRequest.olid)}`
					: null,
			});
			continue;
		}

		if (event.reason === "shelf") {
			const shelf = shelfById.get(event.entityId);
			const username = shelf?.user.username;
			result.set(key, {
				label: shelf?.title ?? "A shelf",
				href:
					shelf && username ? `/users/${username}/shelves/${shelf.slug}` : null,
			});
			continue;
		}

		if (event.reason === "goal") {
			const goal = goalById.get(event.entityId);
			const username = goal?.user.username;
			result.set(key, {
				label: goal?.title ?? "A goal",
				href: goal && username ? `/users/${username}/goals/${goal.slug}` : null,
			});
			continue;
		}

		result.set(key, {
			label: REASON_FALLBACK_LABEL[event.reason],
			href: null,
		});
	}

	return result;
}

export function getXpEntitySource(
	sources: Map<string, XpEntitySource>,
	reason: Prisma.XPEventCreateInput["reason"],
	entityId: string,
): XpEntitySource {
	return (
		sources.get(sourceKey(reason, entityId)) ?? {
			label: REASON_FALLBACK_LABEL[reason],
			href: null,
		}
	);
}
