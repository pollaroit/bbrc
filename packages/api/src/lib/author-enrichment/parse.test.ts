import { describe, expect, test } from "bun:test";
import {
	cleanBioText,
	parseCommonsImageInfo,
	parseLooseDate,
	parseOpenLibraryAuthor,
	parseOpenLibraryAuthorSearch,
	parseWikidataAuthor,
	parseWikidataPlace,
	parseWikidataTime,
	parseWikipediaSummary,
	parseWorkAuthorIds,
	sortNameFor,
	truncateBio,
	wikidataEntityFrom,
	wikipediaTitleFromUrl,
} from "./parse";

describe("parseLooseDate", () => {
	test.each([
		["1821", { year: 1821, month: null, day: null }],
		["11 November 1821", { year: 1821, month: 11, day: 11 }],
		["Nov 11, 1821", { year: 1821, month: 11, day: 11 }],
		["November 1821", { year: 1821, month: 11, day: null }],
		["1821-11-11", { year: 1821, month: 11, day: 11 }],
		["1821-11", { year: 1821, month: 11, day: null }],
		["c. 1564", { year: 1564, month: null, day: null }],
		["1564?", { year: 1564, month: null, day: null }],
		["384 BC", { year: -384, month: null, day: null }],
		["31 February 1900", { year: 1900, month: 2, day: null }],
		["29 February 1904", { year: 1904, month: 2, day: 29 }],
		["", { year: null, month: null, day: null }],
		["unknown", { year: null, month: null, day: null }],
	])("%s", (input, expected) => {
		expect(parseLooseDate(input)).toEqual(expected);
	});
});

describe("Open Library author", () => {
	const record = {
		key: "/authors/OL26320A",
		name: "J. R. R. Tolkien",
		birth_date: "3 January 1892",
		death_date: "2 September 1973",
		bio: {
			type: "/type/text",
			value:
				"John Ronald Reuel Tolkien was an [English](http://x.test) writer.\r\n\r\n----------\r\nSource: somewhere",
		},
		wikipedia: "http://en.wikipedia.org/wiki/J._R._R._Tolkien",
		links: [
			{ title: "Official website", url: "https://tolkien.example.com" },
			{ title: "Amazon", url: "https://amazon.com/x" },
		],
		remote_ids: { wikidata: "Q892", goodreads: "656983", viaf: "1" },
		alternate_names: ["John Ronald Reuel Tolkien"],
	};

	test("reads the fields", () => {
		const parsed = parseOpenLibraryAuthor(record);
		expect(parsed).toMatchObject({
			olid: "OL26320A",
			name: "J. R. R. Tolkien",
			birth: { year: 1892, month: 1, day: 3 },
			death: { year: 1973, month: 9, day: 2 },
			wikidataId: "Q892",
			goodreadsId: "656983",
			wikipediaUrl: "https://en.wikipedia.org/wiki/J._R._R._Tolkien",
			websiteUrl: "https://tolkien.example.com",
			alternateNames: ["John Ronald Reuel Tolkien"],
		});
		expect(parsed?.bio).toBe(
			"John Ronald Reuel Tolkien was an English writer.",
		);
	});

	test("needs an id and a name", () => {
		expect(parseOpenLibraryAuthor({ name: "X" })).toBeNull();
		expect(parseOpenLibraryAuthor(null)).toBeNull();
	});

	test("search hits and work author ids", () => {
		expect(
			parseOpenLibraryAuthorSearch({
				docs: [
					{
						key: "OL1A",
						name: "A",
						top_work: "T",
						birth_date: "1900",
						work_count: 3,
					},
					{ key: "bad", name: "B" },
				],
			}),
		).toEqual([
			{ olid: "OL1A", name: "A", topWork: "T", birthYear: 1900, workCount: 3 },
		]);
		expect(
			parseWorkAuthorIds({
				authors: [
					{ author: { key: "/authors/OL1A" } },
					{ author: { key: "/authors/OL2A" } },
					{ author: { key: "/authors/OL1A" } },
				],
			}),
		).toEqual(["OL1A", "OL2A"]);
	});
});

describe("bio text", () => {
	test("cleans markdown and sources", () => {
		expect(
			cleanBioText("A **bold** [link](http://a.b) story.\n---------- \nSource"),
		).toBe("A bold link story.");
		expect(cleanBioText("   ")).toBeNull();
	});
	test("truncates at a sentence", () => {
		const text = `${"Word ".repeat(300)}. Last sentence here that goes on. ${"More ".repeat(200)}`;
		const cut = truncateBio(text, 1700);
		expect(cut.length).toBeLessThanOrEqual(1701);
		expect(truncateBio("short")).toBe("short");
	});
});

