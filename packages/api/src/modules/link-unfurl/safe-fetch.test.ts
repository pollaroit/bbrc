import { describe, expect, test } from "bun:test";
import { Readable } from "node:stream";
import { gzipSync } from "node:zlib";
import { resolveSafeTarget, UnsafeUrlError } from "./address-guard";
import { isHtml, isRasterImage, safeFetch, type Transport } from "./safe-fetch";

const publicLookup = (async (host: string) =>
	host === "internal.example"
		? [{ address: "10.0.0.7", family: 4 }]
		: [{ address: "93.184.216.34", family: 4 }]) as never;
const resolve = (url: string | URL) => resolveSafeTarget(url, publicLookup);

function respond(
	status: number,
	headers: Record<string, string>,
	body: Buffer | string = "",
): Awaited<ReturnType<Transport>> {
	return { status, headers, stream: Readable.from([Buffer.from(body)]) };
}

const base = {
	allowType: isHtml,
	maxBytes: 1000,
	onTooLarge: "truncate" as const,
	timeoutMs: 1000,
	accept: "text/html",
	resolve,
};

describe("safeFetch", () => {
	test("returns the page", async () => {
		const result = await safeFetch("https://example.com/a", {
			...base,
			transport: async () =>
				respond(
					200,
					{ "content-type": "text/html; charset=utf-8" },
					"<head></head>",
				),
		});
		expect(result?.body.toString()).toBe("<head></head>");
		expect(result?.contentType).toBe("text/html");
	});

	test("follows redirects but re-checks every hop", async () => {
		const seen: string[] = [];
		const ok = await safeFetch("https://example.com/a", {
			...base,
			transport: async (target) => {
				seen.push(target.url.toString());
				return seen.length === 1
					? respond(301, { location: "/b" })
					: respond(200, { "content-type": "text/html" }, "ok");
			},
		});
		expect(seen).toEqual(["https://example.com/a", "https://example.com/b"]);
		expect(ok?.body.toString()).toBe("ok");

		await expect(
			safeFetch("https://example.com/a", {
				...base,
				transport: async () =>
					respond(302, { location: "https://internal.example/secret" }),
			}),
		).rejects.toBeInstanceOf(UnsafeUrlError);

		await expect(
			safeFetch("https://example.com/a", {
				...base,
				transport: async () =>
					respond(302, { location: "http://example.com/plain" }),
			}),
		).rejects.toBeInstanceOf(UnsafeUrlError);

		await expect(
			safeFetch("https://example.com/a", {
				...base,
				transport: async () =>
					respond(302, { location: "https://169.254.169.254/latest" }),
			}),
		).rejects.toBeInstanceOf(UnsafeUrlError);
	});

	test("gives up after three redirects", async () => {
		let calls = 0;
		const result = await safeFetch("https://example.com/a", {
			...base,
			transport: async () => {
				calls += 1;
				return respond(302, { location: `/r${calls}` });
			},
		});
		expect(result).toBeNull();
		expect(calls).toBe(4);
	});

	test("refuses the wrong content type and error statuses", async () => {
		expect(
			await safeFetch("https://example.com/a", {
				...base,
				transport: async () =>
					respond(200, { "content-type": "application/pdf" }, "x"),
			}),
		).toBeNull();
		expect(
			await safeFetch("https://example.com/a", {
				...base,
				transport: async () =>
					respond(404, { "content-type": "text/html" }, "x"),
			}),
		).toBeNull();
	});

	test("truncates a long page, or fails when told to", async () => {
		const long = "a".repeat(5000);
		const cut = await safeFetch("https://example.com/a", {
			...base,
			transport: async () =>
				respond(200, { "content-type": "text/html" }, long),
		});
		expect(cut?.body.length).toBe(1000);
		const refused = await safeFetch("https://example.com/a", {
			...base,
			onTooLarge: "fail",
			transport: async () =>
				respond(200, { "content-type": "text/html" }, long),
		});
		expect(refused).toBeNull();
		const declared = await safeFetch("https://example.com/a", {
			...base,
			onTooLarge: "fail",
			transport: async () =>
				respond(
					200,
					{ "content-type": "text/html", "content-length": "99999" },
					"x",
				),
		});
		expect(declared).toBeNull();
	});

	test("reads gzip bodies", async () => {
		const result = await safeFetch("https://example.com/a", {
			...base,
			transport: async () =>
				respond(
					200,
					{ "content-type": "text/html", "content-encoding": "gzip" },
					gzipSync("<head>zipped</head>"),
				),
		});
		expect(result?.body.toString()).toBe("<head>zipped</head>");
	});

	test("stops at the overall deadline", async () => {
		const result = await safeFetch("https://example.com/a", {
			...base,
			timeoutMs: 30,
			transport: (_target, { signal }) =>
				new Promise((_resolve, reject) => {
					signal.addEventListener("abort", () => reject(new Error("aborted")));
				}),
		});
		expect(result).toBeNull();
	});

	test("never fetches a blocked address", async () => {
		await expect(
			safeFetch("https://internal.example/", {
				...base,
				transport: async () =>
					respond(200, { "content-type": "text/html" }, "x"),
			}),
		).rejects.toBeInstanceOf(UnsafeUrlError);
	});
});

test("content type helpers", () => {
	expect(isHtml("text/html")).toBe(true);
	expect(isHtml("application/xhtml+xml")).toBe(true);
	expect(isHtml("application/json")).toBe(false);
	expect(isRasterImage("image/png")).toBe(true);
	expect(isRasterImage("image/webp")).toBe(true);
	expect(isRasterImage("image/svg+xml")).toBe(false);
	expect(isRasterImage("text/html")).toBe(false);
});
