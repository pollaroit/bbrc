import type { Database } from "@bbrc/db";
import {
	type AchievementFacts,
	bookAuthorEntries,
	type FactSection,
	type GoalFact,
	goalScopeFromStored,
	readCountsTowardGoal,
	resolveClubTimeZone,
} from "@bbrc/shared";
import { QUIZ_MAX_SCORE } from "../quiz/quiz-scoring";

const MIDMONTH_DAY = 15;

function emptyFacts(
	now: Date,
	user: { createdAt: Date; joinRank: number; image: string | null },
): AchievementFacts {
	return {
		now,
		timeZone: resolveClubTimeZone(),
		user: {
			createdAt: user.createdAt,
			joinRank: user.joinRank,
			hasAvatar: Boolean(user.image),
		},
		profile: null,
		reads: [],
		firstReadBookIds: [],
		feedbacks: [],
		posts: [],
		commentTimes: [],
		likesReceived: [],
		participations: [],
		votes: [],
		goals: [],
		shelves: [],
		documentTimes: [],
		requestedBookTimes: [],
		favoriteTimes: [],
		quizzes: [],
		series: [],
		views: { mostOpenedPost: null, mostOpenedReview: null, profileOpens: null },
		reading: {
			onTimeFinishes: [],
			longestStreak: null,
			sessionSeconds: 0,
			wishlistSize: 0,
			wishlistAt: null,
		},
	};
}

/**
 * Snapshot of what one member has done, for the pure evaluator. Only the
 * sections asked for are loaded; the rest stay empty.
 */
