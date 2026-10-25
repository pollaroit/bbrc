import type { Database } from "@bbrc/db";
import { parseStoredContent, type RichDocument } from "@bbrc/shared";
import { storePreviewImage } from "./image";
import { hashLinkUrl, normalizeLinkUrl } from "./normalize-url";
import { parseLinkMeta } from "./parse-head";
import { isHtml, safeFetch } from "./safe-fetch";

/*
 * Link previews for outside links. A page is fetched at most once per week (a
 * failed page once per six hours), the result is kept in `LinkPreviewCache`, and
 * readers only ever read that cache. The picture is our own small copy.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
export const OK_TTL_MS = 7 * DAY_MS;
export const FAILED_TTL_MS = 6 * 60 * 60 * 1000;
/** New fetches one member may start per hour (reading the cache is free). */
export const FETCHES_PER_MEMBER_PER_HOUR = 30;
/** Unfurls running at once on one server. */
export const MAX_CONCURRENT_UNFURLS = 3;
/** The page fetch itself; the picture has its own time. */
const PAGE_TIMEOUT_MS = 3000;
const PAGE_MAX_BYTES = 512 * 1024;
/** One save looks at most this many outside links. */
const MAX_LINKS_PER_CONTENT = 6;

export type UnfurledMeta = {
	title: string | null;
	description: string | null;
	siteName: string | null;
	/** Our copy of the picture. */
	imageUrl: string | null;
};

// ── Limits ─────────────────────────────────────────────────────────────────

const recentFetches = new Map<string, number[]>();

/** Takes one of the member's hourly fetches; false when they are used up. */
export function takeFetchToken(userId: string, now = Date.now()): boolean {
	const since = now - 60 * 60 * 1000;
	const recent = (recentFetches.get(userId) ?? []).filter((at) => at > since);
	if (recent.length >= FETCHES_PER_MEMBER_PER_HOUR) {
		recentFetches.set(userId, recent);
		return false;
	}
	recent.push(now);
	recentFetches.set(userId, recent);
	return true;
}

export function resetFetchLimitsForTests() {
	recentFetches.clear();
}

let running = 0;
const waiting: (() => void)[] = [];

/** Runs `task` when one of the unfurl slots is free. */
export async function withUnfurlSlot<T>(task: () => Promise<T>): Promise<T> {
	if (running >= MAX_CONCURRENT_UNFURLS) {
		await new Promise<void>((resolve) => waiting.push(resolve));
	}
	running += 1;
	try {
		return await task();
	} finally {
		running -= 1;
		waiting.shift()?.();
	}
}

// ── Fetching ───────────────────────────────────────────────────────────────

/** Looks at the page and (if it names one) copies its picture. Null when there is nothing to show. */
export async function unfurlUrl(
	normalizedUrl: string,
): Promise<UnfurledMeta | null> {
	const page = await safeFetch(normalizedUrl, {
		allowType: isHtml,
		maxBytes: PAGE_MAX_BYTES,
		onTooLarge: "truncate",
		timeoutMs: PAGE_TIMEOUT_MS,
		accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
	});
	if (!page) return null;
	const meta = parseLinkMeta(page.body.toString("utf8"), page.finalUrl);
	if (!meta.title && !meta.description) return null;
	const imageUrl = meta.imageUrl
		? await storePreviewImage(meta.imageUrl, hashLinkUrl(normalizedUrl))
		: null;
	return {
		title: meta.title,
		description: meta.description,
		siteName: meta.siteName,
		imageUrl,
	};
}

type CacheRow = {
	urlHash: string;
	url: string;
	status: string;
	title: string | null;
	description: string | null;
	siteName: string | null;
	imageUrl: string | null;
	expiresAt: Date;
};

/** Fetches one link and writes the answer (a good one or a "failed" one) to the cache. */
async function fetchAndCache(
	db: Database,
	normalizedUrl: string,
): Promise<CacheRow> {
	const urlHash = hashLinkUrl(normalizedUrl);
	let meta: UnfurledMeta | null = null;
	try {
		meta = await withUnfurlSlot(() => unfurlUrl(normalizedUrl));
	} catch {
		meta = null;
	}
	const now = Date.now();
	const data = meta
		? {
				status: "ok",
				title: meta.title,
				description: meta.description,
				siteName: meta.siteName,
				imageUrl: meta.imageUrl,
				fetchedAt: new Date(now),
				expiresAt: new Date(now + OK_TTL_MS),
			}
		: {
				status: "failed",
				title: null,
				description: null,
				siteName: null,
				imageUrl: null,
				fetchedAt: new Date(now),
				expiresAt: new Date(now + FAILED_TTL_MS),
			};
	return db.linkPreviewCache.upsert({
		where: { urlHash },
		create: { urlHash, url: normalizedUrl, ...data },
		update: { url: normalizedUrl, ...data },
		select: {
			urlHash: true,
			url: true,
			status: true,
			title: true,
			description: true,
			siteName: true,
			imageUrl: true,
			expiresAt: true,
		},
	});
}

