import { describe, expect, test } from "bun:test";
import {
	type AuthorEditSource,
	authorToFormValues,
	hasAuthorEditChanges,
	toUpdateInput,
} from "./author-edit-form";

const source: AuthorEditSource = {
	name: "Fyodor Dostoevsky",
	sortName: null,
	bio: null,
	birthYear: 1821,
	birthMonth: 11,
	birthDay: 11,
	deathYear: 1881,
	deathMonth: null,
	deathDay: null,
	birthPlace: null,
	deathPlace: null,
	nationalities: [],
	gender: "male",
	wikipediaUrl: null,
	goodreadsUrl: null,
	websiteUrl: null,
	openLibraryId: null,
	wikidataId: null,
};

describe("hasAuthorEditChanges", () => {
	const initial = authorToFormValues(source);

	test("untouched form has no changes", () => {
		expect(hasAuthorEditChanges(authorToFormValues(source), initial)).toBe(
			false,
		);
	});

	test("adding a nationality is a change", () => {
		const next = { ...initial, nationalities: ["RU"] };
		expect(hasAuthorEditChanges(next, initial)).toBe(true);
		expect(toUpdateInput("a", next, initial)?.nationalities).toEqual(["RU"]);
	});

	test("removing the last nationality is a change", () => {
		const withRu = authorToFormValues({ ...source, nationalities: ["RU"] });
		const next = { ...withRu, nationalities: [] };
		expect(hasAuthorEditChanges(next, withRu)).toBe(true);
		expect(toUpdateInput("a", next, withRu)?.nationalities).toEqual([]);
	});

	test("only changed fields are sent", () => {
		const next = { ...initial, birthPlace: "Moscow" };
		expect(toUpdateInput("a", next, initial)).toEqual({
			id: "a",
			birthPlace: "Moscow",
		});
	});

	test("whitespace-only edits are not changes", () => {
		expect(
			hasAuthorEditChanges({ ...initial, name: `${initial.name}  ` }, initial),
		).toBe(false);
	});

	test("clearing a date part is a change", () => {
		const next = { ...initial, birthDay: "" };
		expect(hasAuthorEditChanges(next, initial)).toBe(true);
	});

	test("gender change", () => {
		expect(
			hasAuthorEditChanges({ ...initial, gender: "female" }, initial),
		).toBe(true);
	});
});
