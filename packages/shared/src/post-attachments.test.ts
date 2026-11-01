import { describe, expect, test } from "bun:test";
import { postAttachmentConflict } from "./post-attachments";

describe("postAttachmentConflict", () => {
	test("text only, or one primary attachment, is fine", () => {
		expect(postAttachmentConflict({})).toBeNull();
		expect(postAttachmentConflict({ poll: true })).toBeNull();
		expect(postAttachmentConflict({ tierlist: true })).toBeNull();
		expect(postAttachmentConflict({ attachment: true })).toBeNull();
		expect(postAttachmentConflict({ image: true })).toBeNull();
		expect(postAttachmentConflict({ map: true })).toBeNull();
		expect(postAttachmentConflict({ gif: true })).toBeNull();
	});

	test("a poll keeps its existing message", () => {
		expect(postAttachmentConflict({ poll: true, attachment: true })).toBe(
			"A post with a poll cannot have another attachment.",
		);
	});

	test("a tierlist excludes polls, attachments and images", () => {
		for (const other of [
			{ poll: true },
			{ attachment: true },
			{ image: true },
		]) {
			expect(
				postAttachmentConflict({ tierlist: true, ...other }),
			).not.toBeNull();
		}
	});

	test("map cannot sit beside image or other primaries", () => {
		expect(postAttachmentConflict({ map: true, image: true })).toBe(
			"A post cannot have both a map and an image.",
		);
		expect(postAttachmentConflict({ map: true, attachment: true })).toBe(
			"A map can go with text only, or with an event.",
		);
	});

	test("event is the only primary on its post", () => {
		expect(postAttachmentConflict({ event: true, image: true })).toBe(
			"An event cannot share a post with another attachment.",
		);
	});
});
