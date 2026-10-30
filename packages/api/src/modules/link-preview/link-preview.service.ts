import type { Database, Prisma } from "@bbrc/db";
import {
	canView,
	hrefFromInternalLinkRef,
	relationTo,
	richContentPreview,
	type Viewer,
} from "@bbrc/shared";
import { authorBookSummary, findAuthorBySlug } from "../../lib/authors";
import { threadCommentVisibleWhere } from "../comment/comment-visibility";
import { shelfVisibleWhere } from "../shelf/shelf-visibility";
import {
	commentVisibleWhere,
	memberListVisibleWhere,
	postVisibleWhere,
	reviewVisibleWhere,
} from "../visibility/visibility-resources";
import type { InternalLinkRefInput, LinkPreview } from "./link-preview.schema";

const KIND_LABELS: Record<LinkPreview["kind"], string> = {
	book: "Book",
	post: "Post",
	comment_on_post: "Comment",
	comment_on_feedback: "Comment",
	feedback: "Review",
	user: "Member",
	shelf: "Shelf",
	sitting: "Sitting",
	author: "Author",
};

const memberFields = { username: true, name: true, image: true } as const;

function unavailable(ref: InternalLinkRefInput): LinkPreview {
	return {
		href: hrefFromInternalLinkRef(ref),
		kind: ref.kind,
		kindLabel: KIND_LABELS[ref.kind],
		status: "unavailable",
		title: "This link is not available",
		subtitle: "It may have been removed, or you may not be able to see it.",
		excerpt: null,
		meta: [],
		image: null,
	};
}

function count(n: number, one: string, many: string) {
	return `${n.toLocaleString("en")} ${n === 1 ? one : many}`;
}

/** The text of a post, comment or review, unless it is marked as a spoiler. */
function safeExcerpt(content: string, isSpoiler: boolean, max = 200) {
	if (isSpoiler) {
		return { excerpt: null, spoiler: true };
	}
	const text = richContentPreview(content, max);
	return { excerpt: text.length > 0 ? text : null, spoiler: false };
}

