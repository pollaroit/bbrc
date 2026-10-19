import { fetchWorkEditionTotalCount } from "@bbrc/api/lib/open-library/work-editions";
import { getAuthorPage } from "@bbrc/api/modules/author/author.service";
import { loadAuthorCatalog } from "@bbrc/api/modules/author/author-catalog";
import { getBookBySlug } from "@bbrc/api/modules/book/book.service";
import { getCommentBySlug } from "@bbrc/api/modules/comment/comment.service";
import { getFeedbackBySlug } from "@bbrc/api/modules/feedback/feedback.service";
import { getGoalBySlug } from "@bbrc/api/modules/goal/goal.service";
import {
	LEADERBOARD_KIND_META,
	LEADERBOARD_PERIOD_META,
	type LeaderboardKind,
	type LeaderboardPeriod,
} from "@bbrc/api/modules/leaderboard/leaderboard.schema";
import { getLeaderboardOgSnapshot } from "@bbrc/api/modules/leaderboard/leaderboard.service";
import { getPostBySlug } from "@bbrc/api/modules/post/post.service";
import { getSeriesBySlug } from "@bbrc/api/modules/series/series.service";
import { getShelfBySlug } from "@bbrc/api/modules/shelf/shelf.service";
import { sittingStatusFilterLabels } from "@bbrc/api/modules/sitting/sitting.schema";
import { getSittingBySlug } from "@bbrc/api/modules/sitting/sitting.service";
import { getUserByUsername } from "@bbrc/api/modules/user/user.service";
import { formatBookAuthors } from "@/lib/book-cover";
import { parseLeaderboardPathname } from "@/lib/leaderboard/paths";
import { postAttachmentLabel } from "@/lib/post-attachment-label";
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

