import type { Namespace } from "./index";

/** The interface groups: all of them reach the browser (client components read them). */
export const UI_NAMESPACES = [
	"common",
	"shell",
	"auth",
	"settings",
	"preferences",
	"books",
	"authors",
	"series",
	"shelves",
	"sittings",
	"reading",
	"posts",
	"profiles",
	"achievementPages",
	"leaderboard",
	"compare",
	"listing",
	"seo",
] as const satisfies readonly Namespace[];
