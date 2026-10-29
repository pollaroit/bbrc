"use client";

import {
	availableAmbientSounds,
	MUSIC_STATIONS,
	type MusicStation,
} from "@bbrc/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { unlockAudio } from "@/lib/reading-mode/alerts";
import { AmbientMixer } from "@/lib/reading-mode/audio-engine";

const KEY = "bbrc:reading-mode:sounds";

type Saved = {
	volumes: Record<string, number>;
	musicVolume: number;
	stationId: string | null;
};

function load(): Saved {
	try {
		const raw = window.localStorage.getItem(KEY);
		if (raw) return JSON.parse(raw) as Saved;
	} catch {
		// A convenience only.
	}
	return { volumes: {}, musicVolume: 60, stationId: null };
}

/**
 * What the music is doing: `loading` while the player and the video load,
 * `blocked` when the browser would not start it by itself (one tap does), and
 * `error` when the video cannot be played here.
 */
export type MusicStatus =
	| "idle"
	| "loading"
	| "playing"
	| "paused"
	| "blocked"
	| "error";

/**
 * The sounds of one Reading Mode visit: ambient loops (any mix), and one music
 * station. Nothing starts by itself, because phones only allow sound after a tap.
 */
export function useSounds() {
	const mixer = useRef<AmbientMixer | null>(null);
	const [on, setOn] = useState<Record<string, boolean>>({});
	const [starting, setStarting] = useState<Record<string, boolean>>({});
	const [volumes, setVolumes] = useState<Record<string, number>>({});
	const [musicVolume, setMusicVolume] = useState(60);
	const [stationId, setStationId] = useState<string | null>(null);
	const [musicStatus, setMusicStatus] = useState<MusicStatus>("idle");
	const [musicError, setMusicError] = useState<string | null>(null);
	const ready = useRef(false);

	const sounds = useMemo(() => availableAmbientSounds(), []);

	useEffect(() => {
		mixer.current = new AmbientMixer();
		const saved = load();
		setVolumes(saved.volumes);
		setMusicVolume(saved.musicVolume);
		// The station is remembered, but never started by itself.
		ready.current = true;
		return () => mixer.current?.stopAll();
	}, []);

	useEffect(() => {
		if (!ready.current) return;
		try {
			window.localStorage.setItem(
				KEY,
				JSON.stringify({ volumes, musicVolume, stationId } satisfies Saved),
			);
		} catch {
			// A convenience only.
		}
	}, [volumes, musicVolume, stationId]);

	const volumeOf = useCallback(
		(id: string) => (volumes[id] ?? 50) / 100,
		[volumes],
	);

	const toggle = useCallback(
		async (id: string) => {
			const current = mixer.current;
			if (!current) return;
			if (current.isOn(id)) {
				current.stop(id);
				setOn((state) => ({ ...state, [id]: false }));
				return;
			}
			setStarting((state) => ({ ...state, [id]: true }));
			try {
				await unlockAudio();
				const sound = sounds.find((entry) => entry.id === id);
				await current.start(id, volumeOf(id), sound?.src);
				setOn((state) => ({ ...state, [id]: current.isOn(id) }));
			} finally {
				setStarting((state) => ({ ...state, [id]: false }));
			}
		},
		[sounds, volumeOf],
	);

	const setVolume = useCallback((id: string, value: number) => {
		setVolumes((state) => ({ ...state, [id]: value }));
		mixer.current?.setVolume(id, value / 100);
	}, []);

	const station: MusicStation | null =
		MUSIC_STATIONS.find((entry) => entry.id === stationId) ?? null;

	const chooseStation = useCallback(async (id: string | null) => {
		if (id) await unlockAudio();
		setStationId(id);
		setMusicError(null);
		setMusicStatus(id ? "loading" : "idle");
	}, []);

	const reportMusic = useCallback(
		(status: MusicStatus, error: string | null = null) => {
			setMusicStatus(status);
			setMusicError(error);
		},
		[],
	);

	const stopAll = useCallback(() => {
		mixer.current?.stopAll();
		setOn({});
		setStationId(null);
		setMusicStatus("idle");
		setMusicError(null);
	}, []);

	const anyPlaying =
		Object.values(on).some(Boolean) ||
		(station != null &&
			(musicStatus === "playing" || musicStatus === "loading"));

	return {
		sounds,
		on,
		starting,
		volumes,
		volumeOf,
		toggle,
		setVolume,
		station,
		stations: MUSIC_STATIONS,
		chooseStation,
		musicVolume,
		setMusicVolume,
		musicStatus,
		musicError,
		reportMusic,
		stopAll,
		anyPlaying,
	};
}

export type Sounds = ReturnType<typeof useSounds>;
