import type { RouterClient } from "@orpc/server";

import { achievementRouter } from "./modules/achievement/achievement.router";
import { adminRouter } from "./modules/admin/admin.router";
import { authorRouter } from "./modules/author/author.router";
import { authorAdminRouter } from "./modules/author-admin/author-admin.router";
import { authorBackfillRouter } from "./modules/author-backfill/author-backfill.router";
import { authorInsightsRouter } from "./modules/author-insights/author-insights.router";
import { bookRouter } from "./modules/book/book.router";
import { bookDiscoverRouter } from "./modules/book-discover/book-discover.router";
import { bookEditionRouter } from "./modules/book-edition/book-edition.router";
import { bookRequestRouter } from "./modules/book-request/book-request.router";
import { commentRouter } from "./modules/comment/comment.router";
import { documentRouter } from "./modules/document/document.router";
import { editionRouter } from "./modules/edition/edition.router";
import { factRouter } from "./modules/fact/fact.router";
import { favoriteRouter } from "./modules/favorite/favorite.router";
import { feedbackRouter } from "./modules/feedback/feedback.router";
import { followRouter } from "./modules/follow/follow.router";
import { friendRouter } from "./modules/friend/friend.router";
import { goalRouter } from "./modules/goal/goal.router";
import { healthRouter } from "./modules/health/health.router";
import { leaderboardRouter } from "./modules/leaderboard/leaderboard.router";
import { likeRouter } from "./modules/like/like.router";
import { linkPreviewRouter } from "./modules/link-preview/link-preview.router";
import { mentionRouter } from "./modules/mention/mention.router";
import { notificationRouter } from "./modules/notification/notification.router";
import { peopleRouter } from "./modules/people/people.router";
import { postRouter } from "./modules/post/post.router";
import { postPollRouter } from "./modules/post-poll/post-poll.router";
import { pushRouter } from "./modules/push/push.router";
import { quizRouter } from "./modules/quiz/quiz.router";
import { ratingDefinitionRouter } from "./modules/rating-definition/rating-definition.router";
import { readRouter } from "./modules/read/read.router";
import { readingRouter } from "./modules/reading/reading.router";
import { readingSessionRouter } from "./modules/reading-session/reading-session.router";
import { rpRouter } from "./modules/rp/rp.router";
import { globalSearchRouter } from "./modules/search/global-search.router";
import { seriesRouter } from "./modules/series/series.router";
import { shelfRouter } from "./modules/shelf/shelf.router";
import { sittingRouter } from "./modules/sitting/sitting.router";
import { storageRouter } from "./modules/storage/storage.router";
import { userRouter } from "./modules/user/user.router";
import { userCompareRouter } from "./modules/user-compare/user-compare.router";
import { userCompareAdminRouter } from "./modules/user-compare-admin/user-compare-admin.router";
import { viewRouter } from "./modules/view/view.router";
import { xpRouter } from "./modules/xp/xp.router";

export const appRouter = {
	achievement: achievementRouter,
	admin: adminRouter,
	author: authorRouter,
	authorAdmin: authorAdminRouter,
	authorBackfill: authorBackfillRouter,
	authorInsights: authorInsightsRouter,
	userCompareAdmin: userCompareAdminRouter,
	health: healthRouter,
	leaderboard: leaderboardRouter,
	book: bookRouter,
	bookDiscover: bookDiscoverRouter,
	bookEdition: bookEditionRouter,
	bookRequest: bookRequestRouter,
	comment: commentRouter,
	document: documentRouter,
	fact: factRouter,
	edition: editionRouter,
	favorite: favoriteRouter,
	ratingDefinition: ratingDefinitionRouter,
	feedback: feedbackRouter,
	follow: followRouter,
	friend: friendRouter,
	goal: goalRouter,
	globalSearch: globalSearchRouter,
	like: likeRouter,
	mention: mentionRouter,
	userCompare: userCompareRouter,
	notification: notificationRouter,
	people: peopleRouter,
	post: postRouter,
	quiz: quizRouter,
	read: readRouter,
	push: pushRouter,
	reading: readingRouter,
	readingSession: readingSessionRouter,
	series: seriesRouter,
	linkPreview: linkPreviewRouter,
	postPoll: postPollRouter,
	shelf: shelfRouter,
	storage: storageRouter,
	sitting: sittingRouter,
	user: userRouter,
	view: viewRouter,
	rp: rpRouter,
	xp: xpRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
