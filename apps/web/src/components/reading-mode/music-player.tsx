"use client";

import { Button } from "@bbrc/ui/components/button";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Sounds } from "@/components/reading-mode/use-sounds";
import { loadYouTubeApi, type YouTubePlayer } from "@/lib/reading-mode/youtube";

/**
 * The YouTube player for the chosen station. It stays visible (small, in a
 * corner) while music plays, because the embed is meant to be seen, and it has
 * its own stop button. If the video cannot play, it says so.
 */
export function MusicMiniPlayer({ sounds }: { sounds: Sounds }) {
	const { station, musicPlaying, musicVolume, chooseStation } = sounds;
	const host = useRef<HTMLDivElement>(null);
	const player = useRef<YouTubePlayer | null>(null);
	const [error, setError] = useState<string | null>(null);
	const lastId = useRef<string | null>(null);
	const volume = useRef(musicVolume);
	volume.current = musicVolume;

	const videoId = station?.videoId ?? null;

	// Create the player once a station is chosen; switch videos on it afterwards.
	useEffect(() => {
		if (!videoId) return;
		let cancelled = false;
		setError(null);

		async function mount() {
			try {
				const api = await loadYouTubeApi();
				if (cancelled || !host.current) return;
				if (player.current) {
					if (lastId.current !== videoId) {
						player.current.loadVideoById(videoId as string);
					}
					lastId.current = videoId;
					return;
				}
				const element = document.createElement("div");
				host.current.replaceChildren(element);
				lastId.current = videoId;
				player.current = new api.Player(element, {
					width: "100%",
					height: "100%",
					videoId: videoId as string,
					playerVars: {
						autoplay: 1,
						playsinline: 1,
						rel: 0,
						modestbranding: 1,
					},
					events: {
						onReady: (event) => {
							event.target.setVolume(volume.current);
							event.target.playVideo();
						},
						onError: () =>
							setError("This one will not play here. Try another station."),
					},
				});
			} catch (failure) {
				if (!cancelled) {
					setError(
						failure instanceof Error
							? failure.message
							: "Music could not load.",
					);
				}
			}
		}
		void mount();
		return () => {
			cancelled = true;
		};
	}, [videoId]);

	useEffect(() => {
		player.current?.setVolume(musicVolume);
	}, [musicVolume]);

	useEffect(() => {
		const current = player.current;
		if (!current || !videoId) return;
		try {
			if (musicPlaying) current.playVideo();
			else current.pauseVideo();
		} catch {
			// The player is not ready yet; it starts by itself when it is.
		}
	}, [musicPlaying, videoId]);

	useEffect(
		() => () => {
			try {
				player.current?.destroy();
			} catch {
				// Already gone.
			}
			player.current = null;
		},
		[],
	);

	if (!station) return null;

	return (
		<div className="fixed bottom-28 left-3 z-20 w-52 border border-border bg-card shadow-md">
			<div className="flex items-center justify-between gap-1 border-border border-b px-2 py-1">
				<span className="min-w-0 truncate text-xs">{station.label}</span>
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					aria-label="Stop the music"
					onClick={() => void chooseStation(null)}
				>
					<X aria-hidden />
				</Button>
			</div>
			<div ref={host} className="aspect-video w-full bg-muted" />
			{error ? (
				<p className="p-2 text-destructive text-xs" role="status">
					{error}
				</p>
			) : null}
		</div>
	);
}
