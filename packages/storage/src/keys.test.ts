import { describe, expect, test } from "bun:test";

import { buildObjectKey } from "./keys";

describe("buildObjectKey", () => {
	test("avatar", () => {
		expect(
			buildObjectKey("development", {
				kind: "avatar",
				username: "alice",
			}),
		).toBe("development/users/alice/avatar.jpg");
	});

	test("post image", () => {
		expect(
			buildObjectKey("preview", {
				kind: "post-image",
				postSlug: "hello_world",
			}),
		).toBe("preview/posts/hello_world/image.png");
	});

	test("comment image", () => {
		expect(
			buildObjectKey("production", {
				kind: "comment-image",
				commentSlug: "c1",
			}),
		).toBe("production/comments/c1/image.png");
	});

	test("shelf cover", () => {
		expect(
			buildObjectKey("development", {
				kind: "shelf-cover",
				username: "bob",
				shelfSlug: "favorites",
			}),
		).toBe("development/users/bob/shelves/favorites/image.png");
	});

	test("book document", () => {
		expect(
			buildObjectKey("production", {
				kind: "book-document",
				bookSlug: "1984",
				documentSlug: "study_guide",
				extension: "pdf",
			}),
		).toBe("production/books/1984/documents/study_guide.pdf");
	});

	test("book document keeps the file extension", () => {
		expect(
			buildObjectKey("production", {
				kind: "book-document",
				bookSlug: "1984",
				documentSlug: "study_guide",
				extension: "epub",
			}),
		).toBe("production/books/1984/documents/study_guide.epub");
	});
});
