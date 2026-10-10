import { getRpChart, getRpEventList } from "@bbrc/api/modules/rp/rp.service";
import { getShelfBySlug } from "@bbrc/api/modules/shelf/shelf.service";
import { getUserByUsername } from "@bbrc/api/modules/user/user.service";
import { viewerFromSession } from "@bbrc/api/modules/user/user-visibility";
import { getXpChart, getXpEventList } from "@bbrc/api/modules/xp/xp.service";
import { headers } from "next/headers";
import { auth, db } from "@/services";

/** Session-aware profile load (supports hidden members viewing themselves). */
export async function loadUserByUsernameForPage(username: string) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	return getUserByUsername({ username }, db, session);
}

export async function loadShelfBySlugForPage(
	username: string,
	shelfSlug: string,
) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	return getShelfBySlug(username, shelfSlug, viewerFromSession(session), db);
}

async function loadSessionForPage() {
	return auth.api.getSession({
		headers: await headers(),
	});
}

export async function loadXpChartForPage(username: string) {
	const session = await loadSessionForPage();
	return getXpChart({ username }, db, session);
}

export async function loadXpEventListForPage(username: string) {
	const session = await loadSessionForPage();
	return getXpEventList({ username, limit: 20 }, db, session);
}

export async function loadRpChartForPage(username: string) {
	const session = await loadSessionForPage();
	return getRpChart({ username }, db, session);
}

export async function loadRpEventListForPage(username: string) {
	const session = await loadSessionForPage();
	return getRpEventList({ username, limit: 20 }, db, session);
}
