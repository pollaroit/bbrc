import { describe, expect, test } from "bun:test";
import { ANONYMOUS_VIEWER, memberViewer } from "@bbrc/shared";
import { decidePeek } from "./peek";

const author = { name: "Ann", username: "ann", image: null };
const base = { ownerId: "ann-id", profile: "public" as const, author };

describe("decidePeek", () => {
	test("a public item is visible", () => {
		expect(
			decidePeek({ ...base, viewer: ANONYMOUS_VIEWER, item: "public" }),
		).toEqual({
			state: "visible",
		});
	});

	test("a friends-only item is locked for a stranger, with only the owner named", () => {
		const stranger = memberViewer({ userId: "v", isAdmin: false });
		expect(decidePeek({ ...base, viewer: stranger, item: "friends" })).toEqual({
			state: "locked",
			author,
		});
		expect(
			decidePeek({ ...base, viewer: ANONYMOUS_VIEWER, item: "friends" }),
		).toEqual({ state: "locked", author });
	});

	test("a friend sees a friends-only item", () => {
		const friend = memberViewer({
			userId: "v",
			isAdmin: false,
			friendIds: ["ann-id"],
		});
		expect(decidePeek({ ...base, viewer: friend, item: "friends" })).toEqual({
			state: "visible",
		});
	});

	test("an only-me item is unavailable, never locked", () => {
		const friend = memberViewer({
			userId: "v",
			isAdmin: false,
			friendIds: ["ann-id"],
		});
		expect(decidePeek({ ...base, viewer: friend, item: "private" })).toEqual({
			state: "unavailable",
		});
		expect(
			decidePeek({ ...base, viewer: ANONYMOUS_VIEWER, item: "private" }),
		).toEqual({ state: "unavailable" });
	});

	test("a private profile locks a public item, because friends can open it", () => {
		const stranger = memberViewer({ userId: "v", isAdmin: false });
		expect(
			decidePeek({
				...base,
				profile: "private",
				viewer: stranger,
				item: "public",
			}),
		).toEqual({ state: "locked", author });
	});

	test("a blocked viewer gets nothing at all", () => {
		const blocked = memberViewer({
			userId: "v",
			isAdmin: false,
			blockedIds: ["ann-id"],
		});
		expect(decidePeek({ ...base, viewer: blocked, item: "friends" })).toEqual({
			state: "unavailable",
		});
	});

	test("the owner and admins always see it", () => {
		expect(
			decidePeek({
				...base,
				viewer: memberViewer({ userId: "ann-id", isAdmin: false }),
				item: "private",
			}),
		).toEqual({ state: "visible" });
		expect(
			decidePeek({
				...base,
				viewer: memberViewer({ userId: "boss", isAdmin: true }),
				item: "private",
			}),
		).toEqual({ state: "visible" });
	});
});
