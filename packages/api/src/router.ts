import type { RouterClient } from "@orpc/server";

import { adminRouter } from "./modules/admin/admin.router";
import { bookRouter } from "./modules/book/book.router";
import { bookRequestRouter } from "./modules/book-request/book-request.router";
import { commentRouter } from "./modules/comment/comment.router";
import { documentRouter } from "./modules/document/document.router";
import { factRouter } from "./modules/fact/fact.router";
import { favoriteRouter } from "./modules/favorite/favorite.router";
import { feedbackRouter } from "./modules/feedback/feedback.router";
import { healthRouter } from "./modules/health/health.router";
import { leaderboardRouter } from "./modules/leaderboard/leaderboard.router";
import { likeRouter } from "./modules/like/like.router";
import { notificationRouter } from "./modules/notification/notification.router";
import { postRouter } from "./modules/post/post.router";
import { readRouter } from "./modules/read/read.router";
import { rpRouter } from "./modules/rp/rp.router";
import { globalSearchRouter } from "./modules/search/global-search.router";
import { shelfRouter } from "./modules/shelf/shelf.router";
import { sittingRouter } from "./modules/sitting/sitting.router";
import { storageRouter } from "./modules/storage/storage.router";
import { userRouter } from "./modules/user/user.router";
import { xpRouter } from "./modules/xp/xp.router";

export const appRouter = {
	admin: adminRouter,
	health: healthRouter,
	leaderboard: leaderboardRouter,
	book: bookRouter,
	bookRequest: bookRequestRouter,
	comment: commentRouter,
	document: documentRouter,
	fact: factRouter,
	favorite: favoriteRouter,
	feedback: feedbackRouter,
	globalSearch: globalSearchRouter,
	like: likeRouter,
	notification: notificationRouter,
	post: postRouter,
	read: readRouter,
	shelf: shelfRouter,
	storage: storageRouter,
	sitting: sittingRouter,
	user: userRouter,
	rp: rpRouter,
	xp: xpRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
