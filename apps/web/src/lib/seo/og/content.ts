import { getBookBySlug } from "@bbrc/api/modules/book/book.service";
import { getCommentBySlug } from "@bbrc/api/modules/comment/comment.service";
import { getFeedbackBySlug } from "@bbrc/api/modules/feedback/feedback.service";
import { getPostBySlug } from "@bbrc/api/modules/post/post.service";
import { sittingStatusFilterLabels } from "@bbrc/api/modules/sitting/sitting.schema";
import { getSittingBySlug } from "@bbrc/api/modules/sitting/sitting.service";
import { getUserByUsername } from "@bbrc/api/modules/user/user.service";
import { formatBookAuthors } from "@/lib/book-cover";
import { truncateDescription } from "@/lib/seo/metadata";
import { DEFAULT_DESCRIPTION } from "@/lib/seo/site";
import { db } from "@/services";
import {
	formatCount,
	formatOgDate,
	truncateOgLine,
	truncateOgTitle,
} from "./helpers";
import type { OgImageContent } from "./template";

const anonymousSession = null;

type CommentOgContext = Awaited<ReturnType<typeof getCommentBySlug>>;

function commentOgHighlights(comment: CommentOgContext): string[] {
	const highlights = [
		`@${comment.author.username}`,
		formatCount("like", comment.likeCount),
	];
	if (comment.replyCount > 0) {
		highlights.push(formatCount("reply", comment.replyCount));
	}
	if (comment.editedAt) {
		highlights.push("Edited");
	}
	return highlights;
}

function commentOgPayload(
	comment: CommentOgContext,
	contextDescription: string,
): OgImageContent {
	return {
		kind: "Comment",
		title: truncateOgTitle(comment.content),
		description: truncateOgLine(contextDescription, 140),
		highlights: commentOgHighlights(comment),
	};
}

const STATIC_PAGES: Record<string, OgImageContent> = {
	"": {
		title: "Club feed",
		description: "Activity, sittings, and reading progress at BBRC.",
		kind: "Home",
	},
	"books/new": {
		title: "Add book",
		description: "Add a book to the BBRC library from Open Library.",
		kind: "Library",
	},
	"books/request": {
		title: "Request a book",
		description: "Search Open Library and suggest titles for the club library.",
		kind: "Library",
	},
	"sittings/new": {
		title: "New sitting",
		description: "Start a new reading sitting.",
		kind: "Sittings",
	},
	settings: {
		title: "Settings",
		description: "Account preferences.",
		kind: "Settings",
	},
	"settings/notifications": {
		title: "Notifications",
		description: "In-app alerts and phone push via ntfy.",
		kind: "Settings",
	},
	"sign-in": {
		title: "Sign in",
		description: "Sign in to your BBRC account.",
		kind: "Auth",
	},
	"sign-up": {
		title: "Sign up",
		description: "Create a BBRC account.",
		kind: "Auth",
	},
};

async function resolveBooksRequestOg(): Promise<OgImageContent> {
	const [pendingCount, requestCount] = await Promise.all([
		db.bookRequest.count({ where: { status: "pending" } }),
		db.bookRequest.count(),
	]);

	const highlights = [
		"Open Library search",
		pendingCount > 0
			? `${pendingCount} pending for admins`
			: "Queue clear for admins",
	];
	if (requestCount > 0) {
		highlights.push(formatCount("member request", requestCount));
	}

	return {
		kind: "Library",
		title: "Request a book",
		description:
			"Suggest a work for the club catalog · admins review and add titles.",
		highlights,
	};
}

async function resolveBooksListOg(): Promise<OgImageContent> {
	const [bookCount, ratedCount, reviewCount] = await Promise.all([
		db.book.count(),
		db.book.count({ where: { averageRating: { not: null } } }),
		db.feedback.count(),
	]);

	const parts = [formatCount("title", bookCount)];
	if (ratedCount > 0) {
		parts.push(`${ratedCount} club-rated`);
	}
	if (reviewCount > 0) {
		parts.push(formatCount("member review", reviewCount));
	}

	return {
		kind: "Library",
		title: "Our Booklist",
		description: parts.join(" · "),
	};
}

