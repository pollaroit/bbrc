import type { RouterClient } from "@orpc/server";

import { achievementRouter } from "./modules/achievement/achievement.router";
import { adminRouter } from "./modules/admin/admin.router";
import { authorRouter } from "./modules/author/author.router";
import { bookRouter } from "./modules/book/book.router";
import { bookDiscoverRouter } from "./modules/book-discover/book-discover.router";
import { bookRequestRouter } from "./modules/book-request/book-request.router";
import { commentRouter } from "./modules/comment/comment.router";
import { documentRouter } from "./modules/document/document.router";
import { factRouter } from "./modules/fact/fact.router";
import { favoriteRouter } from "./modules/favorite/favorite.router";
import { feedbackRouter } from "./modules/feedback/feedback.router";
import { goalRouter } from "./modules/goal/goal.router";
import { healthRouter } from "./modules/health/health.router";
import { leaderboardRouter } from "./modules/leaderboard/leaderboard.router";
import { likeRouter } from "./modules/like/like.router";
import { linkPreviewRouter } from "./modules/link-preview/link-preview.router";
import { notificationRouter } from "./modules/notification/notification.router";
import { peopleRouter } from "./modules/people/people.router";
import { postRouter } from "./modules/post/post.router";
import { postPollRouter } from "./modules/post-poll/post-poll.router";
import { quizRouter } from "./modules/quiz/quiz.router";
import { readRouter } from "./modules/read/read.router";
import { readingRouter } from "./modules/reading/reading.router";
import { rpRouter } from "./modules/rp/rp.router";
import { globalSearchRouter } from "./modules/search/global-search.router";
import { seriesRouter } from "./modules/series/series.router";
import { shelfRouter } from "./modules/shelf/shelf.router";
import { sittingRouter } from "./modules/sitting/sitting.router";
import { storageRouter } from "./modules/storage/storage.router";
import { userRouter } from "./modules/user/user.router";
import { viewRouter } from "./modules/view/view.router";
import { xpRouter } from "./modules/xp/xp.router";

export const appRouter = {
	achievement: achievementRouter,
	admin: adminRouter,
	author: authorRouter,
	health: healthRouter,
	leaderboard: leaderboardRouter,
	book: bookRouter,
	bookDiscover: bookDiscoverRouter,
	bookRequest: bookRequestRouter,
	comment: commentRouter,
	document: documentRouter,
	fact: factRouter,
	favorite: favoriteRouter,
	feedback: feedbackRouter,
	goal: goalRouter,
	globalSearch: globalSearchRouter,
	like: likeRouter,
	notification: notificationRouter,
	people: peopleRouter,
	post: postRouter,
	quiz: quizRouter,
	read: readRouter,
	reading: readingRouter,
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
