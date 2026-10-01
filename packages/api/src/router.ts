import type { RouterClient } from "@orpc/server";

import { bookRouter } from "./modules/book/book.router";
import { commentRouter } from "./modules/comment/comment.router";
import { favoriteRouter } from "./modules/favorite/favorite.router";
import { feedbackRouter } from "./modules/feedback/feedback.router";
import { healthRouter } from "./modules/health/health.router";
import { likeRouter } from "./modules/like/like.router";
import { notificationRouter } from "./modules/notification/notification.router";
import { postRouter } from "./modules/post/post.router";
import { rpRouter } from "./modules/rp/rp.router";
import { sittingRouter } from "./modules/sitting/sitting.router";
import { userRouter } from "./modules/user/user.router";
import { xpRouter } from "./modules/xp/xp.router";

export const appRouter = {
	health: healthRouter,
	book: bookRouter,
	comment: commentRouter,
	favorite: favoriteRouter,
	feedback: feedbackRouter,
	like: likeRouter,
	notification: notificationRouter,
	post: postRouter,
	sitting: sittingRouter,
	user: userRouter,
	rp: rpRouter,
	xp: xpRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
