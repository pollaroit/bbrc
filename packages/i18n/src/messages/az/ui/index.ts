import type { Messages } from "../../shape";
import { achievementPages } from "./achievementPages";
import { auth } from "./auth";
import { authors } from "./authors";
import { books } from "./books";
import { common } from "./common";
import { compare } from "./compare";
import { leaderboard } from "./leaderboard";
import { listing } from "./listing";
import { posts } from "./posts";
import { preferences } from "./preferences";
import { profiles } from "./profiles";
import { reading } from "./reading";
import { seo } from "./seo";
import { series } from "./series";
import { settings } from "./settings";
import { shell } from "./shell";
import { shelves } from "./shelves";
import { sittings } from "./sittings";

export const ui: Pick<
	Messages,
	| "common"
	| "shell"
	| "auth"
	| "settings"
	| "preferences"
	| "books"
	| "authors"
	| "series"
	| "shelves"
	| "sittings"
	| "reading"
	| "posts"
	| "profiles"
	| "achievementPages"
	| "leaderboard"
	| "compare"
	| "listing"
	| "seo"
> = {
	common,
	shell,
	auth,
	settings,
	preferences,
	books,
	authors,
	series,
	shelves,
	sittings,
	reading,
	posts,
	profiles,
	achievementPages,
	leaderboard,
	compare,
	listing,
	seo,
};
