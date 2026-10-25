import { request } from "node:https";
import type { Readable } from "node:stream";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";
import {
	resolveSafeTarget,
	type SafeTarget,
	UnsafeUrlError,
} from "./address-guard";

/** Identifies BBRC to the sites it looks at (polite access). */
export const UNFURL_USER_AGENT =
	"BBRC-LinkPreview/1.0 (+https://www.bbrc.app; link preview for club posts)";

export type TransportResponse = {
	status: number;
	headers: Record<string, string | string[] | undefined>;
	stream: Readable;
};

export type Transport = (
	target: SafeTarget,
	init: { headers: Record<string, string>; signal: AbortSignal },
) => Promise<TransportResponse>;

/** The real network call: connects to the address that was checked, not to whatever the name resolves to now. */
export const httpsTransport: Transport = (target, { headers, signal }) =>
	new Promise((resolve, reject) => {
		const { url } = target;
		const req = request(
			{
				method: "GET",
				hostname: url.hostname.replace(/^\[|\]$/g, ""),
				path: `${url.pathname}${url.search}`,
				headers,
				signal,
				// The pin: every connection goes to the validated address. Node asks
				// for a list when its "try every address" mode is on, one address otherwise.
				lookup: (_host, options, callback) => {
					const answer = { address: target.address, family: target.family };
					if ((options as { all?: boolean }).all) {
						(callback as (e: null, a: unknown[]) => void)(null, [answer]);
					} else {
						(callback as (e: null, a: string, f: number) => void)(
							null,
							answer.address,
							answer.family,
						);
					}
				},
			},
			(res) =>
				resolve({
					status: res.statusCode ?? 0,
					headers: res.headers as TransportResponse["headers"],
					stream: res,
				}),
		);
		req.on("error", reject);
		req.end();
	});

export type SafeFetchOptions = {
	/** Accepts the content type (lower-case, without parameters) or the fetch gives up. */
	allowType: (contentType: string) => boolean;
	maxBytes: number;
	/** What to do when the body is longer than `maxBytes`: keep the start, or fail. */
	onTooLarge: "truncate" | "fail";
	timeoutMs: number;
	accept: string;
	maxRedirects?: number;
	transport?: Transport;
	resolve?: typeof resolveSafeTarget;
};

export type SafeFetchResult = {
	finalUrl: string;
	contentType: string;
	body: Buffer;
};

const REDIRECTS = new Set([301, 302, 303, 307, 308]);

const first = (value: string | string[] | undefined) =>
	Array.isArray(value) ? value[0] : value;

function decoded(response: TransportResponse): Readable {
	const encoding = first(response.headers["content-encoding"])
		?.toLowerCase()
		.trim();
	if (encoding === "gzip" || encoding === "x-gzip") {
		return response.stream.pipe(createGunzip());
	}
	if (encoding === "deflate") return response.stream.pipe(createInflate());
	if (encoding === "br") return response.stream.pipe(createBrotliDecompress());
	return response.stream;
}

async function readBody(
	stream: Readable,
	max: number,
	onTooLarge: "truncate" | "fail",
): Promise<Buffer | null> {
	const chunks: Buffer[] = [];
	let total = 0;
	for await (const chunk of stream) {
		const buffer = Buffer.isBuffer(chunk)
			? chunk
			: Buffer.from(chunk as Uint8Array);
		total += buffer.length;
		if (total > max) {
			stream.destroy();
			if (onTooLarge === "fail") return null;
			chunks.push(buffer.subarray(0, buffer.length - (total - max)));
			break;
		}
		chunks.push(buffer);
	}
	return Buffer.concat(chunks);
}

/**
 * Fetches a page or an image from an outside site without letting it reach our
 * network: https only, public addresses only (re-checked on every redirect, at
 * most 3), one overall deadline, a size cap, and only the content types asked for.
 * Returns null when the answer is not usable; throws `UnsafeUrlError` for a link
 * that must never be fetched.
 */
export async function safeFetch(
	input: string,
	options: SafeFetchOptions,
): Promise<SafeFetchResult | null> {
	const transport = options.transport ?? httpsTransport;
	const resolve = options.resolve ?? resolveSafeTarget;
	const maxRedirects = options.maxRedirects ?? 3;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), options.timeoutMs);

	try {
		let current: string | URL = input;
		for (let hop = 0; hop <= maxRedirects; hop++) {
			const target = await resolve(current);
			const response = await transport(target, {
				signal: controller.signal,
				headers: {
					"user-agent": UNFURL_USER_AGENT,
					accept: options.accept,
					"accept-encoding": "gzip, deflate, br",
					"accept-language": "en",
				},
			});

			if (REDIRECTS.has(response.status)) {
				response.stream.destroy();
				const location = first(response.headers.location);
				if (!location) return null;
				try {
					current = new URL(location, target.url);
				} catch {
					return null;
				}
				continue;
			}
			if (response.status < 200 || response.status >= 300) {
				response.stream.destroy();
				return null;
			}

			const contentType =
				first(response.headers["content-type"])
					?.split(";")[0]
					?.trim()
					.toLowerCase() ?? "";
			if (!options.allowType(contentType)) {
				response.stream.destroy();
				return null;
			}
			const declared = Number(first(response.headers["content-length"]));
			if (
				options.onTooLarge === "fail" &&
				Number.isFinite(declared) &&
				declared > options.maxBytes &&
				!first(response.headers["content-encoding"])
			) {
				response.stream.destroy();
				return null;
			}

			const body = await readBody(
				decoded(response),
				options.maxBytes,
				options.onTooLarge,
			);
			if (!body || body.length === 0) return null;
			return { finalUrl: target.url.toString(), contentType, body };
		}
		return null; // too many redirects
	} catch (error) {
		if (error instanceof UnsafeUrlError) throw error;
		return null;
	} finally {
		clearTimeout(timer);
	}
}

export const isHtml = (type: string) =>
	type === "text/html" || type === "application/xhtml+xml";

/** Pictures only, and never SVG (it can carry scripts). */
export const isRasterImage = (type: string) =>
	type.startsWith("image/") && !type.includes("svg");
