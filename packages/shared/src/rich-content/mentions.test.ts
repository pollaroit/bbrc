import { describe, expect, test } from "bun:test";
import {
	extractMentions,
	mentionLabel,
	replaceMentionsWithText,
} from "./mentions";
import { richDocumentPlainText } from "./plain-text";
import type { RichDocument } from "./types";
import { validateRichDocument } from "./validate";

const ID = "11111111-2222-4333-8444-555555555555";
const doc: RichDocument = {
	v: 1,
	blocks: [
		{
			t: "p",
			inline: [
				{ t: "text", s: "Hi " },
				{ t: "mention", username: "Jon", userId: ID, name: "Jon Doe" },
				{ t: "text", s: " and " },
				{ t: "mention", username: "ann" },
				{ t: "mention", username: "Jon", userId: ID, name: "Jon Doe" },
			],
		},
	],
};

describe("mentions", () => {
	test("extract once per member", () => {
		const found = extractMentions(doc);
		expect(found).toHaveLength(2);
		expect(found.map(mentionLabel)).toEqual(["Jon Doe", "ann"]);
	});

	test("plain text uses the saved name", () => {
		expect(richDocumentPlainText(doc)).toBe("Hi @Jon Doe and @ann@Jon Doe");
	});

	test("validation keeps a good id, drops a bad one, lowercases the username", () => {
		const out = validateRichDocument({
			v: 1,
			blocks: [
				{
					t: "p",
					inline: [
						{ t: "mention", username: "JON", userId: ID, name: "  Jon Doe " },
						{ t: "mention", username: "Bob", userId: "not-an-id" },
					],
				},
			],
		});
		const nodes = extractMentions(out);
		expect(nodes[0]).toMatchObject({
			username: "jon",
			userId: ID,
			name: "Jon Doe",
		});
		expect(nodes[1]?.userId).toBeUndefined();
	});

	test("mentions that fail the test become plain text", () => {
		const out = replaceMentionsWithText(doc, (node) => node.userId !== ID);
		expect(extractMentions(out).map(mentionLabel)).toEqual(["ann"]);
		expect(richDocumentPlainText(out)).toContain("@Jon Doe");
	});
});
