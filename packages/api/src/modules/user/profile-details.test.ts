import { describe, expect, test } from "bun:test";
import { ANONYMOUS_VIEWER, memberViewer } from "@bbrc/shared";
import { gateProfileDetails } from "./profile-details";
import type { UserProfileOutput } from "./user-profile.schema";

const full: UserProfileOutput = {
	dateOfBirth: new Date("1990-01-01"),
	gender: "female",
	location: "Baku",
	bio: "Hello",
	favoriteGenres: ["fantasy"],
	favoriteSubgenres: [],
	websiteUrl: "https://example.com",
	socialLinks: [{ site: "x", url: "https://x.com/a" }],
	wpm: 300,
	dateOfBirthVisibility: "friends",
	genderVisibility: "private",
	locationVisibility: "public",
};
const owner = { id: "owner", profileVisibility: "public" as const };
const privateOwner = { id: "owner", profileVisibility: "private" as const };
const stranger = memberViewer({ userId: "me", isAdmin: false });
const friend = memberViewer({
	userId: "me",
	isAdmin: false,
	friendIds: ["owner"],
});

describe("gateProfileDetails", () => {
	test("public profile: each detail follows its own level", () => {
		const out = gateProfileDetails(full, owner, stranger);
		expect(out.bio).toBe("Hello");
		expect(out.location).toBe("Baku");
		expect(out.dateOfBirth).toBeNull();
		expect(out.gender).toBe("not_specified");
		expect(out.websiteUrl).toBe("https://example.com");
		expect(out.favoriteGenres).toEqual(["fantasy"]);
		expect(out.dateOfBirthVisibility).toBeUndefined();
	});

	test("friends reach the friends level but not private", () => {
		const out = gateProfileDetails(full, owner, friend);
		expect(out.dateOfBirth).toEqual(full.dateOfBirth);
		expect(out.gender).toBe("not_specified");
	});

	test("private profile: strangers keep only the bio", () => {
		for (const viewer of [stranger, ANONYMOUS_VIEWER]) {
			const out = gateProfileDetails(full, privateOwner, viewer);
			expect(out.bio).toBe("Hello");
			expect(out.location).toBeNull();
			expect(out.websiteUrl).toBeNull();
			expect(out.socialLinks).toEqual([]);
			expect(out.favoriteGenres).toEqual([]);
			expect(out.wpm).not.toBe(300);
		}
	});

	test("owner and admin see everything", () => {
		for (const viewer of [
			memberViewer({ userId: "owner", isAdmin: false }),
			memberViewer({ userId: "x", isAdmin: true }),
		]) {
			const out = gateProfileDetails(full, privateOwner, viewer);
			expect(out.gender).toBe("female");
			expect(out.dateOfBirth).toEqual(full.dateOfBirth);
			expect(out.wpm).toBe(300);
			expect(out.genderVisibility).toBe("private");
		}
	});
});
