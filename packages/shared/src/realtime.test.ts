import { describe, expect, test } from "bun:test";
import {
	bookSlugOfReadingChannel,
	buildMemberCapability,
	readingChannel,
	uniquePresentIds,
} from "./realtime";

describe("reading channel names", () => {
	test("a channel carries its book and back", () => {
		expect(readingChannel("dune")).toBe("reading:dune");
		expect(bookSlugOfReadingChannel("reading:dune")).toBe("dune");
		expect(bookSlugOfReadingChannel("reading:the_hobbit")).toBe("the_hobbit");
	});

	test("anything else is not a reading channel", () => {
		expect(bookSlugOfReadingChannel("notify:abc")).toBeNull();
		expect(bookSlugOfReadingChannel("reading:")).toBeNull();
		expect(bookSlugOfReadingChannel("reading:*")).toBeNull();
		expect(bookSlugOfReadingChannel("reading:a b")).toBeNull();
		expect(bookSlugOfReadingChannel("reading:dune:extra")).toBeNull();
	});
});

describe("buildMemberCapability", () => {
	test("everyone may watch the reading channels and nothing more", () => {
		expect(buildMemberCapability({})).toEqual({ "reading:*": ["subscribe"] });
	});

	test("presence is allowed only on the book of the open session", () => {
		const capability = buildMemberCapability({ presenceBookSlug: "dune" });
		expect(capability["reading:dune"]).toEqual(["subscribe", "presence"]);
		expect(capability["reading:*"]).toEqual(["subscribe"]);
		expect(Object.keys(capability).sort()).toEqual([
			"reading:*",
			"reading:dune",
		]);
	});

	test("nobody can publish on a reading channel", () => {
		const capability = buildMemberCapability({
			presenceBookSlug: "dune",
			dev: true,
		});
		for (const [channel, operations] of Object.entries(capability)) {
			if (channel.startsWith("reading:")) {
				expect(operations).not.toContain("publish");
			}
		}
	});

	test("a slug that could smuggle in a pattern is refused", () => {
		for (const slug of ["*", "dune*", "a:b", "", "has space", "../x"]) {
			const capability = buildMemberCapability({ presenceBookSlug: slug });
			expect(Object.keys(capability)).toEqual(["reading:*"]);
		}
	});

	test("the dev channels exist only when asked for", () => {
		expect(buildMemberCapability({})["dev:*"]).toBeUndefined();
		expect(buildMemberCapability({ dev: true })["dev:*"]).toEqual([
			"subscribe",
			"publish",
			"presence",
		]);
	});
});

describe("uniquePresentIds", () => {
	test("the same member on two devices counts once, in a stable order", () => {
		expect(
			uniquePresentIds([
				{ clientId: "b" },
				{ clientId: "a" },
				{ clientId: "b" },
			]),
		).toEqual(["a", "b"]);
		expect(uniquePresentIds([])).toEqual([]);
	});
});