async function resolveOne(
	db: Database,
	ref: InternalLinkRefInput,
	viewer: Viewer,
): Promise<LinkPreview> {
	const href = hrefFromInternalLinkRef(ref);
	const base = { href, kind: ref.kind, kindLabel: KIND_LABELS[ref.kind] };

	switch (ref.kind) {
		case "book": {
			const book = await db.book.findUnique({
				where: { slug: ref.slug },
				select: {
					title: true,
					authors: true,
					coverId: true,
					pages: true,
					publishedIn: true,
					averageRating: true,
				},
			});
			if (!book) return unavailable(ref);
			return {
				...base,
				status: "ok",
				title: book.title,
				subtitle: book.authors.join(", ") || null,
				excerpt: null,
				meta: [
					String(book.publishedIn),
					count(book.pages, "page", "pages"),
					...(book.averageRating != null && book.averageRating > 0
						? [`★ ${book.averageRating.toFixed(1)}`]
						: []),
				],
				image: { type: "cover", coverId: book.coverId },
			};
		}

		case "user": {
			// Name, username, avatar and bio are public; the rest follows the profile.
			const user = await db.user.findFirst({
				where: {
					AND: [memberListVisibleWhere(viewer) as Prisma.UserWhereInput],
					username: ref.username,
				},
				select: {
					...memberFields,
					id: true,
					createdAt: true,
					profileVisibility: true,
					profile: {
						select: { bio: true, location: true, locationVisibility: true },
					},
				},
			});
			if (!user) return unavailable(ref);
			const sees = (item?: "public" | "friends" | "private") =>
				canView(relationTo(viewer, user.id), {
					profile: user.profileVisibility,
					item,
				});
			const showDetails = sees();
			const showLocation =
				user.profile?.location != null && sees(user.profile.locationVisibility);
			return {
				...base,
				status: "ok",
				title: user.name,
				subtitle: `@${user.username}`,
				excerpt: user.profile?.bio?.trim().slice(0, 160) || null,
				meta: [
					...(showDetails
						? [
								`Member since ${user.createdAt.toLocaleDateString("en", {
									month: "short",
									year: "numeric",
									timeZone: "UTC",
								})}`,
							]
						: []),
					...(showLocation && user.profile?.location
						? [user.profile.location]
						: []),
				],
				image: { type: "avatar", name: user.name, image: user.image },
			};
		}

		case "post": {
			const post = await db.post.findFirst({
				where: {
					AND: [
						{ slug: ref.slug },
						postVisibleWhere(viewer) as Prisma.PostWhereInput,
					],
				},
				select: {
					content: true,
					isSpoiler: true,
					author: { select: memberFields },
					poll: { select: { id: true } },
					_count: { select: { likes: true, comments: true } },
				},
			});
			if (!post) return unavailable(ref);
			const { excerpt, spoiler } = safeExcerpt(post.content, post.isSpoiler);
			return {
				...base,
				status: "ok",
				title: `Post by ${post.author.name}`,
				subtitle: post.poll ? "With a poll" : null,
				excerpt,
				meta: [
					...(spoiler ? ["Contains spoilers"] : []),
					count(post._count.likes, "like", "likes"),
					count(post._count.comments, "comment", "comments"),
				],
				image: {
					type: "avatar",
					name: post.author.name,
					image: post.author.image,
				},
			};
		}

		case "comment_on_post": {
			const comment = await db.comment.findFirst({
				where: {
					AND: [
						{ slug: ref.slug, post: { slug: ref.postSlug } },
						commentVisibleWhere(viewer) as Prisma.CommentWhereInput,
					],
				},
				select: {
					content: true,
					isSpoiler: true,
					author: { select: memberFields },
					post: { select: { author: { select: { name: true } } } },
					_count: { select: { likes: true } },
				},
			});
			if (!comment) return unavailable(ref);
			const { excerpt, spoiler } = safeExcerpt(
				comment.content,
				comment.isSpoiler,
			);
			return {
				...base,
				status: "ok",
				title: `Comment by ${comment.author.name}`,
				subtitle: comment.post
					? `On a post by ${comment.post.author.name}`
					: null,
				excerpt,
				meta: [
					...(spoiler ? ["Contains spoilers"] : []),
					count(comment._count.likes, "like", "likes"),
				],
				image: {
					type: "avatar",
					name: comment.author.name,
					image: comment.author.image,
				},
			};
		}

		case "comment_on_feedback": {
			const comment = await db.comment.findFirst({
				where: {
					AND: [
						{
							slug: ref.slug,
							feedback: {
								slug: ref.feedbackSlug,
								book: { slug: ref.bookSlug },
							},
						},
						threadCommentVisibleWhere(viewer),
					],
				},
				select: {
					content: true,
					isSpoiler: true,
					author: { select: memberFields },
					feedback: { select: { book: { select: { title: true } } } },
					_count: { select: { likes: true } },
				},
			});
			if (!comment) return unavailable(ref);
			const { excerpt, spoiler } = safeExcerpt(
				comment.content,
				comment.isSpoiler,
			);
			return {
				...base,
				status: "ok",
				title: `Comment by ${comment.author.name}`,
				subtitle: comment.feedback
					? `On a review of ${comment.feedback.book.title}`
					: null,
				excerpt,
				meta: [
					...(spoiler ? ["Contains spoilers"] : []),
					count(comment._count.likes, "like", "likes"),
				],
				image: {
					type: "avatar",
					name: comment.author.name,
					image: comment.author.image,
				},
			};
		}

		case "feedback": {
			const feedback = await db.feedback.findFirst({
				where: {
					AND: [
						{ slug: ref.slug, book: { slug: ref.bookSlug } },
						reviewVisibleWhere(viewer) as Prisma.FeedbackWhereInput,
					],
				},
				select: {
					review: true,
					isSpoiler: true,
					rating: true,
					author: { select: memberFields },
					book: { select: { title: true, coverId: true } },
					_count: { select: { likes: true, comments: true } },
				},
			});
			if (!feedback) return unavailable(ref);
			const { excerpt, spoiler } = safeExcerpt(
				feedback.review,
				feedback.isSpoiler,
			);
			return {
				...base,
				status: "ok",
				title: feedback.book.title,
				subtitle: `Review by ${feedback.author.name}`,
				excerpt,
				meta: [
					`★ ${feedback.rating.toFixed(1)}`,
					...(spoiler ? ["Contains spoilers"] : []),
					count(feedback._count.likes, "like", "likes"),
				],
				image: { type: "cover", coverId: feedback.book.coverId },
			};
		}

		case "shelf": {
			const shelf = await db.shelf.findFirst({
				where: {
					slug: ref.slug,
					user: { username: ref.username },
					// A shelf shows nothing to people who cannot open it.
					AND: [shelfVisibleWhere(viewer, { wishlist: "include" })],
				},
				select: {
					title: true,
					description: true,
					coverImageUrl: true,
					user: { select: { name: true } },
					_count: { select: { books: true, collaborators: true } },
					books: {
						orderBy: { position: "asc" },
						take: 4,
						select: { book: { select: { coverId: true } } },
					},
				},
			});
			if (!shelf) return unavailable(ref);
			return {
				...base,
				status: "ok",
				title: shelf.title,
				subtitle: `by ${shelf.user.name}`,
				excerpt: shelf.description?.trim().slice(0, 160) || null,
				meta: [
					count(shelf._count.books, "book", "books"),
					...(shelf._count.collaborators > 0
						? [`${shelf._count.collaborators + 1} curators`]
						: []),
				],
				image: {
					type: "mosaic",
					coverIds: shelf.books.map((row) => row.book.coverId),
					imageUrl: shelf.coverImageUrl,
				},
			};
		}

		case "author": {
			const author = await findAuthorBySlug(db, ref.slug);
			if (!author) return unavailable(ref);
			const summary = await authorBookSummary(db, author);
			const photo = author.id
				? await db.author.findUnique({
						where: { id: author.id },
						select: { photoUrl: true },
					})
				: null;
			return {
				...base,
				status: "ok",
				title: author.name,
				subtitle: "Author",
				excerpt: null,
				meta: [`${count(summary.bookCount, "book", "books")} in the library`],
				image: photo?.photoUrl
					? { type: "avatar", name: author.name, image: photo.photoUrl }
					: { type: "mosaic", coverIds: summary.coverIds, imageUrl: null },
			};
		}

		case "sitting": {
			const sitting = await db.sitting.findUnique({
				where: { slug: ref.slug },
				select: {
					status: true,
					selectedBook: {
						select: { title: true, authors: true, coverId: true },
					},
					_count: { select: { participants: true } },
				},
			});
			if (!sitting) return unavailable(ref);
			const status = {
				voting: "Voting is open",
				reading: "Reading now",
				finished: "Finished",
			}[sitting.status];
			return {
				...base,
				status: "ok",
				title: sitting.selectedBook?.title ?? "Club sitting",
				subtitle: sitting.selectedBook?.authors.join(", ") || null,
				excerpt: null,
				meta: [status, count(sitting._count.participants, "reader", "readers")],
				image: sitting.selectedBook
					? { type: "cover", coverId: sitting.selectedBook.coverId }
					: null,
			};
		}
	}
}

/** Previews for a batch of on-site links, in the same order. Never throws for a bad link. */
export async function resolveLinkPreviews(
	db: Database,
	refs: InternalLinkRefInput[],
	viewer: Viewer,
): Promise<LinkPreview[]> {
	return Promise.all(
		refs.map(async (ref) => {
			try {
				return await resolveOne(db, ref, viewer);
			} catch (error) {
				console.error("link preview failed", error);
				return unavailable(ref);
			}
		}),
	);
}
