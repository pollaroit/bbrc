import { describe, expect, test } from "bun:test";
import {
	memberEditionKey,
	newMemberEditionPublicId,
	parseEditionKey,
} from "./edition-key";

describe("parseEditionKey", () => {
	test("open library ids keep their own address", () => {
		expect(parseEditionKey("OL123M")).toEqual({
			kind: "open_library",
			olid: "OL123M",
		});
		expect(parseEditionKey("ol123m")).toEqual({
			kind: "open_library",
			olid: "OL123M",
		});
	});
	test("member editions", () => {
		expect(parseEditionKey("m-7k2f9x9a")).toEqual({
			kind: "member",
			publicId: "7k2f9x9a",
		});
		expect(parseEditionKey("m-short")).toBeNull();
	});
	test("isbn alias", () => {
		expect(parseEditionKey("isbn-9780441172719")).toEqual({
			kind: "isbn",
			isbn: "9780441172719",
		});
		expect(parseEditionKey("isbn-044117271x")).toEqual({
			kind: "isbn",
			isbn: "044117271X",
		});
		expect(parseEditionKey("isbn-123")).toBeNull();
	});
	test("anything else is not an edition", () => {
		expect(parseEditionKey("OL123W")).toBeNull();
		expect(parseEditionKey("dune")).toBeNull();
	});
});

test("new public ids are 8 lowercase characters and round-trip", () => {
	const id = newMemberEditionPublicId();
	expect(id).toMatch(/^[a-z0-9]{8}$/);
	expect(parseEditionKey(memberEditionKey(id))).toEqual({
		kind: "member",
		publicId: id,
	});
});
