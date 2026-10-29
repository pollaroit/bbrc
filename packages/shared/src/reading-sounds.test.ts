import { describe, expect, test } from "bun:test";
import { MUSIC_STATIONS, YOUTUBE_VIDEO_ID } from "./reading-sounds";

describe("music stations", () => {
	test("every entry has a real-looking video id and a unique name", () => {
		for (const station of MUSIC_STATIONS) {
			expect(YOUTUBE_VIDEO_ID.test(station.videoId)).toBe(true);
		}
		expect(new Set(MUSIC_STATIONS.map((s) => s.id)).size).toBe(
			MUSIC_STATIONS.length,
		);
		expect(new Set(MUSIC_STATIONS.map((s) => s.videoId)).size).toBe(
			MUSIC_STATIONS.length,
		);
	});
});