export async function loadAchievementFacts(
	db: Database,
	userId: string,
	sections: ReadonlySet<FactSection>,
	now = new Date(),
): Promise<AchievementFacts | null> {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { createdAt: true, image: true, status: true },
	});
	if (!user) {
		return null;
	}

	const joinRank =
		sections.has("club") || sections.size === 0
			? (await db.user.count({
					where: { createdAt: { lt: user.createdAt } },
				})) + 1
			: 999_999;
	const facts = emptyFacts(now, {
		createdAt: user.createdAt,
		joinRank,
		image: user.image,
	});
	const want = (section: FactSection) => sections.has(section);

	const tasks: Promise<void>[] = [];

	if (want("reads")) {
		tasks.push(
			(async () => {
				const rows = await db.read.findMany({
					where: { userId },
					select: {
						bookId: true,
						createdAt: true,
						readEndYear: true,
						readEndMonth: true,
						book: {
							select: {
								pages: true,
								publishedIn: true,
								countries: true,
								authors: true,
								authorLinks: {
									orderBy: { position: "asc" },
									select: {
										author: { select: { id: true, slug: true, name: true } },
									},
								},
							},
						},
					},
				});
				facts.reads = rows.map((row) => ({
					bookId: row.bookId,
					at: row.createdAt,
					period:
						row.readEndYear != null && row.readEndMonth != null
							? new Date(
									Date.UTC(row.readEndYear, row.readEndMonth - 1, MIDMONTH_DAY),
								)
							: row.createdAt,
					pages: row.book.pages,
					publishedIn: row.book.publishedIn,
					countries: row.book.countries,
					authors: bookAuthorEntries(row.book).map((author) => author.key),
				}));

				const bookIds = rows.map((row) => row.bookId);
				if (bookIds.length > 0) {
					const series = await db.series.findMany({
						where: { books: { some: { bookId: { in: bookIds } } } },
						select: { id: true, books: { select: { bookId: true } } },
					});
					facts.series = series.map((item) => ({
						id: item.id,
						bookIds: item.books.map((book) => book.bookId),
					}));
				}
			})(),
		);
	}

	if (want("club")) {
		tasks.push(
			(async () => {
				const mine = await db.read.findMany({
					where: { userId },
					select: { bookId: true, createdAt: true },
				});
				if (mine.length > 0) {
					const earliest = await db.read.groupBy({
						by: ["bookId"],
						where: { bookId: { in: mine.map((row) => row.bookId) } },
						_min: { createdAt: true },
					});
					const earliestByBook = new Map(
						earliest.map((row) => [row.bookId, row._min.createdAt?.getTime()]),
					);
					facts.firstReadBookIds = mine
						.filter(
							(row) =>
								earliestByBook.get(row.bookId) === row.createdAt.getTime(),
						)
						.map((row) => row.bookId);
				}

				const likes = await db.like.findMany({
					where: {
						userId: { not: userId },
						OR: [
							{ post: { authorId: userId } },
							{ comment: { authorId: userId } },
							{ feedback: { authorId: userId } },
						],
					},
					select: { createdAt: true },
				});
				facts.likesReceived = likes.map((like) => like.createdAt);
			})(),
		);
	}

	if (want("reviews")) {
		tasks.push(
			(async () => {
				const rows = await db.feedback.findMany({
					where: { authorId: userId },
					select: {
						createdAt: true,
						review: true,
						likes: { select: { createdAt: true } },
					},
				});
				facts.feedbacks = rows.map((row) => ({
					createdAt: row.createdAt,
					length: row.review.trim().length,
					likeTimes: row.likes.map((like) => like.createdAt),
				}));
			})(),
		);
	}

	if (want("posts")) {
		tasks.push(
			(async () => {
				const rows = await db.post.findMany({
					where: { authorId: userId },
					select: {
						createdAt: true,
						comments: { select: { createdAt: true, authorId: true } },
						tierlist: { select: { id: true } },
					},
				});
				facts.posts = rows.map((row) => ({
					createdAt: row.createdAt,
					hasTierlist: row.tierlist != null,
					commentTimes: row.comments
						.filter((comment) => comment.authorId !== userId)
						.map((comment) => comment.createdAt),
				}));
			})(),
		);
	}

	if (want("comments")) {
		tasks.push(
			(async () => {
				const rows = await db.comment.findMany({
					where: { authorId: userId },
					select: { createdAt: true },
				});
				facts.commentTimes = rows.map((row) => row.createdAt);
			})(),
		);
	}

	if (want("sittings")) {
		tasks.push(
			(async () => {
				const rows = await db.participation.findMany({
					where: {
						userId,
						removedAt: null,
						sitting: { status: { in: ["reading", "finished"] } },
					},
					select: {
						progress: true,
						updatedAt: true,
						sitting: { select: { deadline: true } },
					},
				});
				facts.participations = rows.map((row) => ({
					progress: row.progress,
					deadline: row.sitting.deadline,
					completedAt: row.updatedAt,
				}));
			})(),
		);
	}

	if (want("votes")) {
		tasks.push(
			(async () => {
				const rows = await db.pollVote.findMany({
					where: { userId },
					select: {
						createdAt: true,
						option: {
							select: {
								bookId: true,
								poll: {
									select: {
										id: true,
										deadline: true,
										sitting: { select: { status: true, selectedBookId: true } },
									},
								},
							},
						},
					},
				});
				const byPoll = new Map<string, AchievementFacts["votes"][number]>();
				for (const row of rows) {
					const poll = row.option.poll;
					const closed = poll.sitting.status !== "voting";
					const won =
						closed && poll.sitting.selectedBookId === row.option.bookId;
					const existing = byPoll.get(poll.id);
					byPoll.set(poll.id, {
						pollClosesAt: poll.deadline,
						votedAt:
							existing && existing.votedAt < row.createdAt
								? existing.votedAt
								: row.createdAt,
						pickedWinner: Boolean(existing?.pickedWinner) || won,
						closed,
					});
				}
				facts.votes = [...byPoll.values()];
			})(),
		);
	}

	if (want("goals")) {
		tasks.push(
			(async () => {
				const [goals, reads] = await Promise.all([
					db.goal.findMany({
						where: { userId },
						select: {
							createdAt: true,
							year: true,
							target: true,
							scopeKind: true,
							scopeAuthors: true,
							scopeCountries: true,
						},
					}),
					db.read.findMany({
						where: { userId, readEndMonth: { not: null } },
						select: {
							createdAt: true,
							readEndYear: true,
							readEndMonth: true,
							book: {
								select: {
									authors: true,
									countries: true,
									authorLinks: {
										select: {
											author: {
												select: {
													slug: true,
													slugRedirects: { select: { slug: true } },
												},
											},
										},
									},
								},
							},
						},
					}),
				]);
				facts.goals = goals.map((goal): GoalFact => {
					const scope = goalScopeFromStored(goal);
					const counted = reads
						.map((read) => ({
							...read,
							book: {
								authors: read.book.authors,
								countries: read.book.countries,
								authorSlugs: read.book.authorLinks.flatMap(({ author }) => [
									author.slug,
									...author.slugRedirects.map((redirect) => redirect.slug),
								]),
							},
						}))
						.filter((read) => readCountsTowardGoal(read, goal.year, scope))
						.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
					const reached = counted[goal.target - 1];
					return {
						createdAt: goal.createdAt,
						completedAt: reached
							? new Date(
									Math.max(
										reached.createdAt.getTime(),
										goal.createdAt.getTime(),
									),
								)
							: null,
					};
				});
			})(),
		);
	}

	if (want("shelves")) {
		tasks.push(
			(async () => {
				const rows = await db.shelf.findMany({
					where: { userId, status: "active", isWishlist: false },
					select: {
						createdAt: true,
						books: { select: { createdAt: true } },
					},
				});
				facts.shelves = rows.map((row) => ({
					createdAt: row.createdAt,
					bookAddedTimes: row.books.map((book) => book.createdAt),
				}));
			})(),
		);
	}

	if (want("library")) {
		tasks.push(
			(async () => {
				const [documents, requested, favorites] = await Promise.all([
					db.document.findMany({
						where: { userId, status: "approved" },
						select: { createdAt: true },
					}),
					db.book.findMany({
						where: { requestedById: userId },
						select: { createdAt: true },
					}),
					db.favorite.findMany({
						where: { userId },
						select: { createdAt: true },
					}),
				]);
				facts.documentTimes = documents.map((row) => row.createdAt);
				facts.requestedBookTimes = requested.map((row) => row.createdAt);
				facts.favoriteTimes = favorites.map((row) => row.createdAt);
			})(),
		);
	}

	if (want("quizzes")) {
		tasks.push(
			(async () => {
				const rows = await db.quizSubmission.findMany({
					where: { userId, status: "submitted" },
					select: { submittedAt: true, createdAt: true, score: true },
				});
				facts.quizzes = rows.map((row) => ({
					at: row.submittedAt ?? row.createdAt,
					perfect: row.score === QUIZ_MAX_SCORE,
				}));
			})(),
		);
	}

	if (want("views")) {
		tasks.push(
			(async () => {
				// One query: the most opened post and review of the member, and their profile.
				const rows = await db.$queryRaw<
					{ kind: string; opens: number; updated_at: Date }[]
				>`
					SELECT DISTINCT ON (x.kind) x.kind, x.opens, x.updated_at FROM (
						SELECT 'post' AS kind, t.opens, t.updated_at FROM view_total t
						JOIN post p ON p.id = t.resource_id
						WHERE t.resource = 'post' AND p.author_id = ${userId}
						UNION ALL
						SELECT 'review', t.opens, t.updated_at FROM view_total t
						JOIN feedback f ON f.id = t.resource_id
						WHERE t.resource = 'review' AND f.author_id = ${userId}
						UNION ALL
						SELECT 'user', t.opens, t.updated_at FROM view_total t
						WHERE t.resource = 'user' AND t.resource_id = ${userId}
					) x
					ORDER BY x.kind, x.opens DESC`;
				const pick = (kind: string) => {
					const row = rows.find((item) => item.kind === kind);
					return row ? { opens: row.opens, at: row.updated_at } : null;
				};
				facts.views = {
					mostOpenedPost: pick("post"),
					mostOpenedReview: pick("review"),
					profileOpens: pick("user"),
				};
			})(),
		);
	}

	if (want("reading")) {
		tasks.push(
			(async () => {
				const [onTime, logDays, wishlist, sessions] = await Promise.all([
					// Finished a tracked book on or before the deadline of a sitting that picked it.
					db.$queryRaw<{ finished_at: Date }[]>`
						SELECT DISTINCT r.id, r.finished_at FROM reading r
						JOIN sitting s ON s.selected_book_id = r.book_id AND s.deadline IS NOT NULL
						JOIN participation p ON p.sitting_id = s.id AND p.user_id = r.user_id AND p.removed_at IS NULL
						WHERE r.user_id = ${userId} AND r.finished_at IS NOT NULL
							AND r.finished_at <= s.deadline
						ORDER BY r.finished_at`,
					// Days with at least one progress update, in the club's time zone.
					db.$queryRaw<{ day: Date }[]>`
						SELECT DISTINCT (l.created_at AT TIME ZONE ${resolveClubTimeZone()})::date AS day
						FROM reading_log l JOIN reading r ON r.id = l.reading_id
						WHERE r.user_id = ${userId}
						ORDER BY day`,
					db.shelf.findFirst({
						where: { userId, isWishlist: true },
						select: { updatedAt: true, _count: { select: { books: true } } },
					}),
					db.readingSession.aggregate({
						where: { userId, readingId: { not: null } },
						_sum: { activeSeconds: true },
					}),
				]);

				let longest: { days: number; at: Date } | null = null;
				let run = 0;
				let previous: number | null = null;
				for (const row of logDays) {
					const time = row.day.getTime();
					run =
						previous != null && time - previous === 86_400_000 ? run + 1 : 1;
					previous = time;
					if (!longest || run > longest.days) {
						longest = { days: run, at: row.day };
					}
				}

				facts.reading = {
					onTimeFinishes: onTime.map((row) => row.finished_at),
					longestStreak: longest,
					sessionSeconds: sessions._sum.activeSeconds ?? 0,
					wishlistSize: wishlist?._count.books ?? 0,
					wishlistAt: wishlist?.updatedAt ?? null,
				};
			})(),
		);
	}

	if (want("profile")) {
		tasks.push(
			(async () => {
				const profile = await db.userProfile.findUnique({
					where: { userId },
					select: {
						updatedAt: true,
						bio: true,
						location: true,
						favoriteGenres: true,
					},
				});
				facts.profile = profile
					? {
							updatedAt: profile.updatedAt,
							hasBio: Boolean(profile.bio?.trim()),
							hasLocation: Boolean(profile.location?.trim()),
							hasGenres: profile.favoriteGenres.length > 0,
						}
					: null;
			})(),
		);
	}

	await Promise.all(tasks);
	return facts;
}
