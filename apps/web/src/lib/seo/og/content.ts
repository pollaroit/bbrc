import { fetchWorkEditionTotalCount } from "@bbrc/api/lib/open-library/work-editions";
import { getAuthorPage } from "@bbrc/api/modules/author/author.service";
import { loadAuthorCatalog } from "@bbrc/api/modules/author/author-catalog";
import { getBookBySlug } from "@bbrc/api/modules/book/book.service";
import { getCommentBySlug } from "@bbrc/api/modules/comment/comment.service";
import { getFeedbackBySlug } from "@bbrc/api/modules/feedback/feedback.service";
import {
	getGoalBySlug,
	listGoalsByUsername,
} from "@bbrc/api/modules/goal/goal.service";
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
import { contentPlainText, formatSittingSlugLabel } from "@bbrc/shared";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { parseLeaderboardPathname } from "@/lib/leaderboard/paths";
import { postAttachmentLabel } from "@/lib/post-attachment-label";
import { DEFAULT_DESCRIPTION } from "@/lib/seo/site";
import { db } from "@/services";
import {
	formatOgClubDateTime,
	formatOgDate,
	truncateAtWord,
	truncateOgLine,
} from "./helpers";
import { ogImageData, ogImagesData } from "./images";
import type { OgFact, OgImageContent } from "./template";

const anonymousSession = null;

const num = (value: number) => value.toLocaleString("en-US");

function fact(
	label: string,
	value: string,
	meter?: OgFact["meter"],
	hint?: string,
): OgFact {
	return { label, value, meter, hint };
}

const rating = (value: number): OgFact["meter"] => ({ kind: "rating", value });
const outOfFive = (value: number) => `${value.toFixed(1)} / 5`;

