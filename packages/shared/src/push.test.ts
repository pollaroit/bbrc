import { describe, expect, test } from "bun:test";
import {
	buildPushPayload,
	describeDevice,
	PUSH_BODY_MAX,
	PUSH_FALLBACK_HREF,
	PUSH_TITLE_MAX,
	safePushHref,
} from "./push";

const origin = "https://bbrc.example";

describe("safePushHref", () => {
	test("a path on the site is kept", () => {
		expect(safePushHref("/sittings/dune?x=1#a", origin)).toBe(
			"/sittings/dune?x=1#a",
		);
	});

	test("an address on the same site becomes a path", () => {
		expect(safePushHref(`${origin}/posts/abc?y=2`, origin)).toBe(
			"/posts/abc?y=2",
		);
	});

	test("another site, a protocol-relative link or rubbish opens the notifications page", () => {
		for (const bad of [
			"https://evil.example/phish",
			"//evil.example/x",
			"javascript:alert(1)",
			"not a link",
			"",
			null,
			undefined,
		]) {
			expect(safePushHref(bad as string | null | undefined, origin)).toBe(
				PUSH_FALLBACK_HREF,
			);
		}
	});
});

describe("buildPushPayload", () => {
	const input = {
		notificationId: "n1",
		kind: "mention",
		title: "Aysel mentioned you",
		body: "See what she said",
		href: "/posts/abc",
	};

	test("carries the text, the id, the kind and a safe link", () => {
		const payload = buildPushPayload(input, origin);
		expect(payload.notification).toEqual({
			title: "Aysel mentioned you",
			body: "See what she said",
		});
		expect(payload.data).toEqual({
			id: "n1",
			kind: "mention",
			url: "/posts/abc",
		});
		expect(payload.web.tag).toBe("n1");
		// Ably refuses fields it does not know (a top-level `ttl` failed a whole batch).
		expect(Object.keys(payload).sort()).toEqual([
			"data",
			"notification",
			"web",
		]);
	});

	test("long text is cut, and white space is tidied", () => {
		const payload = buildPushPayload(
			{
				...input,
				title: `  ${"a".repeat(200)}  `,
				body: `line one\n\nline   two ${"b".repeat(400)}`,
			},
			origin,
		);
		expect(payload.notification.title.length).toBeLessThanOrEqual(
			PUSH_TITLE_MAX,
		);
		expect(payload.notification.title.endsWith("…")).toBe(true);
		expect(payload.notification.body.length).toBeLessThanOrEqual(PUSH_BODY_MAX);
		expect(payload.notification.body.startsWith("line one line two")).toBe(
			true,
		);
	});

	test("a link to another site never reaches the device", () => {
		const payload = buildPushPayload(
			{ ...input, href: "https://evil.example" },
			origin,
		);
		expect(payload.data.url).toBe(PUSH_FALLBACK_HREF);
	});
});

describe("describeDevice", () => {
	test("names the browser and the system", () => {
		expect(
			describeDevice(
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
			),
		).toBe("Chrome on macOS");
		expect(
			describeDevice(
				"Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
			),
		).toBe("Safari on iPhone or iPad");
		expect(
			describeDevice(
				"Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36",
			),
		).toBe("Chrome on Android");
		expect(describeDevice("")).toBe("Browser");
	});
});
