import { authorNameToSlug } from "@bbrc/shared";
import { notFound } from "next/navigation";
import { leaderboardSitemapPaths } from "@/lib/leaderboard/paths";
import { db } from "@/services";
import { OgDevPreview, type OgEntry, type OgGroup } from "./og-dev-preview";

export const dynamic = "force-dynamic";

const BOOK_TABS = [
	"about",
	"documents",
	"shelves",
	"reviews",
	"reads",
	"sittings",
	"stats",
	"editions",
	"favorites",
	"quizzes",
	"more",
] as const;

function entry(
	id: string,
	label: string,
	path: string | null,
	missing: string,
	note?: string,
): OgEntry {
	return path
		? { id, label, path, note }
		: { id, label, path: null, note: missing };
}

export default async function OgDevPage() {
	if (process.env.NODE_ENV === "production") {
		notFound();
	}

	// Real rows, picked so every layout has something to show.
	const [
		book,
		series,
		post,
		postWithImage,
		postComment,
		review,
		reviewComment,
		votingSitting,
		readingSitting,
		finishedSitting,
		user,
		userWithAvatar,
		shelf,
		goal,
	] = await Promise.all([
		db.book.findFirst({
			where: { feedbacks: { some: {} }, excerpt: { not: null } },
			orderBy: { createdAt: "desc" },
			select: { slug: true, authors: true },
		}),
		db.series.findFirst({
			where: { books: { some: {} } },
			orderBy: { updatedAt: "desc" },
			select: { slug: true },
		}),
		db.post.findFirst({
			orderBy: { createdAt: "desc" },
			select: { slug: true },
		}),
		db.post.findFirst({
			where: { imageUrl: { not: null } },
			orderBy: { createdAt: "desc" },
			select: { slug: true },
		}),
		db.comment.findFirst({
			where: { postId: { not: null } },
			orderBy: { createdAt: "desc" },
			select: { slug: true, post: { select: { slug: true } } },
		}),
		db.feedback.findFirst({
			orderBy: { createdAt: "desc" },
			select: { slug: true, book: { select: { slug: true } } },
		}),
		db.comment.findFirst({
			where: { feedbackId: { not: null } },
			orderBy: { createdAt: "desc" },
			select: {
				slug: true,
				feedback: {
					select: { slug: true, book: { select: { slug: true } } },
				},
			},
		}),
		db.sitting.findFirst({
			where: { status: "voting" },
			orderBy: { createdAt: "desc" },
			select: { slug: true },
		}),
		db.sitting.findFirst({
			where: { status: "reading" },
			orderBy: { createdAt: "desc" },
			select: { slug: true },
		}),
		db.sitting.findFirst({
			where: { status: "finished", poll: { isNot: null } },
			orderBy: { createdAt: "desc" },
			select: { slug: true },
		}),
		db.user.findFirst({
			where: { isHidden: false },
			orderBy: { createdAt: "asc" },
			select: { username: true },
		}),
		db.user.findFirst({
			where: { isHidden: false, image: { not: null } },
			orderBy: { createdAt: "asc" },
			select: { username: true },
		}),
		db.shelf.findFirst({
			where: { status: "active", books: { some: {} } },
			orderBy: { updatedAt: "desc" },
			select: { slug: true, user: { select: { username: true } } },
		}),
		db.goal.findFirst({
			orderBy: { updatedAt: "desc" },
			select: { slug: true, user: { select: { username: true } } },
		}),
	]);

	const b = book?.slug;
	const u = user?.username;
	const noBook = "No book with reviews in this database.";
	const noUser = "No member in this database.";

	const groups: OgGroup[] = [
		{
			id: "general",
			label: "General",
			entries: [
				entry("home", "Home", "/", ""),
				entry("sign-in", "Sign in", "/sign-in", ""),
				entry("sign-up", "Sign up", "/sign-up", ""),
				entry("settings", "Settings", "/settings", ""),
				entry(
					"settings-notifications",
					"Notification settings",
					"/settings/notifications",
					"",
				),
			],
		},
		{
			id: "library",
			label: "Library",
			entries: [
				entry("books", "Booklist", "/books", ""),
				entry("books-new", "Add a book", "/books/new", ""),
				entry("books-request", "Request a book", "/books/request", ""),
				entry("authors", "Authors list", "/authors", ""),
				entry(
					"author",
					"Author",
					b && book?.authors[0]
						? `/authors/${authorNameToSlug(book.authors[0])}`
						: null,
					noBook,
				),
				entry("series-list", "Series list", "/series", ""),
				entry(
					"series",
					"Series detail",
					series ? `/series/${series.slug}` : null,
					"No series in this database.",
				),
			],
		},
		{
			id: "book",
			label: "Book pages",
			entries: [
				entry("book", "Overview", b ? `/books/${b}` : null, noBook),
				...BOOK_TABS.map((tab) =>
					entry(
						`book-${tab}`,
						`Tab: ${tab}`,
						b ? `/books/${b}/${tab}` : null,
						noBook,
					),
				),
				entry("book-edit", "Edit", b ? `/books/${b}/edit` : null, noBook),
				entry("book-quiz", "Quiz", b ? `/books/${b}/quiz` : null, noBook),
				entry(
					"book-quiz-results",
					"Quiz results",
					b ? `/books/${b}/quiz/results` : null,
					noBook,
				),
			],
		},
		{
			id: "social",
			label: "Posts, comments & reviews",
			entries: [
				entry("post", "Post", post ? `/posts/${post.slug}` : null, "No posts."),
				entry(
					"post-image",
					"Post with a photo",
					postWithImage ? `/posts/${postWithImage.slug}` : null,
					"No post with an image in this database.",
				),
				entry(
					"post-comment",
					"Comment on a post",
					postComment?.post
						? `/posts/${postComment.post.slug}/comments/${postComment.slug}`
						: null,
					"No comment on a post.",
				),
				entry(
					"review",
					"Review",
					review ? `/books/${review.book.slug}/feedbacks/${review.slug}` : null,
					"No reviews.",
				),
				entry(
					"review-comment",
					"Comment on a review",
					reviewComment?.feedback
						? `/books/${reviewComment.feedback.book.slug}/feedbacks/${reviewComment.feedback.slug}/comments/${reviewComment.slug}`
						: null,
					"No comment on a review.",
				),
			],
		},
		{
			id: "member",
			label: "Members",
			entries: [
				entry("users", "People list", "/users", ""),
				entry("achievements", "Achievements list", "/achievements", ""),
				entry("achievement", "Achievement", "/achievements/bookworm", ""),
				entry("user", "Member overview", u ? `/users/${u}` : null, noUser),
				entry(
					"user-avatar",
					"Member with an avatar",
					userWithAvatar ? `/users/${userWithAvatar.username}` : null,
					"No member with an avatar.",
				),
				...(
					[
						["posts", "Feed"],
						["feedbacks", "Reviews"],
						["stats", "Reading stats"],
						["xp", "Experience"],
						["rp", "Reading points"],
						["goals", "Goals"],
						["shelves", "Shelves"],
						["achievements", "Achievements"],
					] as const
				).map(([segment, label]) =>
					entry(
						`user-${segment}`,
						label,
						u ? `/users/${u}/${segment}` : null,
						noUser,
					),
				),
				entry(
					"goal",
					"Goal",
					goal ? `/users/${goal.user.username}/goals/${goal.slug}` : null,
					"No goals.",
				),
				entry(
					"shelf",
					"Shelf",
					shelf ? `/users/${shelf.user.username}/shelves/${shelf.slug}` : null,
					"No active shelf with books.",
				),
				entry(
					"shelf-edit",
					"Shelf (editing)",
					shelf
						? `/users/${shelf.user.username}/shelves/${shelf.slug}/edit`
						: null,
					"No active shelf with books.",
				),
				entry("shelves", "Shelves index", "/shelves", ""),
			],
		},
		{
			id: "sitting",
			label: "Sittings",
			entries: [
				entry("sittings", "Sittings list", "/sittings", ""),
				entry("sittings-new", "Start a sitting", "/sittings/new", ""),
				entry(
					"sitting-voting",
					"Sitting · voting",
					votingSitting ? `/sittings/${votingSitting.slug}` : null,
					"No sitting is in voting right now.",
				),
				entry(
					"sitting-reading",
					"Sitting · reading",
					readingSitting ? `/sittings/${readingSitting.slug}` : null,
					"No sitting is being read right now.",
				),
				entry(
					"sitting-finished",
					"Sitting · finished",
					finishedSitting ? `/sittings/${finishedSitting.slug}` : null,
					"No finished sitting.",
				),
				entry(
					"vote-open",
					"Poll · voting open",
					votingSitting ? `/sittings/${votingSitting.slug}/vote` : null,
					"No sitting is in voting right now.",
				),
				entry(
					"vote-closed",
					"Poll · results",
					finishedSitting ? `/sittings/${finishedSitting.slug}/vote` : null,
					"No finished sitting with a poll.",
				),
				entry(
					"participants",
					"Participants",
					(readingSitting ?? finishedSitting ?? votingSitting)
						? `/sittings/${(readingSitting ?? finishedSitting ?? votingSitting)?.slug}/participants`
						: null,
					"No sittings.",
				),
			],
		},
		{
			id: "leaderboard",
			label: "Leaderboards",
			entries: leaderboardSitemapPaths().map((path) => ({
				id: `lb-${path}`,
				label: path.replace("/leaderboard/", "").replaceAll("/", " · "),
				path,
			})),
		},
	];

	return <OgDevPreview groups={groups} />;
}
