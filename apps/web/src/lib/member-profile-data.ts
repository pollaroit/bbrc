import { getGoalBySlug } from "@bbrc/api/modules/goal/goal.service";
import { getRpChart, getRpEventList } from "@bbrc/api/modules/rp/rp.service";
import { getShelfBySlug } from "@bbrc/api/modules/shelf/shelf.service";
import { getUserByUsername } from "@bbrc/api/modules/user/user.service";
import { getXpChart, getXpEventList } from "@bbrc/api/modules/xp/xp.service";
import { getRequestViewer } from "@/lib/request-viewer";
import { db } from "@/services";

/** Per-viewer profile load: the profile layout is never cached, so it knows who is looking. */
export async function loadUserByUsernameForPage(username: string) {
	return getUserByUsername({ username }, db, await getRequestViewer());
}

export async function loadGoalBySlugForPage(
	username: string,
	goalSlug: string,
) {
	return getGoalBySlug(username, goalSlug, await getRequestViewer(), db);
}

export async function loadShelfBySlugForPage(
	username: string,
	shelfSlug: string,
) {
	return getShelfBySlug(username, shelfSlug, await getRequestViewer(), db);
}

export async function loadXpChartForPage(username: string) {
	return getXpChart({ username }, db, await getRequestViewer());
}

export async function loadXpEventListForPage(username: string) {
	return getXpEventList({ username, limit: 20 }, db, await getRequestViewer());
}

export async function loadRpChartForPage(username: string) {
	return getRpChart({ username }, db, await getRequestViewer());
}

export async function loadRpEventListForPage(username: string) {
	return getRpEventList({ username, limit: 20 }, db, await getRequestViewer());
}
