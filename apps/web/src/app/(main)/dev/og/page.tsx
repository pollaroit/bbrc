import { inviteLinkState } from "@bbrc/shared";
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

function olidEditionPath(
	row: { slug: string; olid: string | null } | null,
): string | null {
	return row?.olid ? `/books/${row.slug}/editions/${row.olid}` : null;
}

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
		olEditionUse,
		olEditionSnapshot,
		memberEdition,
		verifiedMemberEdition,
		linkedMemberEdition,
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
			where: { profileVisibility: "public" },
			orderBy: { createdAt: "asc" },
			select: { username: true },
		}),
		db.user.findFirst({
			where: { profileVisibility: "public", image: { not: null } },
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
		// An Open Library edition a member is reading or has read.
		db.reading.findFirst({
			where: { editionOlid: { not: null } },
			orderBy: { updatedAt: "desc" },
			select: { editionOlid: true, book: { select: { slug: true } } },
		}),
		db.editionSnapshot.findFirst({
			orderBy: { updatedAt: "desc" },
			select: { olid: true, book: { select: { slug: true } } },
		}),
		db.bookEdition.findFirst({
			where: { status: "member", openLibraryOlid: null },
			orderBy: { createdAt: "desc" },
			select: { publicId: true, book: { select: { slug: true } } },
		}),
		db.bookEdition.findFirst({
			where: { status: "verified", openLibraryOlid: null },
			orderBy: { createdAt: "desc" },
			select: { publicId: true, book: { select: { slug: true } } },
		}),
		db.bookEdition.findFirst({
			where: { openLibraryOlid: { not: null } },
			orderBy: { createdAt: "desc" },
			select: {
				openLibraryOlid: true,
				book: { select: { slug: true } },
			},
		}),
	]);

	// Authors: one with a photo and one with books but no photo (covers fallback).
	const [authorWithPhoto, authorWithoutPhoto] = await Promise.all([
		db.author.findFirst({
			where: { photoUrl: { not: null }, books: { some: {} } },
			orderBy: { updatedAt: "desc" },
			select: { slug: true },
		}),
		db.author.findFirst({
			where: { photoUrl: null, books: { some: {} } },
			orderBy: { updatedAt: "desc" },
			select: { slug: true },
		}),
	]);

	const postWithTierlist = await db.post.findFirst({
		where: { tierlist: { isNot: null } },
		orderBy: { createdAt: "desc" },
		select: { slug: true },
	});

	// Invitation links: a working one, an ended one, and a token that never existed.
	const inviteLinks = await db.sittingInviteLink.findMany({
		orderBy: { createdAt: "desc" },
		take: 30,
		select: {
			token: true,
			expiresAt: true,
			maxUses: true,
			uses: true,
			revokedAt: true,
		},
	});
	const activeInvite = inviteLinks.find(
		(link) => inviteLinkState(link) === "active",
	);
	const endedInvite = inviteLinks.find(
		(link) => inviteLinkState(link) !== "active",
	);

	const openLibraryEdition = olidEditionPath(
		olEditionUse
			? { slug: olEditionUse.book.slug, olid: olEditionUse.editionOlid }
			: olEditionSnapshot
				? { slug: olEditionSnapshot.book.slug, olid: olEditionSnapshot.olid }
				: null,
	);
	const memberEditionPath = (
		row: { publicId: string; book: { slug: string } } | null,
	) => (row ? `/books/${row.book.slug}/editions/m-${row.publicId}` : null);

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
					"Author (with photo)",
					authorWithPhoto ? `/authors/${authorWithPhoto.slug}` : null,
					"No author with a photo in this database.",
				),
				entry(
					"author-no-photo",
					"Author (no photo, covers)",
					authorWithoutPhoto ? `/authors/${authorWithoutPhoto.slug}` : null,
					"No author without a photo in this database.",
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
				entry(
					"edition-ol",
					"Edition · Open Library",
					openLibraryEdition,
					"No member has picked an Open Library edition yet.",
				),
				entry(
					"edition-member",
					"Edition · member-added",
					memberEditionPath(memberEdition),
					"No member-added edition in this database.",
				),
				entry(
					"edition-verified",
					"Edition · member-added and verified",
					memberEditionPath(verifiedMemberEdition),
					"No verified member edition in this database.",
				),
				entry(
					"edition-linked",
					"Edition · linked to Open Library",
					linkedMemberEdition?.openLibraryOlid
						? `/books/${linkedMemberEdition.book.slug}/editions/${linkedMemberEdition.openLibraryOlid}`
						: null,
					"No member edition is linked to an Open Library edition yet.",
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
					"post-tierlist",
					"Post with a tierlist",
					postWithTierlist ? `/posts/${postWithTierlist.slug}` : null,
					"No post with a tierlist in this database.",
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
				entry(
					"compare",
					"Reading compared (two members)",
					u && userWithAvatar && u !== userWithAvatar.username
						? `/users/compare/${u}/${userWithAvatar.username}`
						: null,
					"Needs two different members.",
				),
				entry(
					"compare-fallback",
					"Reading compared (fallback)",
					"/users/compare/nobody-one/nobody-two",
					"",
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
					"invite-valid",
					"Invitation · working link",
					activeInvite ? `/sittings/join/${activeInvite.token}` : null,
					"No working invitation link in this database.",
				),
				entry(
					"invite-ended",
					"Invitation · expired, ended or used up (generic)",
					endedInvite ? `/sittings/join/${endedInvite.token}` : null,
					"No ended invitation link in this database.",
				),
				entry(
					"invite-unknown",
					"Invitation · unknown token (generic)",
					"/sittings/join/this-token-does-not-exist",
					"",
				),
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
