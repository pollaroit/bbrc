import { describe, expect, test } from "bun:test";
import { postAttachmentConflict } from "./post-attachments";

describe("postAttachmentConflict", () => {
	test("text only, or one primary attachment, is fine", () => {
		expect(postAttachmentConflict({})).toBeNull();
		expect(postAttachmentConflict({ poll: true })).toBeNull();
		expect(postAttachmentConflict({ tierlist: true })).toBeNull();
		expect(postAttachmentConflict({ attachment: true })).toBeNull();
		expect(postAttachmentConflict({ image: true })).toBeNull();
		expect(
			postAttachmentConflict({ image: true, attachment: true }),
		).toBeNull();
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

	test("a poll excludes images", () => {
		expect(postAttachmentConflict({ poll: true, image: true })).not.toBeNull();
	});
});
