/**
 * Reading Mode sounds. Edit this file to change what members can pick; nothing
 * else needs to change.
 *
 * - `generated`: made in the browser (no file, no licence, loops forever).
 * - `file`: a recording we host. Add the file under `apps/web/public/sounds/`
 *   and set `src`; entries without a `src` stay hidden. Use **MP3, stereo,
 *   44.1 kHz, about 128 kbps, 60 to 120 seconds** (1 to 2 MB). The browser
 *   decodes the whole file into memory (about 10 MB per minute of stereo), so
 *   long files cost memory, not just download time. The loop point is smoothed
 *   in code, so the cut does not need to be perfect. To convert and trim:
 *   `ffmpeg -i input.wav -ss 30 -t 90 -ar 44100 -ac 2 -b:a 128k cafe.mp3`.
 * - YouTube: an embedded stream or long mix. Only videos that allow embedding
 *   work, and a video can be taken down later, so check the list now and then.
 */

export type AmbientSound = {
	id: string;
	label: string;
	kind: "generated" | "file";
	/** For `file` sounds: the loop, relative to the site root. Hidden while empty. */
	src?: string | null;
};

export const AMBIENT_SOUNDS: readonly AmbientSound[] = [
	{ id: "rain", label: "Rain", kind: "generated" },
	{ id: "fire", label: "Fireplace", kind: "generated" },
	{ id: "wind", label: "Soft wind", kind: "generated" },
	{ id: "cafe", label: "Café", kind: "file", src: "/sounds/cafe_ambient.mp3" },
	{
		id: "forest",
		label: "Forest",
		kind: "file",
		src: "/sounds/forest_ambience.mp3",
	},
];

export function availableAmbientSounds(): AmbientSound[] {
	return AMBIENT_SOUNDS.filter(
		(sound) => sound.kind === "generated" || Boolean(sound.src),
	);
}

export type MusicStation = {
	id: string;
	/** The YouTube video id. */
	videoId: string;
	label: string;
	group: "lofi" | "classical";
};

/**
 * Streams and long mixes members can read to. Each id was checked on
 * 2026-10-29 to be public and embeddable. Lofi Girl's streams were left out on
 * purpose: their main stream id changed and the current ones are seasonal.
 */
export const MUSIC_STATIONS: readonly MusicStation[] = [
	{
		id: "chillhop-radio",
		videoId: "5yx6BWlEVcY",
		label: "Chillhop Radio (live)",
		group: "lofi",
	},
	{
		id: "chillhop-cafe",
		videoId: "QyGbnE-RHKA",
		label: "Chillhop Plant Café (live)",
		group: "lofi",
	},
	{
		id: "chillhop-daydreams",
		videoId: "Cae61o04YRU",
		label: "Chillhop daydreams",
		group: "lofi",
	},
	{
		id: "classical-soul",
		videoId: "-ZIgEHLh1Lw",
		label: "Classical for the soul",
		group: "classical",
	},
	{
		id: "classical-30",
		videoId: "d3LED8ieSfc",
		label: "30 beautiful classical works",
		group: "classical",
	},
	{
		id: "classical-100",
		videoId: "2uUv5VBAtBk",
		label: "100 beautiful pieces",
		group: "classical",
	},
	{
		id: "debussy",
		videoId: "0DKHswQbr_8",
		label: "Gentle Debussy",
		group: "classical",
	},
];

export const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
