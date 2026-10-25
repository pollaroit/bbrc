import { describe, expect, test } from "bun:test";
import { hashLinkUrl, normalizeLinkUrl } from "./normalize-url";
import { decodeEntities, parseLinkMeta, resolveImageUrl } from "./parse-head";

const PAGE = "https://news.example.com/stories/42?utm_source=x";

describe("parseLinkMeta", () => {
	test("reads open graph tags", () => {
		const html = `<html><head>
			<title>Fallback title</title>
			<meta property="og:title" content="A &amp; B: the story">
			<meta property="og:description" content="Two  people&#39;s tale
			in several lines.">
			<meta property="og:site_name" content="The Example">
			<meta property="og:image" content="/img/cover.jpg">
		</head><body><meta property="og:title" content="from the body"></body></html>`;
		expect(parseLinkMeta(html, PAGE)).toEqual({
			title: "A & B: the story",
			description: "Two people's tale in several lines.",
			siteName: "The Example",
			imageUrl: "https://news.example.com/img/cover.jpg",
		});
	});

	test("falls back to twitter tags, <title> and the plain description", () => {
		const html = `<head><title> Plain
			title </title><meta name="description" content="Plain description"><meta name="twitter:image" content="https://cdn.example.org/a.png"></head>`;
		const meta = parseLinkMeta(html, PAGE);
		expect(meta.title).toBe("Plain title");
		expect(meta.description).toBe("Plain description");
		expect(meta.imageUrl).toBe("https://cdn.example.org/a.png");
		expect(meta.siteName).toBeNull();
	});

	test("handles single quotes, unquoted values and attribute order", () => {
		const html = `<head><meta content='Quoted' property='og:title'><meta property=og:site_name content=Plain></head>`;
		const meta = parseLinkMeta(html, PAGE);
		expect(meta.title).toBe("Quoted");
		expect(meta.siteName).toBe("Plain");
	});

	test("truncates long text and ignores empty values", () => {
		const html = `<head><meta property="og:title" content="${"x".repeat(400)}"><meta property="og:description" content="   "></head>`;
		const meta = parseLinkMeta(html, PAGE);
		expect(meta.title?.length).toBe(200);
		expect(meta.title?.endsWith("…")).toBe(true);
		expect(meta.description).toBeNull();
	});

	test("a page with nothing useful gives nothing", () => {
		expect(parseLinkMeta("<html><body>hi</body></html>", PAGE)).toEqual({
			title: null,
			description: null,
			siteName: null,
			imageUrl: null,
		});
	});

	test("does not read tags after </head>", () => {
		const html = `<head></head><body><meta property="og:title" content="late"></body>`;
		expect(parseLinkMeta(html, PAGE).title).toBeNull();
	});
});

describe("resolveImageUrl", () => {
	test("resolves relative and protocol-relative addresses", () => {
		expect(resolveImageUrl("//cdn.example.org/a.png", PAGE)).toBe(
			"https://cdn.example.org/a.png",
		);
		expect(resolveImageUrl("a.png", PAGE)).toBe(
			"https://news.example.com/stories/a.png",
		);
	});
	test("upgrades http on the same host, refuses other http, data and junk", () => {
		expect(resolveImageUrl("http://news.example.com/a.png", PAGE)).toBe(
			"https://news.example.com/a.png",
		);
		expect(resolveImageUrl("http://other.example.org/a.png", PAGE)).toBeNull();
		expect(resolveImageUrl("data:image/png;base64,AAAA", PAGE)).toBeNull();
		expect(resolveImageUrl("javascript:alert(1)", PAGE)).toBeNull();
		expect(resolveImageUrl("", PAGE)).toBeNull();
	});
});

test("decodeEntities", () => {
	expect(
		decodeEntities("a &lt;b&gt; &#x41; &#66; &mdash; &unknown; &#0;"),
	).toBe("a <b> A B — &unknown; &#0;");
});

describe("normalizeLinkUrl", () => {
	test("drops tracking, fragment and default port; sorts the rest; lower-cases the host", () => {
		expect(
			normalizeLinkUrl(
				"https://Example.COM:443/Path?b=2&utm_source=x&a=1#frag",
			),
		).toBe("https://example.com/Path?a=1&b=2");
	});
	test("the same page hashes the same", () => {
		const one = normalizeLinkUrl("https://example.com/a?utm_medium=z");
		const two = normalizeLinkUrl("https://EXAMPLE.com/a#x");
		expect(one).toBe(two);
		expect(hashLinkUrl(one as string)).toBe(hashLinkUrl(two as string));
		expect(hashLinkUrl(one as string)).toMatch(/^[a-f0-9]{64}$/);
	});
	test("refuses anything that is not https", () => {
		expect(normalizeLinkUrl("http://example.com/")).toBeNull();
		expect(normalizeLinkUrl("nonsense")).toBeNull();
	});
});