describe("Wikidata", () => {
	const entity = {
		descriptions: { en: { value: "Russian novelist" } },
		claims: {
			P569: [
				{
					rank: "normal",
					mainsnak: {
						snaktype: "value",
						datavalue: {
							value: { time: "+1821-11-11T00:00:00Z", precision: 11 },
						},
					},
				},
			],
			P570: [
				{
					mainsnak: {
						snaktype: "value",
						datavalue: {
							value: { time: "+1881-00-00T00:00:00Z", precision: 9 },
						},
					},
				},
			],
			P19: [
				{
					mainsnak: { snaktype: "value", datavalue: { value: { id: "Q649" } } },
				},
			],
			P27: [
				{
					rank: "deprecated",
					mainsnak: { snaktype: "value", datavalue: { value: { id: "Q1" } } },
				},
				{
					mainsnak: { snaktype: "value", datavalue: { value: { id: "Q159" } } },
				},
			],
			P21: [
				{
					mainsnak: {
						snaktype: "value",
						datavalue: { value: { id: "Q6581097" } },
					},
				},
			],
			P18: [
				{
					mainsnak: {
						snaktype: "value",
						datavalue: { value: "Dostoevsky_1872.jpg" },
					},
				},
			],
		},
		sitelinks: { enwiki: { title: "Fyodor Dostoevsky" } },
	};

	test("reads dates, ids, gender, image", () => {
		const json = { entities: { Q991: entity } };
		const parsed = parseWikidataAuthor(
			wikidataEntityFrom(json, "Q991"),
			"Q991",
		);
		expect(parsed).toMatchObject({
			birth: { year: 1821, month: 11, day: 11 },
			death: { year: 1881, month: null, day: null },
			birthPlaceId: "Q649",
			citizenshipIds: ["Q159"],
			gender: "male",
			wikipediaTitle: "Fyodor Dostoevsky",
			imageFile: "Dostoevsky_1872.jpg",
			description: "Russian novelist",
		});
	});

	test("time precision and BC", () => {
		expect(
			parseWikidataTime({ time: "-0384-00-00T00:00:00Z", precision: 9 }),
		).toEqual({
			year: -384,
			month: null,
			day: null,
		});
		expect(
			parseWikidataTime({ time: "+1900-05-01T00:00:00Z", precision: 7 }).year,
		).toBeNull();
	});

	test("place and country code", () => {
		expect(
			parseWikidataPlace({
				labels: { en: { value: "Russia" } },
				claims: {
					P297: [
						{ mainsnak: { snaktype: "value", datavalue: { value: "RU" } } },
					],
				},
			}),
		).toEqual({ label: "Russia", countryCode: "RU" });
		expect(parseWikidataPlace(null)).toEqual({
			label: null,
			countryCode: null,
		});
	});
});

describe("Wikipedia, Commons, names", () => {
	test("summary skips disambiguation pages", () => {
		expect(
			parseWikipediaSummary({ type: "disambiguation", extract: "x" }),
		).toBeNull();
		expect(
			parseWikipediaSummary({
				type: "standard",
				extract: " Text. ",
				description: "Writer",
				content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/X" } },
			}),
		).toEqual({
			extract: "Text.",
			description: "Writer",
			pageUrl: "https://en.wikipedia.org/wiki/X",
		});
	});

	test("title from url", () => {
		expect(
			wikipediaTitleFromUrl("http://en.wikipedia.org/wiki/Fyodor_Dostoevsky"),
		).toEqual({
			host: "en.wikipedia.org",
			title: "Fyodor_Dostoevsky",
		});
		expect(wikipediaTitleFromUrl("https://example.com/wiki/X")).toBeNull();
	});

	test("commons info needs a free licence", () => {
		const page = (license: string) => ({
			query: {
				pages: {
					"1": {
						imageinfo: [
							{
								thumburl: "https://upload.wikimedia.org/x/800px-a.jpg",
								descriptionurl: "https://commons.wikimedia.org/wiki/File:a.jpg",
								mime: "image/jpeg",
								extmetadata: {
									LicenseShortName: { value: license },
									Artist: { value: '<a href="x">Jane Doe</a>' },
								},
							},
						],
					},
				},
			},
		});
		expect(parseCommonsImageInfo(page("CC BY-SA 4.0"), "a.jpg")).toMatchObject({
			credit: "Jane Doe",
			license: "CC BY-SA 4.0",
		});
		expect(
			parseCommonsImageInfo(page("Public domain"), "a.jpg"),
		).not.toBeNull();
		expect(
			parseCommonsImageInfo(page("All rights reserved"), "a.jpg"),
		).toBeNull();
	});

	test("sort name", () => {
		expect(sortNameFor("J. R. R. Tolkien")).toBe("Tolkien, J. R. R.");
		expect(sortNameFor("Martin Luther King Jr.")).toBe(
			"King, Martin Luther Jr.",
		);
		expect(sortNameFor("Voltaire")).toBeNull();
	});
});