/** Turns a markdown/HTML-ish description into plain prose. */
function stripMarkdown(text: string): string {
	return text
		.replace(/<br\s*\/?>/gi, " ")
		.replace(/<[^>]+>/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
		.replace(/\[\d+\]/g, "")
		.replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
		.replace(/^[-=_*]{3,}\s*$/gm, " ")
		.replace(/(\*\*|__|\*|_|`)/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

/** Plain text from stored rich content, never the raw JSON. */
function plain(raw: string | null | undefined, max = 170): string {
	return raw ? truncateAtWord(contentPlainText(raw), max) : "";
}

function notFound(kind: string, what: string): OgImageContent {
	return { kind, title: `${what} not found`, body: DEFAULT_DESCRIPTION };
}

async function coverMedia(coverId: number | null | undefined) {
	// Some covers only exist in the medium size.
	const src =
		(await ogImageData(bookCoverUrl(coverId, "L"))) ??
		(await ogImageData(bookCoverUrl(coverId, "M")));
	return src ? ({ kind: "cover", src } as const) : undefined;
}

async function coversMedia(coverIds: (number | null | undefined)[]) {
	const srcs = await ogImagesData(
		coverIds.slice(0, 6).map((id) => bookCoverUrl(id, "M")),
	);
	return srcs.length > 0 ? ({ kind: "covers", srcs } as const) : undefined;
}

async function avatarMedia(user: { image?: string | null; name: string }) {
	return {
		kind: "avatar",
		src: await ogImageData(user.image),
		initial: user.name,
	} as const;
}

const STATIC_PAGES: Record<string, OgImageContent> = {
	"": {
		kind: "Home",
		title: "Club feed",
		body: "Activity, sittings, and reading progress at BBRC.",
	},
	"books/new": {
		kind: "Library",
		title: "Add a book",
		body: "Add a book to the BBRC library from Open Library.",
	},
	"sittings/new": {
		kind: "Sittings",
		title: "Start a sitting",
		body: "Pick the members, set the poll, and draw books to vote on.",
	},
	settings: {
		kind: "Settings",
		title: "Settings",
		body: "Account preferences.",
	},
	"settings/notifications": {
		kind: "Settings",
		title: "Notifications",
		body: "In-app alerts and phone push via ntfy.",
	},
	"sign-in": {
		kind: "Account",
		title: "Sign in",
		body: "Sign in to your BBRC account.",
	},
	"sign-up": {
		kind: "Account",
		title: "Sign up",
		body: "Create a BBRC account.",
	},
};

// ---------------------------------------------------------------------------
// Index pages
// ---------------------------------------------------------------------------

async function resolveBooksRequestOg(): Promise<OgImageContent> {
	const [pending, total] = await Promise.all([
		db.bookRequest.count({ where: { status: "pending" } }),
		db.bookRequest.count(),
	]);

	return {
		kind: "Library",
		title: "Request a book",
		body: "Suggest a work for the club catalog. Admins review requests and add titles.",
		facts: [
			fact("Pending", num(pending)),
			fact("All requests", num(total)),
			fact("Source", "Open Library"),
		],
	};
}

async function resolveBooksListOg(): Promise<OgImageContent> {
	const [books, rated, reviews, recent] = await Promise.all([
		db.book.count(),
		db.book.count({ where: { averageRating: { not: null } } }),
		db.feedback.count(),
		db.book.findMany({
			orderBy: { createdAt: "desc" },
			take: 6,
			select: { coverId: true },
		}),
	]);

	return {
		kind: "Library",
		title: "Our booklist",
		body: "Every title the club has picked, read, rated and reviewed.",
		media: await coversMedia(recent.map((row) => row.coverId)),
		facts: [
			fact("Titles", num(books)),
			fact("Club-rated", num(rated)),
			fact("Reviews", num(reviews)),
		],
	};
}

async function resolveShelvesListOg(): Promise<OgImageContent> {
	const [shelves, listed, curators] = await Promise.all([
		db.shelf.count({ where: { status: "active" } }),
		db.shelfBook.count({ where: { shelf: { status: "active" } } }),
		db.user.count({ where: { shelves: { some: { status: "active" } } } }),
	]);

	return {
		kind: "Shelves",
		title: "Member shelves",
		body: "Public reading lists curated by club members.",
		facts: [
			fact("Public lists", num(shelves)),
			fact("Books listed", num(listed)),
			fact("Curators", num(curators)),
		],
	};
}

async function resolveSittingsListOg(): Promise<OgImageContent> {
	const [total, active, finished] = await Promise.all([
		db.sitting.count(),
		db.sitting.count({ where: { status: { in: ["voting", "reading"] } } }),
		db.sitting.count({ where: { status: "finished" } }),
	]);

	return {
		kind: "Sittings",
		title: "Reading rounds",
		body: "Vote on the next book, read it together, and share what you thought.",
		badge: active > 0 ? `${active} active` : undefined,
		facts: [
			fact("Sittings", num(total)),
			fact("Active now", num(active)),
			fact("Finished", num(finished)),
		],
	};
}

async function resolveLeaderboardHubOg(
	period: LeaderboardPeriod = "month",
): Promise<OgImageContent> {
	const snapshot = await getLeaderboardOgSnapshot("xp", db, period);
	const periodLabel = LEADERBOARD_PERIOD_META[period].label;

	return {
		kind: "Leaderboard",
		title: "Leaderboards",
		subtitle: periodLabel,
		body: "Five boards: XP, RP, reads, posts and sittings. Ties share a place.",
		facts: [
			fact("Members ranked", num(snapshot.memberCount)),
			fact("XP leader", snapshot.leaderName),
			fact("Leader XP", num(snapshot.leaderMetric)),
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
		title: meta.title,
		subtitle: periodLabel,
		body: meta.description,
		facts: [
			fact("Members ranked", num(snapshot.memberCount)),
			fact(
				"Leader",
				snapshot.leaderMetric > 0 ? snapshot.leaderName : "None yet",
			),
			fact(meta.metricLabel, num(snapshot.leaderMetric)),
		],
	};
}

async function resolveSeriesListOg(): Promise<OgImageContent> {
	const [series, volumes] = await Promise.all([
		db.series.count(),
		db.seriesBook.count(),
	]);

	return {
		kind: "Series",
		title: "Reading series",
		body: "Club-curated reading order for multi-volume works, numbered from the first book.",
		facts: [fact("Series", num(series)), fact("Volumes", num(volumes))],
	};
}

async function resolveAuthorsListOg(): Promise<OgImageContent> {
	const [catalog, books, reviews] = await Promise.all([
		loadAuthorCatalog(db),
		db.book.count(),
		db.feedback.count(),
	]);
	const rated = catalog.filter((entry) => entry.averageRating != null).length;

	return {
		kind: "Authors",
		title: "Authors",
		body: "Browse writers in the catalog by country, reads, reviews and club rating.",
		facts: [
			fact("Writers", num(catalog.length)),
			fact("Books", num(books)),
			fact("Reviews", num(reviews)),
			fact("Club-rated", num(rated)),
		],
	};
}

async function resolveMembersListOg(): Promise<OgImageContent> {
	const [members, admins, reads] = await Promise.all([
		db.user.count(),
		db.user.count({ where: { isAdmin: true } }),
		db.read.count(),
	]);

	return {
		kind: "Members",
		title: "The brigade",
		body: "Everyone in the club, with XP, reading points and reading history.",
		facts: [
			fact("Members", num(members)),
			fact("Admins", num(admins)),
			fact("Reads logged", num(reads)),
		],
	};
}

// ---------------------------------------------------------------------------
// Books, authors, series
// ---------------------------------------------------------------------------

const BOOK_TAB_OG: Record<
	string,
	{ label: string; description: (title: string) => string }
> = {
	about: {
		label: "About",
		description: (title) =>
			`Excerpt, subjects and catalog details for ${title}.`,
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
			`Open Library editions of ${title}: covers, publishers and dates.`,
	},
	favorites: {
		label: "Favorites",
		description: (title) => `Members who picked ${title} as a favorite.`,
	},
	quizzes: {
		label: "Quizzes",
		description: (title) => `How members scored on the ${title} quiz.`,
	},
	more: {
		label: "More to read",
		description: (title) =>
			`Similar books, same author, country, era and length near ${title}.`,
	},
};

/** The fourth card changes with the tab: each page gets the figure that fits it. */
async function bookTabFact(
	tab: string | undefined,
	book: { slug: string; authors: string[]; olid: string | null },
	reviewCount: number,
): Promise<OgFact | null> {
	const where = { book: { slug: book.slug } };

	switch (tab) {
		case "documents": {
			const count = await db.document.count({
				where: { ...where, status: "approved" },
			});
			return fact("Documents", num(count));
		}
		case "shelves": {
			const count = await db.shelfBook.count({
				where: { ...where, shelf: { status: "active" } },
			});
			return fact("On shelves", num(count));
		}
		case "reads": {
			const count = await db.read.count({ where });
			return fact("Reads", num(count));
		}
		case "favorites": {
			const count = await db.favorite.count({ where });
			return fact("Favorites", num(count));
		}
		case "quizzes": {
			const count = await db.quizSubmission.count({
				where: { status: "submitted", quiz: { book: { slug: book.slug } } },
			});
			return fact("Quiz scores", num(count));
		}
		case "editions": {
			if (!book.olid) return null;
			const editions = await fetchWorkEditionTotalCount(book.olid);
			return editions != null && editions > 0
				? fact("Editions", num(editions))
				: null;
		}
		case "more": {
			const others = await db.book.count({
				where: { authors: { hasSome: book.authors }, slug: { not: book.slug } },
			});
			return fact("More by author", num(others));
		}
		default:
			return fact("Reviews", num(reviewCount));
	}
}

async function resolveBookOg(
	slug: string,
	tab?: string,
	tabIsLeaf = true,
): Promise<OgImageContent> {
	try {
		const book = await getBookBySlug(slug, db);
		const [reviewCount, media] = await Promise.all([
			db.feedback.count({ where: { book: { slug } } }),
			coverMedia(book.coverId),
		]);
		const tabMeta = tab && tabIsLeaf ? BOOK_TAB_OG[tab] : undefined;
		const fourth =
			(await bookTabFact(tabMeta ? tab : undefined, book, reviewCount)) ??
			fact("Reviews", num(reviewCount));

		const facts: OgFact[] = [];
		if (book.averageRating != null) {
			facts.push(
				fact(
					"Club rating",
					outOfFive(book.averageRating),
					rating(book.averageRating),
				),
			);
		} else if (book.openLibraryRating != null) {
			facts.push(
				fact(
					"Open Library",
					outOfFive(book.openLibraryRating),
					rating(book.openLibraryRating),
				),
			);
		}
		const length = [
			book.pages ? `${num(book.pages)} p` : null,
			book.publishedIn ? String(book.publishedIn) : null,
		].filter((part): part is string => part != null);
		if (length.length > 0) {
			facts.push(fact("Length · Published", length.join(" · ")));
		}
		facts.push(fourth);

		const description = stripMarkdown(book.excerpt ?? "");

		return {
			kind: "Book",
			title: book.title,
			subtitle: formatBookAuthors(book.authors),
			body: tabMeta
				? tabMeta.description(book.title)
				: truncateAtWord(
						description ||
							"In the BBRC library, with member reviews and reads.",
						220,
					),
			badge: tabMeta?.label ?? book.status.replaceAll("_", " "),
			media,
			facts: facts.slice(0, 4),
		};
	} catch {
		return notFound("Book", "Book");
	}
}

async function resolveAuthorDetailOg(slug: string): Promise<OgImageContent> {
	const author = await getAuthorPage(slug, db);
	const by = { authors: { has: author.name } };
	const onBook = { book: by };

	const [books, reads, readers, reviews] = await Promise.all([
		db.book.findMany({
			where: by,
			orderBy: { createdAt: "desc" },
			select: { pages: true, coverId: true },
		}),
		db.read.count({ where: onBook }),
		db.read.findMany({
			where: onBook,
			distinct: ["userId"],
			select: { userId: true },
		}),
		db.feedback.aggregate({
			where: onBook,
			_avg: { rating: true },
			_count: { _all: true },
		}),
	]);

	const pages = books.reduce((sum, row) => sum + (row.pages ?? 0), 0);
	const average = reviews._avg.rating;
	const perBook = books.length > 0 ? reads / books.length : 0;

	return {
		kind: "Author",
		title: author.name,
		subtitle: `${author.bookCount} ${author.bookCount === 1 ? "book" : "books"} in the catalog`,
		body: "Club reads, reviews and related authors.",
		media: await coversMedia(books.map((row) => row.coverId)),
		facts: [
			fact("Total pages", num(pages)),
			average != null
				? fact(
						"Avg rating",
						outOfFive(average),
						rating(average),
						`from ${num(reviews._count._all)} ${reviews._count._all === 1 ? "review" : "reviews"}`,
					)
				: fact("Avg rating", "No reviews"),
			fact("Readers", num(readers.length)),
			fact(
				"Total reads",
				num(reads),
				undefined,
				`${perBook.toFixed(1)} per book`,
			),
		],
	};
}

async function resolveSeriesDetailOg(slug: string): Promise<OgImageContent> {
	const series = await getSeriesBySlug(slug, db);
	const first = series.books[0]?.book;
	const volumes = await db.book.findMany({
		where: { seriesMembership: { series: { slug } } },
		select: { pages: true, averageRating: true },
	});

	const pages = volumes.reduce((sum, row) => sum + (row.pages ?? 0), 0);
	const rated = volumes.filter((row) => row.averageRating != null);
	const average =
		rated.length > 0
			? rated.reduce((sum, row) => sum + (row.averageRating ?? 0), 0) /
				rated.length
			: null;

	const facts: OgFact[] = [
		fact("Volumes", num(series.bookCount)),
		fact("Total pages", num(pages)),
	];
	if (average != null) {
		facts.push(
			fact(
				"Club rating",
				outOfFive(average),
				rating(average),
				`${rated.length} of ${volumes.length} rated`,
			),
		);
	}

	return {
		kind: "Series",
		title: series.title,
		subtitle: first ? formatBookAuthors(first.authors) : undefined,
		body: truncateAtWord(
			series.description?.trim() ||
				"Numbered club reading order, from the first volume on.",
			200,
		),
		media: await coversMedia(series.books.map((entry) => entry.book.coverId)),
		facts,
	};
}

// ---------------------------------------------------------------------------
// Posts, comments, reviews
// ---------------------------------------------------------------------------

async function resolvePostOg(slug: string): Promise<OgImageContent> {
	try {
		const post = await getPostBySlug(slug, db, anonymousSession);
		const photo = await ogImageData(post.imageUrl);
		const media = photo
			? ({ kind: "photo", src: photo } as const)
			: await avatarMedia(post.author);
		const attachment = post.attachment
			? postAttachmentLabel(post.attachment)
			: null;

		return {
			kind: "Post",
			title: post.author.name,
			subtitle: attachment
				? `@${post.author.username} · ${attachment}`
				: `@${post.author.username}`,
			body: plain(post.content) || "Shared an update with the club.",
			media,
			facts: [
				fact("Likes", num(post.likeCount)),
				fact("Comments", num(post.commentCount)),
				fact("Posted", formatOgDate(post.createdAt)),
			],
		};
	} catch {
		return notFound("Post", "Post");
	}
}

async function resolveCommentOg(args: {
	commentSlug: string;
	expect: { postSlug?: string; feedbackSlug?: string; bookSlug?: string };
}): Promise<OgImageContent> {
	try {
		const comment = await getCommentBySlug(
			args.commentSlug,
			db,
			anonymousSession,
		);
		if (
			(args.expect.postSlug && comment.postSlug !== args.expect.postSlug) ||
			(args.expect.feedbackSlug &&
				comment.feedbackSlug !== args.expect.feedbackSlug) ||
			(args.expect.bookSlug && comment.bookSlug !== args.expect.bookSlug)
		) {
			return notFound("Comment", "Comment");
		}

		let context = "a comment";
		let media: OgImageContent["media"];

		if (comment.postSlug) {
			const post = await getPostBySlug(comment.postSlug, db, anonymousSession);
			context = `on ${post.author.name}'s post`;
		} else if (comment.feedbackSlug) {
			const feedback = await getFeedbackBySlug(
				comment.feedbackSlug,
				db,
				anonymousSession,
			);
			context = `on a review of ${feedback.bookTitle}`;
			const book = await getBookBySlug(feedback.bookSlug, db);
			media = await coverMedia(book.coverId);
		}

		const photo = await ogImageData(comment.imageUrl);
		if (photo) {
			media = { kind: "photo", src: photo };
		}
		media ??= await avatarMedia(comment.author);

		return {
			kind: "Comment",
			title: comment.author.name,
			subtitle: `@${comment.author.username} · ${context}`,
			body: plain(comment.content) || "Left a comment.",
			media,
			facts: [
				fact("Likes", num(comment.likeCount)),
				fact("Replies", num(comment.replyCount)),
				fact("Posted", formatOgDate(comment.createdAt)),
			],
		};
	} catch {
		return notFound("Comment", "Comment");
	}
}

async function resolveReviewOg(
	bookSlug: string,
	feedbackSlug: string,
): Promise<OgImageContent> {
	try {
		const feedback = await getFeedbackBySlug(
			feedbackSlug,
			db,
			anonymousSession,
		);
		if (feedback.bookSlug !== bookSlug) {
			return notFound("Review", "Review");
		}
		const book = await getBookBySlug(bookSlug, db);

		return {
			kind: "Review",
			title: feedback.author.name,
			subtitle: `@${feedback.author.username} · ${feedback.bookTitle}`,
			body:
				plain(feedback.review) || "Rated this book without a written review.",
			media: await coverMedia(book.coverId),
			facts: [
				fact("Rating", `${feedback.rating.toFixed(1)} / 5`, {
					kind: "rating",
					value: feedback.rating,
				}),
				fact("Likes", num(feedback.likeCount)),
				fact("Comments", num(feedback.commentCount)),
				fact("Posted", formatOgDate(feedback.createdAt)),
			],
		};
	} catch {
		return notFound("Review", "Review");
	}
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

type MemberSection =
	| "overview"
	| "posts"
	| "feedbacks"
	| "stats"
	| "xp"
	| "rp"
	| "shelves"
	| "goals";

const MEMBER_SECTION_BADGE: Record<MemberSection, string | undefined> = {
	overview: undefined,
	posts: "Feed",
	feedbacks: "Reviews",
	stats: "Reading stats",
	xp: "Experience",
	rp: "Reading points",
	shelves: "Shelves",
	goals: "Goals",
};

async function resolveMemberOg(
	username: string,
	section: MemberSection,
): Promise<OgImageContent> {
	try {
		const user = await getUserByUsername({ username }, db);
		const byUser = { user: { username } };
		const [
			posts,
			comments,
			reviews,
			givenRatings,
			readRows,
			sittings,
			shelves,
			goalList,
		] = await Promise.all([
			db.post.count({ where: { author: { username } } }),
			db.comment.count({ where: { author: { username } } }),
			db.feedback.count({ where: { author: { username } } }),
			db.feedback.aggregate({
				where: { author: { username } },
				_avg: { rating: true },
			}),
			db.read.findMany({
				where: byUser,
				select: { book: { select: { pages: true } } },
			}),
			db.participation.count({ where: byUser }),
			db.shelf.count({ where: { ...byUser, status: "active" } }),
			listGoalsByUsername(username, null, db),
		]);

		const reads = readRows.length;
		const pagesRead = readRows.reduce(
			(sum, row) => sum + (row.book.pages ?? 0),
			0,
		);
		const avgGiven = givenRatings._avg.rating;
		const goals = goalList.items.length;
		const goalsDone = goalList.items.filter((item) => item.isComplete).length;
		const goalsActive = goalList.active.length;

		const bio = plain(user.profile.bio, 160);
		const levels = `${user.xpLevel.label} · ${user.rpLevel.label}`;
		const givenFact =
			avgGiven != null
				? fact("Avg rating given", outOfFive(avgGiven), rating(avgGiven))
				: fact("Avg rating given", "No ratings");

		const facts: Record<MemberSection, OgFact[]> = {
			overview: [
				fact("XP", num(user.xp)),
				fact("RP", num(user.rp)),
				fact("Reads", num(reads)),
				fact("Sittings", num(sittings)),
			],
			posts: [
				fact("Posts", num(posts)),
				fact("Comments", num(comments)),
				fact("XP", num(user.xp)),
			],
			feedbacks: [
				fact("Reviews", num(reviews)),
				givenFact,
				fact("Reads", num(reads)),
			],
			stats: [
				fact("Books read", num(reads)),
				fact("Pages read", num(pagesRead)),
				givenFact,
				fact(
					"Best streak",
					`${user.readingStreak.best} ${user.readingStreak.best === 1 ? "sitting" : "sittings"}`,
					undefined,
					`now ${user.readingStreak.current}`,
				),
			],
			xp: [
				fact("XP", num(user.xp)),
				fact("Level", user.xpLevel.label),
				fact("Posts", num(posts)),
			],
			rp: [
				fact("RP", num(user.rp)),
				fact("Level", user.rpLevel.label),
				fact("Sittings", num(sittings)),
			],
			shelves: [
				fact("Public shelves", num(shelves)),
				fact("Reads", num(reads)),
			],
			goals: [
				fact("Goals", num(goals)),
				fact("Completed", num(goalsDone)),
				fact("In progress", num(goalsActive)),
			],
		};

		const statsLine = `${num(reviews)} ${reviews === 1 ? "review" : "reviews"} · ${num(sittings)} ${sittings === 1 ? "sitting" : "sittings"} · ${num(shelves)} ${shelves === 1 ? "shelf" : "shelves"}`;

		return {
			kind: "Member",
			title: user.name,
			subtitle:
				section === "overview"
					? `@${user.username} · ${levels}`
					: `@${user.username}`,
			body:
				section === "overview" && bio
					? bio
					: section === "stats"
						? statsLine
						: undefined,
			badge:
				MEMBER_SECTION_BADGE[section] ?? (user.isAdmin ? "Admin" : undefined),
			media: await avatarMedia(user),
			facts: facts[section],
		};
	} catch {
		return notFound("Member", "Member");
	}
}

async function resolveShelfOg(
	username: string,
	shelfSlug: string,
	edit: boolean,
): Promise<OgImageContent> {
	try {
		const [user, shelf] = await Promise.all([
			getUserByUsername({ username }, db),
			getShelfBySlug(username, shelfSlug, null, db),
		]);

		return {
			kind: "Shelf",
			title: shelf.title,
			subtitle: `Curated by ${user.name} (@${user.username})`,
			body: truncateOgLine(
				shelf.description?.trim() || "A reading list on BBRC.",
				200,
			),
			badge: edit
				? "Editing"
				: shelf.status !== "active"
					? shelf.status
					: undefined,
			media: await coversMedia(shelf.coverPreviewCoverIds),
			facts: [
				fact("Books", num(shelf.bookCount)),
				fact("Type", shelf.type === "ordered" ? "Ranked" : "Simple"),
				fact("Updated", formatOgDate(shelf.updatedAt)),
			],
		};
	} catch {
		return notFound("Shelf", "Shelf");
	}
}

async function resolveGoalOg(
	username: string,
	goalSlug: string,
): Promise<OgImageContent> {
	try {
		const [user, goal] = await Promise.all([
			getUserByUsername({ username }, db),
			getGoalBySlug(username, goalSlug, null, db),
		]);

		return {
			kind: "Goal",
			title: goal.title,
			subtitle: `${user.name} (@${user.username}) · ${goal.year}`,
			body: truncateOgLine(goal.description?.trim() ?? "", 200) || undefined,
			badge: goal.isComplete
				? "Complete"
				: goal.isExpired
					? "Expired"
					: "In progress",
			media: await avatarMedia(user),
			facts: [
				fact("Progress", `${goal.current} / ${goal.target}`, {
					kind: "progress",
					ratio: goal.target > 0 ? goal.current / goal.target : 0,
				}),
				fact("Year", String(goal.year)),
				fact("Books left", num(Math.max(0, goal.target - goal.current))),
			],
		};
	} catch {
		return notFound("Goal", "Goal");
	}
}

// ---------------------------------------------------------------------------
// Sittings
// ---------------------------------------------------------------------------

async function resolveSittingOg(
	slug: string,
	view: "main" | "vote" | "participants",
): Promise<OgImageContent> {
	try {
		const sitting = await getSittingBySlug(slug, db, anonymousSession);
		const name = formatSittingSlugLabel(sitting.slug);
		const statusLabel = sittingStatusFilterLabels[sitting.status];
		const participants = sitting.participants.length;
		const count = (progress: string) =>
			sitting.participants.filter((p) => p.progress === progress).length;
		const completed = count("completed");
		const book = sitting.selectedBook;
		const isVoting = sitting.status === "voting";
		const poll = sitting.poll;
		const options = poll?.options ?? [];

		// Scores stay hidden from the public while voting is open.
		const ranked = [...options].sort((a, b) => b.pointTotal - a.pointTotal);
		const winner = !isVoting ? ranked[0] : undefined;

		const pollMedia = await coversMedia(
			(isVoting ? options : ranked).map((option) => option.book.coverId),
		);
		const bookMedia = book ? await coverMedia(book.coverId) : undefined;

		if (view === "vote") {
			if (!poll) {
				return notFound("Poll", "Poll");
			}
			const picks =
				poll.minChoices === (poll.maxChoices ?? poll.take)
					? `${poll.maxChoices ?? poll.take}`
					: `${poll.minChoices}–${poll.maxChoices ?? poll.take}`;

			return {
				kind: "Poll",
				title: isVoting ? "Pick the next read" : "Voting results",
				subtitle: name,
				body: isVoting
					? "Choose from the drawn books. Totals stay hidden until voting closes."
					: winner
						? `The club chose ${winner.book.title}.`
						: "Voting has closed.",
				badge: isVoting ? "Voting open" : "Voting closed",
				media: pollMedia,
				facts: isVoting
					? [
							fact("Voted", `${poll.voterCount} of ${participants}`),
							fact("Books", num(options.length)),
							fact("Picks each", picks),
							fact("Closes", formatOgClubDateTime(poll.deadline)),
						]
					: [
							fact("Voted", `${poll.voterCount} of ${participants}`),
							fact("Books", num(options.length)),
							fact("Winner", winner?.book.title ?? "—"),
							fact("Winning points", winner ? `${winner.pointTotal} pts` : "—"),
						],
			};
		}

		if (view === "participants") {
			return {
				kind: "Sitting",
				title: name,
				subtitle: "Participants",
				body: book
					? `Reading ${book.title}.`
					: "Members taking part in this round.",
				badge: statusLabel,
				media: bookMedia ?? pollMedia,
				facts: [
					fact("Members", num(participants)),
					fact("Finished", `${completed} of ${participants}`, {
						kind: "progress",
						ratio: participants > 0 ? completed / participants : 0,
					}),
					fact("Reading", num(count("in_progress"))),
					fact("Not started", num(count("not_started"))),
				],
			};
		}

		const facts: OgFact[] = [fact("Participants", num(participants))];
		if (isVoting) {
			facts.push(
				fact("Books on poll", num(options.length)),
				fact("Voted", poll ? `${poll.voterCount} of ${participants}` : "—"),
				fact(
					"Voting closes",
					formatOgClubDateTime(poll?.deadline ?? sitting.deadline),
				),
			);
		} else {
			facts.push(
				fact("Finished", `${completed} of ${participants}`, {
					kind: "progress",
					ratio: participants > 0 ? completed / participants : 0,
				}),
				fact(
					sitting.status === "finished" ? "Ended" : "Reading ends",
					formatOgClubDateTime(sitting.deadline),
				),
				sitting.stats.averageRating != null
					? fact(
							"Avg rating",
							`${sitting.stats.averageRating.toFixed(1)} / 5`,
							{
								kind: "rating",
								value: sitting.stats.averageRating,
							},
						)
					: fact("Reviews", num(sitting.stats.reviewCount)),
			);
		}

		return {
			kind: "Sitting",
			title: name,
			subtitle: book
				? `${book.title} · ${formatBookAuthors(book.authors)}`
				: isVoting
					? "Book poll"
					: undefined,
			body: book
				? undefined
				: isVoting
					? "Members are voting on which book the club reads next."
					: undefined,
			badge: statusLabel,
			media: bookMedia ?? pollMedia,
			facts,
		};
	} catch {
		return notFound("Sitting", "Sitting");
	}
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export async function resolveOgImageContent(
	pathSegments: string[],
): Promise<OgImageContent> {
	if (pathSegments.length === 0) {
		return STATIC_PAGES[""] as OgImageContent;
	}

	const staticKey = pathSegments.join("/");

	if (staticKey === "books") return resolveBooksListOg();
	if (staticKey === "books/request") return resolveBooksRequestOg();
	if (staticKey === "shelves") return resolveShelvesListOg();
	if (staticKey === "sittings") return resolveSittingsListOg();
	if (staticKey === "series") return resolveSeriesListOg();
	if (staticKey === "users") return resolveMembersListOg();
	if (staticKey === "authors") return resolveAuthorsListOg();
	if (staticKey === "leaderboard" || staticKey.startsWith("leaderboard/")) {
		const route = parseLeaderboardPathname(`/${staticKey}`);
		return route.kind == null
			? resolveLeaderboardHubOg(route.period)
			: resolveLeaderboardKindOg(route.kind, route.period);
	}

	const staticPage = STATIC_PAGES[staticKey];
	if (staticPage) return staticPage;

	const [section, slug, ...rest] = pathSegments;

	if (!slug) {
		return {
			title: section ?? "BBRC",
			body: DEFAULT_DESCRIPTION,
		};
	}

	if (section === "series" && rest.length === 0) {
		return resolveSeriesDetailOg(slug).catch(() =>
			notFound("Series", "Series"),
		);
	}

	if (section === "authors" && rest.length === 0) {
		return resolveAuthorDetailOg(slug).catch(() =>
			notFound("Author", "Author"),
		);
	}

	if (section === "books") {
		if (
			rest[0] === "feedbacks" &&
			rest[1] &&
			rest[2] === "comments" &&
			rest[3]
		) {
			return resolveCommentOg({
				commentSlug: rest[3],
				expect: { bookSlug: slug, feedbackSlug: rest[1] },
			});
		}
		if (rest[0] === "feedbacks" && rest[1]) {
			return resolveReviewOg(slug, rest[1]);
		}
		if (rest[0] === "edit") {
			const base = await resolveBookOg(slug);
			return { ...base, badge: "Editing" };
		}
		if (rest[0] === "quiz") {
			const base = await resolveBookOg(slug);
			return {
				...base,
				subtitle: base.subtitle,
				body: "A five-question quiz on the story, harder with every question.",
				badge: rest[1] === "results" ? "Quiz results" : "Quiz",
			};
		}
		return resolveBookOg(slug, rest[0], rest.length === 1);
	}

	if (section === "posts") {
		if (rest[0] === "comments" && rest[1]) {
			return resolveCommentOg({
				commentSlug: rest[1],
				expect: { postSlug: slug },
			});
		}
		return resolvePostOg(slug);
	}

	if (section === "users") {
		if (rest[0] === "shelves") {
			const shelfSlug = rest[1];
			if (!shelfSlug) return resolveMemberOg(slug, "shelves");
			if (shelfSlug === "new") return resolveMemberOg(slug, "shelves");
			return resolveShelfOg(slug, shelfSlug, rest[2] === "edit");
		}
		if (rest[0] === "goals" && rest[1]) {
			return resolveGoalOg(slug, rest[1]);
		}
		const sections: Record<string, MemberSection> = {
			posts: "posts",
			feedbacks: "feedbacks",
			stats: "stats",
			xp: "xp",
			rp: "rp",
			goals: "goals",
		};
		return resolveMemberOg(slug, sections[rest[0] ?? ""] ?? "overview");
	}

	if (section === "sittings") {
		const view =
			rest[0] === "vote"
				? "vote"
				: rest[0] === "participants"
					? "participants"
					: "main";
		return resolveSittingOg(slug, view);
	}

	return { title: pathSegments.join(" / "), body: DEFAULT_DESCRIPTION };
}