async function loadRows(db: Database, hashes: string[]) {
	const rows = await db.linkPreviewCache.findMany({
		where: { urlHash: { in: hashes } },
		select: {
			urlHash: true,
			url: true,
			status: true,
			title: true,
			description: true,
			siteName: true,
			imageUrl: true,
			expiresAt: true,
		},
	});
	return new Map(rows.map((row) => [row.urlHash, row]));
}

const normalizeAll = (urls: string[], max: number) => {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const url of urls) {
		const normalized = normalizeLinkUrl(url);
		if (!normalized || seen.has(normalized)) continue;
		seen.add(normalized);
		out.push(normalized);
		if (out.length >= max) break;
	}
	return out;
};

// ── Save time ──────────────────────────────────────────────────────────────

/**
 * Looks up the outside links of something that was just written so their
 * previews are ready by the time anyone reads it. Waits at most `budgetMs` and
 * never throws: a slow or broken site must not fail a save.
 */
export async function warmLinkPreviews(
	db: Database,
	urls: string[],
	options: { userId: string; budgetMs?: number },
): Promise<void> {
	try {
		const normalized = normalizeAll(urls, MAX_LINKS_PER_CONTENT);
		if (normalized.length === 0) return;
		const rows = await loadRows(db, normalized.map(hashLinkUrl));
		const now = Date.now();
		const todo = normalized.filter((url) => {
			const row = rows.get(hashLinkUrl(url));
			return !row || row.expiresAt.getTime() <= now;
		});
		if (todo.length === 0) return;

		const work = Promise.allSettled(
			todo.map(async (url) => {
				if (!takeFetchToken(options.userId)) return;
				await fetchAndCache(db, url);
			}),
		);
		let timer: ReturnType<typeof setTimeout> | undefined;
		const budget = new Promise<void>((resolve) => {
			timer = setTimeout(resolve, options.budgetMs ?? 4000);
		});
		await Promise.race([work, budget]);
		if (timer) clearTimeout(timer);
	} catch (error) {
		console.error("link preview warm-up failed", error);
	}
}

/** The outside links of a document that will show a preview card or hover card. */
export function externalLinksOf(doc: RichDocument): string[] {
	const urls: string[] = [];
	for (const block of doc.blocks) {
		if (block.t === "embed") {
			if (!block.internal) urls.push(block.href);
			continue;
		}
		for (const node of block.inline) {
			if (node.t === "link" && !node.internal) urls.push(node.href);
		}
	}
	return urls;
}

/** Called after a post, comment or review is written: warms the previews of its outside links. */
export async function warmLinkPreviewsInContent(
	db: Database,
	userId: string,
	storedContent: string,
): Promise<void> {
	try {
		const urls = externalLinksOf(parseStoredContent(storedContent));
		if (urls.length > 0) await warmLinkPreviews(db, urls, { userId });
	} catch (error) {
		console.error("link preview warm-up failed", error);
	}
}

// ── Reading ────────────────────────────────────────────────────────────────

export type ExternalPreviewItem = {
	url: string;
	host: string;
	status: "ok" | "none";
	title: string | null;
	description: string | null;
	siteName: string | null;
	imageUrl: string | null;
};

const hostOf = (url: string) => {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
};

const itemFrom = (url: string, row: CacheRow | null): ExternalPreviewItem => ({
	url,
	host: hostOf(url),
	status: row && row.status === "ok" ? "ok" : "none",
	title: row?.status === "ok" ? row.title : null,
	description: row?.status === "ok" ? row.description : null,
	siteName: row?.status === "ok" ? row.siteName : null,
	imageUrl: row?.status === "ok" ? row.imageUrl : null,
});

/**
 * Previews of outside links for readers. Reads come from the cache; a stale good
 * row is served and refreshed in the background. A link with no row at all (old
 * content from before previews existed) is looked up once, in the request, but
 * only for signed-in members, within the same limits, so the page cannot be used
 * to make the server fetch things for anonymous visitors.
 */
export async function resolveExternalPreviews(
	db: Database,
	urls: string[],
	viewer: { userId: string } | null,
): Promise<ExternalPreviewItem[]> {
	const normalized = urls.map((url) => normalizeLinkUrl(url));
	const unique = [
		...new Set(normalized.filter((url): url is string => url != null)),
	];
	const rows = await loadRows(db, unique.map(hashLinkUrl));
	const now = Date.now();

	const filled = new Map<string, CacheRow | null>();
	await Promise.all(
		unique.map(async (url) => {
			const row = rows.get(hashLinkUrl(url)) ?? null;
			if (row && row.expiresAt.getTime() > now) {
				filled.set(url, row);
				return;
			}
			if (row && row.status === "ok") {
				// Stale but good: show it now, refresh quietly.
				filled.set(url, row);
				if (viewer && takeFetchToken(viewer.userId)) {
					void fetchAndCache(db, url).catch(() => undefined);
				}
				return;
			}
			if (!viewer || !takeFetchToken(viewer.userId)) {
				filled.set(url, row);
				return;
			}
			filled.set(url, await fetchAndCache(db, url).catch(() => null));
		}),
	);

	return urls.map((original, index) => {
		const url = normalized[index];
		return url
			? itemFrom(url, filled.get(url) ?? null)
			: itemFrom(original, null);
	});
}
