import { describe, expect, test } from "bun:test";
import {
	commentMediaConflict,
	contentMapMarkerPoint,
	validateContentMap,
} from "./content-map";

describe("validateContentMap", () => {
	test("accepts centre-only map", () => {
		expect(
			validateContentMap({
				centerLng: 10,
				centerLat: 20,
				zoom: 5,
				markerLng: null,
				markerLat: null,
			}),
		).toBeNull();
	});

	test("rejects partial marker", () => {
		expect(
			validateContentMap({
				centerLng: 10,
				centerLat: 20,
				zoom: 5,
				markerLng: 1,
				markerLat: null,
			}),
		).toBeTruthy();
	});
});

describe("contentMapMarkerPoint", () => {
	test("falls back to centre", () => {
		expect(
			contentMapMarkerPoint({
				centerLng: 1,
				centerLat: 2,
				zoom: 3,
				markerLng: null,
				markerLat: null,
			}),
		).toEqual({ lng: 1, lat: 2 });
	});
});

describe("commentMediaConflict", () => {
	test("allows one medium", () => {
		expect(commentMediaConflict({ map: true })).toBeNull();
	});

	test("blocks map and image", () => {
		expect(commentMediaConflict({ map: true, image: true })).toBeTruthy();
	});
});
