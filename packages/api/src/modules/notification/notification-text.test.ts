import { describe, expect, test } from "bun:test";
import {
	notificationText,
	renderStoredNotification,
} from "./notification-text";

describe("notificationText", () => {
	test("simple message in both languages", () => {
		expect(notificationText("memberPosted", { actor: "Aysel" }, "en")).toEqual({
			title: "New club post",
			body: "Aysel shared a new post.",
		});
		expect(notificationText("memberPosted", { actor: "Aysel" }, "az")).toEqual({
			title: "Klubda yeni paylaşım",
			body: "Aysel yeni paylaşım etdi.",
		});
	});

	test("plural wording", () => {
		const one = notificationText(
			"viewsDigest",
			{ total: 1, top: "A", views: 1 },
			"en",
		);
		const many = notificationText(
			"viewsDigest",
			{ total: 5, top: "A", views: 5 },
			"en",
		);
		expect(one.title).toBe("Your week on BBRC: 1 view");
		expect(many.title).toBe("Your week on BBRC: 5 views");
		expect(
			notificationText(
				"sittingMembersJoined",
				{ total: 3, joiner: "Ali", others: 2, sitting: "S" },
				"en",
			).body,
		).toBe("Ali and 2 others joined S.");
	});

	test("select on a flag and a date value", () => {
		expect(
			notificationText("shelfDeleted", { hasActor: "no", shelf: "Best" }, "en")
				.body,
		).toBe("Someone deleted “Best”.");
		const welcome = notificationText(
			"sittingWelcomeVoting",
			{ sitting: "S", deadlineAt: "2026-11-05T12:00:00.000Z" },
			"en",
		);
		expect(welcome.body).toContain("Nov");
	});

	test("an older row without parameters is shown as saved", () => {
		expect(
			renderStoredNotification(
				{ title: "Old", body: "Old body", params: null },
				"az",
			),
		).toEqual({ title: "Old", body: "Old body" });
	});

	test("a row with parameters follows the reader's language", () => {
		const row = {
			title: "New club post",
			body: "Aysel shared a new post.",
			params: { id: "memberPosted", values: { actor: "Aysel" } },
		};
		expect(renderStoredNotification(row, "en").body).toBe(
			"Aysel shared a new post.",
		);
		expect(renderStoredNotification(row, "az").body).toBe(
			"Aysel yeni paylaşım etdi.",
		);
	});

	test("an unknown id falls back to the saved text", () => {
		expect(
			renderStoredNotification(
				{ title: "T", body: "B", params: { id: "removedText", values: {} } },
				"az",
			),
		).toEqual({ title: "T", body: "B" });
	});
});
