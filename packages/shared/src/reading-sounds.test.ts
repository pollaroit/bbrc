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

describe("recorded loops", () => {
	test("each one points inside the sounds folder and is an mp3", async () => {
		const { AMBIENT_SOUNDS } = await import("./reading-sounds");
		for (const sound of AMBIENT_SOUNDS) {
			if (sound.kind === "file" && sound.src) {
				expect(sound.src.startsWith("/sounds/")).toBe(true);
				expect(sound.src.endsWith(".mp3")).toBe(true);
			}
		}
	});
});