async function resolveSittingsListOg(): Promise<OgImageContent> {
	const [total, active, finished] = await Promise.all([
		db.sitting.count(),
		db.sitting.count({
			where: { status: { in: ["voting", "reading"] } },
		}),
		db.sitting.count({ where: { status: "finished" } }),
	]);

	return {
		kind: "Sittings",
		title: "Reading rounds",
		description: [
			formatCount("sitting", total),
			active > 0 ? `${active} active now` : "no active sitting",
			`${finished} finished`,
		].join(" · "),
	};
}

async function resolveMembersListOg(): Promise<OgImageContent> {
	const [memberCount, adminCount] = await Promise.all([
		db.user.count(),
		db.user.count({ where: { isAdmin: true } }),
	]);

	return {
		kind: "Members",
		title: "The brigade",
		description: [
			formatCount("member", memberCount),
			adminCount > 0
				? `${adminCount} admin${adminCount === 1 ? "" : "s"}`
				: null,
			"XP · RP · reading history",
		]
			.filter(Boolean)
			.join(" · "),
	};
}

export async function resolveOgImageContent(
	pathSegments: string[],
): Promise<OgImageContent> {
	if (pathSegments.length === 0) {
		return (
			STATIC_PAGES[""] ?? {
				title: "Club feed",
				description: DEFAULT_DESCRIPTION,
				kind: "Home",
			}
		);
	}

	const staticKey = pathSegments.join("/");

	if (staticKey === "books") {
		return resolveBooksListOg();
	}
	if (staticKey === "books/request") {
		return resolveBooksRequestOg();
	}
	if (staticKey === "sittings") {
		return resolveSittingsListOg();
	}
	if (staticKey === "users") {
		return resolveMembersListOg();
	}

	const staticPage = STATIC_PAGES[staticKey];
	if (staticPage) {
		return staticPage;
	}

	const [section, slug, ...rest] = pathSegments;

	if (!slug) {
		return (
			STATIC_PAGES[section ?? ""] ?? {
				title: section ?? "BBRC",
				description: DEFAULT_DESCRIPTION,
			}
		);
	}

	if (
		section === "books" &&
		rest[0] === "feedbacks" &&
		rest[1] &&
		rest[2] === "comments" &&
		rest[3]
	) {
		const bookSlug = slug;
		const feedbackSlug = rest[1];
		const commentSlug = rest[3];
		try {
			const [comment, feedback] = await Promise.all([
				getCommentBySlug(commentSlug, db, anonymousSession),
				getFeedbackBySlug(feedbackSlug, db, anonymousSession),
			]);
			if (
				comment.bookSlug !== bookSlug ||
				comment.feedbackSlug !== feedbackSlug ||
				feedback.bookSlug !== bookSlug
			) {
				return {
					kind: "Comment",
					title: "Comment not found",
					description: DEFAULT_DESCRIPTION,
				};
			}

			return commentOgPayload(
				comment,
				`${feedback.bookTitle} · review by ${feedback.author.name} (@${feedback.author.username})`,
			);
		} catch {
			return {
				kind: "Comment",
				title: "Comment not found",
				description: DEFAULT_DESCRIPTION,
			};
		}
	}

	if (section === "books" && rest[0] === "feedbacks" && rest[1]) {
		const bookSlug = slug;
		const feedbackSlug = rest[1];
		try {
			const feedback = await getFeedbackBySlug(
				feedbackSlug,
				db,
				anonymousSession,
			);
			if (feedback.bookSlug !== bookSlug) {
				return {
					kind: "Review",
					title: "Review not found",
					description: DEFAULT_DESCRIPTION,
				};
			}

			return {
				kind: "Review",
				title: truncateOgTitle(feedback.review),
				description: truncateOgLine(
					`${feedback.bookTitle} · ${feedback.author.name} (@${feedback.author.username})`,
					140,
				),
				highlights: [
					`${feedback.rating.toFixed(1)} / 5`,
					formatCount("like", feedback.likeCount),
					formatCount("comment", feedback.commentCount),
				],
			};
		} catch {
			return {
				kind: "Review",
				title: "Review not found",
				description: DEFAULT_DESCRIPTION,
			};
		}
	}

	if (section === "books" && rest[0] === "edit") {
		try {
			const book = await getBookBySlug(slug, db);
			return {
				kind: "Edit",
				title: book.title,
				description: "Update this library entry.",
				highlights: ["Edit mode", `@${slug}`],
			};
		} catch {
			return {
				kind: "Edit",
				title: "Edit book",
				description: DEFAULT_DESCRIPTION,
			};
		}
	}

	if (section === "books") {
		try {
			const book = await getBookBySlug(slug, db);
			const reviewCount = await db.feedback.count({
				where: { book: { slug } },
			});

			const highlights: string[] = [
				formatBookAuthors(book.authors),
				book.pages ? `${book.pages} pages` : "Pages unknown",
			];

			if (book.averageRating != null) {
				highlights.push(`${book.averageRating.toFixed(1)} club avg`);
			}
			if (book.openLibraryRating != null) {
				highlights.push(`${book.openLibraryRating.toFixed(1)} OL rating`);
			}
			if (reviewCount > 0) {
				highlights.push(formatCount("review", reviewCount));
			}
			if (book.status) {
				highlights.push(book.status.replaceAll("_", " "));
			}

			return {
				kind: "Book",
				title: book.title,
				description: truncateDescription(
					book.excerpt?.trim() ||
						`In the BBRC library · first published ${book.publishedIn ?? "—"}`,
				),
				highlights,
			};
		} catch {
			return {
				kind: "Book",
				title: "Book not found",
				description: DEFAULT_DESCRIPTION,
			};
		}
	}

	if (section === "posts" && rest[0] === "comments" && rest[1]) {
		const postSlug = slug;
		const commentSlug = rest[1];
		try {
			const [comment, post] = await Promise.all([
				getCommentBySlug(commentSlug, db, anonymousSession),
				getPostBySlug(postSlug, db, anonymousSession),
			]);
			if (comment.postSlug !== postSlug) {
				return {
					kind: "Comment",
					title: "Comment not found",
					description: DEFAULT_DESCRIPTION,
				};
			}

			return commentOgPayload(
				comment,
				`@${comment.author.username} · post by ${post.author.name} (@${post.author.username})`,
			);
		} catch {
			return {
				kind: "Comment",
				title: "Comment not found",
				description: DEFAULT_DESCRIPTION,
			};
		}
	}

	if (section === "posts" && rest[0] === "edit") {
		try {
			const post = await getPostBySlug(slug, db, anonymousSession);
			return {
				kind: "Edit",
				title: truncateOgTitle(post.content),
				description: truncateOgLine(
					`@${post.author.username} · edit mode`,
					140,
				),
				highlights: [`@${post.author.username}`, "Edit mode"],
			};
		} catch {
			return {
				kind: "Edit",
				title: "Edit post",
				description: DEFAULT_DESCRIPTION,
			};
		}
	}

	if (section === "posts") {
		try {
			const post = await getPostBySlug(slug, db, anonymousSession);
			const highlights = [
				`${post.likeCount} like${post.likeCount === 1 ? "" : "s"}`,
				`${post.commentCount} comment${post.commentCount === 1 ? "" : "s"}`,
				`@${post.author.username}`,
			];
			if (post.attachedBook) {
				highlights.unshift(post.attachedBook.title);
			}
			if (post.editedAt) {
				highlights.push("Edited");
			}

			const postContext = post.attachedBook
				? `@${post.author.username} · ${post.attachedBook.title}`
				: `@${post.author.username}`;

			return {
				kind: "Post",
				title: truncateOgTitle(post.content),
				description: truncateOgLine(postContext, 140),
				highlights,
			};
		} catch {
			return {
				kind: "Post",
				title: "Post not found",
				description: DEFAULT_DESCRIPTION,
			};
		}
	}

	if (section === "users") {
		if (rest[0] === "posts") {
			try {
				const user = await getUserByUsername({ username: slug }, db);
				const postCount = await db.post.count({
					where: { author: { username: slug } },
				});

				return {
					kind: "Feed",
					title: user.name,
					description: `${formatCount("post", postCount)} on BBRC`,
					highlights: [
						`@${user.username}`,
						`${user.xp.toLocaleString("en-US")} XP`,
					],
				};
			} catch {
				return {
					kind: "Feed",
					title: "Member not found",
					description: DEFAULT_DESCRIPTION,
				};
			}
		}

		if (rest[0] === "feedbacks") {
			try {
				const user = await getUserByUsername({ username: slug }, db);
				const reviewCount = await db.feedback.count({
					where: { author: { username: slug } },
				});

				return {
					kind: "Feedbacks",
					title: user.name,
					description: `${formatCount("book review", reviewCount)}`,
					highlights: [`@${user.username}`],
				};
			} catch {
				return {
					kind: "Feedbacks",
					title: "Member not found",
					description: DEFAULT_DESCRIPTION,
				};
			}
		}

		if (rest[0] === "xp") {
			try {
				const user = await getUserByUsername({ username: slug }, db);
				const eventCount = await db.xPEvent.count({
					where: { user: { username: slug } },
				});

				return {
					kind: "Experience",
					title: user.name,
					description: `${user.xp.toLocaleString("en-US")} XP total · ${formatCount("ledger event", eventCount)}`,
					highlights: [
						`@${user.username}`,
						user.status,
						user.isAdmin ? "Admin" : "Member",
					],
				};
			} catch {
				return {
					kind: "Experience",
					title: "Member not found",
					description: DEFAULT_DESCRIPTION,
				};
			}
		}

		if (rest[0] === "rp") {
			try {
				const user = await getUserByUsername({ username: slug }, db);
				const eventCount = await db.rPEvent.count({
					where: { user: { username: slug } },
				});

				return {
					kind: "Reading points",
					title: user.name,
					description: `${user.rp.toLocaleString("en-US")} RP total · ${formatCount("ledger event", eventCount)}`,
					highlights: [
						`@${user.username}`,
						user.status,
						user.isAdmin ? "Admin" : "Member",
					],
				};
			} catch {
				return {
					kind: "Reading points",
					title: "Member not found",
					description: DEFAULT_DESCRIPTION,
				};
			}
		}

		try {
			const user = await getUserByUsername({ username: slug }, db);
			const [postsAuthored, sittingsJoined] = await Promise.all([
				db.post.count({ where: { author: { username: slug } } }),
				db.participation.count({ where: { user: { username: slug } } }),
			]);

			return {
				kind: "Member",
				title: user.name,
				description: `@${user.username} · ${user.status}${user.isAdmin ? " · admin" : ""}`,
				highlights: [
					`${user.xp.toLocaleString("en-US")} XP`,
					`${user.rp.toLocaleString("en-US")} RP`,
					formatCount("post", postsAuthored),
					formatCount("sitting joined", sittingsJoined),
				],
			};
		} catch {
			return {
				kind: "Member",
				title: "Member not found",
				description: DEFAULT_DESCRIPTION,
			};
		}
	}

	if (section === "sittings") {
		if (rest[0] === "vote") {
			try {
				const sitting = await getSittingBySlug(slug, db, anonymousSession);
				if (!sitting.poll) {
					return {
						kind: "Poll",
						title: "Poll not found",
						description: DEFAULT_DESCRIPTION,
					};
				}

				const pollOptions = sitting.poll.options.length;
				const pollVotes = sitting.poll.options.reduce(
					(sum, option) => sum + option.voteCount,
					0,
				);
				const isOpen = sitting.status === "voting";

				return {
					kind: "Poll",
					title: isOpen ? "Book poll" : "Voting results",
					description: isOpen
						? `Rank wishlist books · ${formatCount("participant", sitting.participants.length)}`
						: `Final totals · ${sitting.selectedBook?.title ?? sitting.slug.replaceAll("_", " ")}`,
					highlights: [
						isOpen ? "Voting open" : sittingStatusFilterLabels[sitting.status],
						`${pollOptions} options · ${pollVotes} votes · ${sitting.poll.voterCount} voters`,
						formatCount("participant", sitting.participants.length),
					],
				};
			} catch {
				return {
					kind: "Poll",
					title: "Poll not found",
					description: DEFAULT_DESCRIPTION,
				};
			}
		}

		if (rest[0] === "participants") {
			try {
				const sitting = await getSittingBySlug(slug, db, anonymousSession);
				const completed = sitting.participants.filter(
					(p) => p.progress === "completed",
				).length;

				return {
					kind: "Sitting",
					title: "Participants",
					description: `${formatCount("member", sitting.participants.length)} on ${sitting.slug.replaceAll("_", " ")}`,
					highlights: [
						sittingStatusFilterLabels[sitting.status],
						formatCount("participant", sitting.participants.length),
						completed > 0 ? `${completed} finished reading` : "Club roster",
					],
				};
			} catch {
				return {
					kind: "Sitting",
					title: "Participants",
					description: DEFAULT_DESCRIPTION,
				};
			}
		}

		try {
			const sitting = await getSittingBySlug(slug, db, anonymousSession);
			const statusLabel = sittingStatusFilterLabels[sitting.status];
			const completed = sitting.participants.filter(
				(p) => p.progress === "completed",
			).length;
			const dnf = sitting.participants.filter(
				(p) => p.progress === "dnf",
			).length;
			const inProgress = sitting.participants.filter(
				(p) => p.progress === "in_progress",
			).length;
			const pollOptions = sitting.poll?.options.length ?? 0;
			const pollVotes =
				sitting.poll?.options.reduce((sum, o) => sum + o.voteCount, 0) ?? 0;

			const title =
				sitting.selectedBook?.title ??
				`Sitting ${sitting.slug.replaceAll("_", " ")}`;

			const highlights: string[] = [
				statusLabel,
				formatCount("participant", sitting.participants.length),
			];

			if (sitting.selectedBook) {
				highlights.push(formatBookAuthors(sitting.selectedBook.authors));
			}
			if (sitting.status === "voting" && pollOptions > 0) {
				highlights.push(`${pollOptions} poll options · ${pollVotes} votes`);
			}
			if (sitting.status === "reading" || sitting.status === "finished") {
				if (completed > 0) {
					highlights.push(`${completed} finished`);
				}
				if (inProgress > 0) {
					highlights.push(`${inProgress} reading`);
				}
				if (dnf > 0) {
					highlights.push(`${dnf} DNF`);
				}
				if (sitting.reviews.length > 0) {
					highlights.push(formatCount("review", sitting.reviews.length));
				}
			}

			const deadlineLine = sitting.deadline
				? `Deadline ${formatOgDate(sitting.deadline)}`
				: "No deadline set";

			return {
				kind: "Sitting",
				title,
				description: `${deadlineLine} · started ${formatOgDate(sitting.createdAt)}`,
				highlights,
			};
		} catch {
			return {
				kind: "Sitting",
				title: "Sitting not found",
				description: DEFAULT_DESCRIPTION,
			};
		}
	}

	return {
		title: pathSegments.join(" / "),
		description: DEFAULT_DESCRIPTION,
	};
}