async function resolveShelvesListOg(): Promise<OgImageContent> {
	const [shelfCount, bookLinks, creators] = await Promise.all([
		db.shelf.count({ where: { status: "active" } }),
		db.shelfBook.count({
			where: { shelf: { status: "active" } },
		}),
		db.user.count({
			where: { shelves: { some: { status: "active" } } },
		}),
	]);

	return {
		kind: "Shelves",
		title: "Member shelves",
		description: [
			formatCount("public list", shelfCount),
			formatCount("listed book", bookLinks),
			formatCount("curator", creators),
		].join(" · "),
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

async function resolveLeaderboardHubOg(
	period: LeaderboardPeriod = "month",
): Promise<OgImageContent> {
	const snapshot = await getLeaderboardOgSnapshot("xp", db, period);
	const periodLabel = LEADERBOARD_PERIOD_META[period].label;

	return {
		kind: "Leaderboard",
		title: `Leaderboard overview · ${periodLabel}`,
		description: `${snapshot.memberCount} members ranked · ${periodLabel.toLowerCase()} · XP, RP, reads, posts, sittings`,
		highlights: [
			snapshot.leaderMetric > 0
				? `Top XP: ${snapshot.leaderName} (${snapshot.leaderMetric})`
				: "Ties share the same place",
			"Five boards",
		],
	};
}

async function resolveLeaderboardKindOg(
	kind: LeaderboardKind,
	period: LeaderboardPeriod = "month",
): Promise<OgImageContent> {
	const meta = LEADERBOARD_KIND_META[kind];
	const periodLabel = LEADERBOARD_PERIOD_META[period].label;
	const snapshot = await getLeaderboardOgSnapshot(kind, db, period);

	return {
		kind: "Leaderboard",
		title: `${meta.title} · ${periodLabel}`,
		description: `${meta.description} ${periodLabel} rankings.`,
		highlights: [
			formatCount("member", snapshot.memberCount),
			snapshot.leaderMetric > 0
				? `Leader: ${snapshot.leaderName} · ${snapshot.leaderMetric} ${meta.metricLabel}`
				: "No scores yet",
		],
	};
}

async function resolveSeriesListOg(): Promise<OgImageContent> {
	const [seriesCount, volumeCount] = await Promise.all([
		db.series.count(),
		db.seriesBook.count(),
	]);

	return {
		kind: "Series",
		title: "Reading series",
		description:
			"Club-curated reading order for multi-volume works — numbered start to finish.",
		highlights: [
			formatCount("series", seriesCount),
			formatCount("catalog volume", volumeCount),
			"Reading order",
		],
	};
}

async function resolveAuthorDetailOg(slug: string): Promise<OgImageContent> {
	const author = await getAuthorPage(slug, db);

	const highlights = [
		formatCount("catalog book", author.bookCount),
		"Club library",
	];

	const topFan = author.biggestFans[0];
	if (topFan) {
		highlights.push(`${topFan.averageRating.toFixed(1)} avg from top fan`);
	}

	if (author.similarAuthors.length > 0) {
		highlights.push(
			formatCount("similar author", author.similarAuthors.length),
		);
	}

	return {
		kind: "Author",
		title: author.name,
		description: truncateOgLine(
			`${author.bookCount} ${author.bookCount === 1 ? "book" : "books"} in the BBRC catalog · reads, reviews, and related authors.`,
			140,
		),
		highlights,
	};
}

async function resolveSeriesDetailOg(slug: string): Promise<OgImageContent> {
	const series = await getSeriesBySlug(slug, db);
	const first = series.books[0]?.book;
	const highlights = [
		formatCount("book", series.bookCount),
		"Club reading order",
	];

	if (first) {
		highlights.push(formatBookAuthors(first.authors));
		if (first.publishedIn != null) {
			highlights.push(`Vol. 1 · ${first.publishedIn}`);
		}
	}

	return {
		kind: "Series",
		title: series.title,
		description: truncateOgLine(
			series.description?.trim() ||
				`${series.bookCount} ${series.bookCount === 1 ? "book" : "books"} in numbered club order.`,
			140,
		),
		highlights,
	};
}

async function resolveAuthorsListOg(): Promise<OgImageContent> {
	const [catalog, bookCount, reviewCount] = await Promise.all([
		loadAuthorCatalog(db),
		db.book.count(),
		db.feedback.count(),
	]);

	const ratedAuthors = catalog.filter(
		(entry) => entry.averageRating != null,
	).length;

	return {
		kind: "Authors",
		title: "Authors",
		description:
			"Browse writers in the BBRC catalog by country, reads, reviews, and club ratings.",
		highlights: [
			formatCount("writer", catalog.length),
			formatCount("catalog book", bookCount),
			reviewCount > 0 ? formatCount("member review", reviewCount) : null,
			ratedAuthors > 0 ? `${ratedAuthors} club-rated` : null,
		].filter((line): line is string => line != null),
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
	if (staticKey === "shelves") {
		return resolveShelvesListOg();
	}
	if (staticKey === "sittings") {
		return resolveSittingsListOg();
	}
	if (staticKey === "series") {
		return resolveSeriesListOg();
	}
	if (staticKey === "users") {
		return resolveMembersListOg();
	}
	if (staticKey === "authors") {
		return resolveAuthorsListOg();
	}
	if (staticKey === "leaderboard" || staticKey.startsWith("leaderboard/")) {
		const route = parseLeaderboardPathname(`/${staticKey}`);
		if (route.kind == null) {
			return resolveLeaderboardHubOg(route.period);
		}
		return resolveLeaderboardKindOg(route.kind, route.period);
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

	if (section === "series" && rest.length === 0) {
		try {
			return await resolveSeriesDetailOg(slug);
		} catch {
			return {
				kind: "Series",
				title: "Series not found",
				description: DEFAULT_DESCRIPTION,
			};
		}
	}

	if (section === "authors" && rest.length === 0) {
		try {
			return await resolveAuthorDetailOg(slug);
		} catch {
			return {
				kind: "Author",
				title: "Author not found",
				description: DEFAULT_DESCRIPTION,
			};
		}
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
		const bookTab = rest[0];
		const BOOK_TAB_OG: Record<
			string,
			{ label: string; description: (title: string) => string }
		> = {
			about: {
				label: "About",
				description: (title) =>
					`Excerpt, subjects, and catalog details for ${title}.`,
			},
			documents: {
				label: "Documents",
				description: (title) => `Member documents linked to ${title}.`,
			},
			shelves: {
				label: "Shelves",
				description: (title) => `Club shelves that include ${title}.`,
			},
			reviews: {
				label: "Reviews",
				description: (title) => `Member reviews and ratings for ${title}.`,
			},
			reads: {
				label: "Reads",
				description: (title) =>
					`Members who finished ${title} and the editions they read.`,
			},
			editions: {
				label: "Editions",
				description: (title) =>
					`Open Library editions for ${title} — covers, publishers, and dates.`,
			},
			more: {
				label: "More to read",
				description: (title) =>
					`Similar books, same author, country, era, and length near ${title}.`,
			},
		};

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

			const tabMeta = bookTab ? BOOK_TAB_OG[bookTab] : undefined;
			if (tabMeta && rest.length === 1) {
				const tabHighlights = [...highlights];
				if (bookTab === "editions") {
					tabHighlights.unshift("Open Library");
					if (book.olid) {
						const editionCount = await fetchWorkEditionTotalCount(book.olid);
						if (editionCount != null && editionCount > 0) {
							tabHighlights.push(formatCount("edition", editionCount));
						}
					} else {
						tabHighlights.push("No work OLID");
					}
				}

				return {
					kind: "Book",
					title: `${book.title} · ${tabMeta.label}`,
					description: truncateDescription(tabMeta.description(book.title)),
					highlights: tabHighlights,
				};
			}

			if (rest.length > 0) {
				return {
					kind: "Book",
					title: book.title,
					description: truncateDescription(
						book.excerpt?.trim() ||
							`In the BBRC library · first published ${book.publishedIn ?? "—"}`,
					),
					highlights,
				};
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
			if (post.attachment) {
				highlights.unshift(postAttachmentLabel(post.attachment));
			}
			if (post.editedAt) {
				highlights.push("Edited");
			}

			const attachmentTitle = post.attachment
				? postAttachmentLabel(post.attachment)
				: null;
			const postContext = attachmentTitle
				? `@${post.author.username} · ${attachmentTitle}`
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
		if (rest[0] === "shelves") {
			const shelfSegments = rest.slice(1);

			if (shelfSegments[0] === "new") {
				try {
					const user = await getUserByUsername({ username: slug }, db);
					return {
						kind: "Shelf",
						title: "New shelf",
						description: `Create a reading list · ${user.name}`,
						highlights: [`@${user.username}`],
					};
				} catch {
					return {
						kind: "Shelf",
						title: "New shelf",
						description: DEFAULT_DESCRIPTION,
					};
				}
			}

			if (!shelfSegments[0]) {
				try {
					const user = await getUserByUsername({ username: slug }, db);
					const [activeCount, totalCount] = await Promise.all([
						db.shelf.count({
							where: { user: { username: slug }, status: "active" },
						}),
						db.shelf.count({ where: { user: { username: slug } } }),
					]);

					return {
						kind: "Shelves",
						title: `${user.name} · Shelves`,
						description: `${formatCount("public list", activeCount)}${totalCount > activeCount ? ` · ${totalCount} total` : ""}`,
						highlights: [`@${user.username}`],
					};
				} catch {
					return {
						kind: "Shelves",
						title: "Shelves",
						description: DEFAULT_DESCRIPTION,
					};
				}
			}

			const shelfSlug = shelfSegments[0];
			if (shelfSegments[1] === "edit") {
				try {
					const shelf = await getShelfBySlug(slug, shelfSlug, null, db);
					return {
						kind: "Shelf",
						title: `Edit · ${shelf.title}`,
						description: "Update shelf settings",
						highlights: [shelf.status, formatCount("book", shelf.bookCount)],
					};
				} catch {
					return {
						kind: "Shelf",
						title: "Edit shelf",
						description: DEFAULT_DESCRIPTION,
					};
				}
			}

			try {
				const [user, shelf] = await Promise.all([
					getUserByUsername({ username: slug }, db),
					getShelfBySlug(slug, shelfSlug, null, db),
				]);

				const highlights = [
					`@${user.username}`,
					formatCount("book", shelf.bookCount),
					shelf.type === "ordered" ? "Ranked list" : "Simple list",
				];
				if (shelf.status !== "active") {
					highlights.push(shelf.status);
				}

				return {
					kind: "Shelf",
					title: shelf.title,
					description: truncateOgLine(
						shelf.description?.trim() || `${user.name}'s reading list on BBRC`,
						140,
					),
					highlights,
				};
			} catch {
				return {
					kind: "Shelf",
					title: "Shelf not found",
					description: DEFAULT_DESCRIPTION,
				};
			}
		}

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

		if (rest[0] === "stats") {
			try {
				const user = await getUserByUsername({ username: slug }, db);
				const [datedReads, totalReads] = await Promise.all([
					db.read.count({
						where: {
							user: { username: slug },
							readEndMonth: { not: null },
							readEndYear: { not: null },
						},
					}),
					db.read.count({ where: { user: { username: slug } } }),
				]);

				const highlights = [
					`@${user.username}`,
					formatCount("dated read", datedReads),
				];
				if (totalReads > datedReads) {
					highlights.push(formatCount("read", totalReads));
				}

				return {
					kind: "Reading stats",
					title: `${user.name} · Stats`,
					description: truncateOgLine(
						"Books read, pace, ratings, subjects, world map, and club activity",
						140,
					),
					highlights,
				};
			} catch {
				return {
					kind: "Reading stats",
					title: "Reading stats",
					description: DEFAULT_DESCRIPTION,
				};
			}
		}

		if (rest[0] === "goals") {
			const goalSlug = rest[1];

			if (!goalSlug) {
				try {
					const user = await getUserByUsername({ username: slug }, db);
					const goalCount = await db.goal.count({
						where: { user: { username: slug } },
					});

					return {
						kind: "Goals",
						title: `${user.name} · Reading goals`,
						description: truncateOgLine(
							goalCount > 0
								? `${formatCount("yearly goal", goalCount)} · progress from finished reads`
								: "Yearly reading targets on BBRC",
							140,
						),
						highlights: [`@${user.username}`],
					};
				} catch {
					return {
						kind: "Goals",
						title: "Reading goals",
						description: DEFAULT_DESCRIPTION,
					};
				}
			}

			try {
				const [user, goal] = await Promise.all([
					getUserByUsername({ username: slug }, db),
					getGoalBySlug(slug, goalSlug, null, db),
				]);

				const highlights = [
					`@${user.username}`,
					`${goal.current}/${goal.target} books`,
					String(goal.year),
				];
				if (goal.isComplete) {
					highlights.push("Complete");
				} else if (goal.isExpired) {
					highlights.push("Expired");
				}

				return {
					kind: "Goal",
					title: goal.title,
					description: truncateOgLine(
						goal.description?.trim() ||
							`${goal.current} of ${goal.target} books in ${goal.year}`,
						140,
					),
					highlights,
				};
			} catch {
				return {
					kind: "Goal",
					title: "Goal not found",
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
						: `Final totals · ${sitting.displayName}`,
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
					description: `${formatCount("member", sitting.participants.length)} on ${sitting.displayName}`,
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

			const title = sitting.displayName;

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
