"use client";

import { Button } from "@bbrc/ui/components/button";
import { ExternalLink, Loader2, Pause, Play, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Sounds } from "@/components/reading-mode/use-sounds";
import { loadYouTubeApi, type YouTubePlayer } from "@/lib/reading-mode/youtube";

const STARTUP_GRACE_MS = 4500;

function errorText(code: number): string {
	switch (code) {
		case 100:
			return "This video was taken down.";
		case 101:
		case 150:
			return "The owner does not allow this video to play here.";
		case 2:
			return "This video link is not valid.";
		default:
			return "This one will not play here. Try another.";
	}
}

/**
 * The YouTube player for the chosen station, with our own controls. It stays on
 * screen while music plays (the embed is meant to be seen). It reports what it
 * is doing, so the station buttons can show loading, playing or a problem, and
 * if the browser refuses to start it by itself it asks for one tap.
 */
export function NowPlaying({ sounds }: { sounds: Sounds }) {
	const {
		station,
		musicStatus,
		musicError,
		musicVolume,
		reportMusic,
		chooseStation,
	} = sounds;
	const host = useRef<HTMLDivElement>(null);
	const player = useRef<YouTubePlayer | null>(null);
	const loadedId = useRef<string | null>(null);
	const volume = useRef(musicVolume);
	volume.current = musicVolume;
	const graceTimer = useRef<number | null>(null);

	const videoId = station?.videoId ?? null;

	useEffect(() => {
		if (!videoId) return;
		let cancelled = false;

		function startGrace() {
			if (graceTimer.current) window.clearTimeout(graceTimer.current);
			// Still not playing after a moment: the browser held it back for want of a tap.
			graceTimer.current = window.setTimeout(() => {
				const state = player.current?.getPlayerState?.();
				if (state !== 1 && state !== 3) reportMusic("blocked");
			}, STARTUP_GRACE_MS);
		}

		async function mount() {
			try {
				const api = await loadYouTubeApi();
				if (cancelled || !host.current) return;

				if (player.current) {
					if (loadedId.current !== videoId) {
						player.current.loadVideoById(videoId as string);
						loadedId.current = videoId;
						startGrace();
					}
					return;
				}

				const element = document.createElement("div");
				host.current.replaceChildren(element);
				loadedId.current = videoId;
				player.current = new api.Player(element, {
					width: "100%",
					height: "100%",
					videoId: videoId as string,
					host: "https://www.youtube-nocookie.com",
					playerVars: {
						autoplay: 1,
						playsinline: 1,
						rel: 0,
						modestbranding: 1,
						origin: window.location.origin,
					},
					events: {
						onReady: (event) => {
							event.target.setVolume(volume.current);
							event.target.playVideo();
							startGrace();
						},
						onStateChange: (event) => {
							// -1 not started, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued.
							if (event.data === 1) reportMusic("playing");
							else if (event.data === 2) reportMusic("paused");
							else if (event.data === 3) reportMusic("loading");
						},
						onError: (event) => reportMusic("error", errorText(event.data)),
					},
				});
			} catch (failure) {
				if (!cancelled) {
					reportMusic(
						"error",
						failure instanceof Error
							? failure.message
							: "Music could not load. Check your connection.",
					);
				}
			}
		}
		void mount();
		return () => {
			cancelled = true;
		};
	}, [videoId, reportMusic]);

	useEffect(() => {
		player.current?.setVolume(musicVolume);
	}, [musicVolume]);

	useEffect(
		() => () => {
			if (graceTimer.current) window.clearTimeout(graceTimer.current);
			try {
				player.current?.destroy();
			} catch {
				// Already gone.
			}
			player.current = null;
			loadedId.current = null;
		},
		[],
	);

	if (!station) return null;

	const playing = musicStatus === "playing";
	const loading = musicStatus === "loading";

	return (
		<section
			aria-label="Now playing"
			className="flex flex-col border border-border bg-card"
		>
			<div className="relative aspect-video w-full bg-muted">
				<div ref={host} className="absolute inset-0 size-full" />
				{loading ? (
					<span className="pointer-events-none absolute inset-0 grid place-items-center bg-background/60">
						<Loader2
							className="size-6 animate-spin motion-reduce:animate-none"
							aria-hidden
						/>
					</span>
				) : null}
			</div>
			<div className="flex items-center gap-2 p-2">
				<div className="min-w-0 flex-1">
					<p className="truncate font-medium text-sm">{station.label}</p>
					<p
						className="truncate text-muted-foreground text-xs"
						role="status"
						aria-live="polite"
					>
						{musicError ??
							(musicStatus === "blocked"
								? "Your browser needs a tap to start it."
								: loading
									? "Loading…"
									: playing
										? "Playing"
										: "Paused")}
					</p>
				</div>
				<Button
					type="button"
					variant={musicStatus === "blocked" ? "default" : "outline"}
					size="icon"
					className="size-10"
					aria-label={playing ? "Pause the music" : "Play the music"}
					onClick={() => {
						const current = player.current;
						if (!current) return;
						if (playing) current.pauseVideo();
						else current.playVideo();
					}}
				>
					{playing ? <Pause aria-hidden /> : <Play aria-hidden />}
				</Button>
				<a
					href={`https://www.youtube.com/watch?v=${station.videoId}`}
					target="_blank"
					rel="noreferrer"
					aria-label="Open on YouTube"
					title="Open on YouTube"
					className="grid size-10 place-items-center border border-border text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2"
				>
					<ExternalLink className="size-4" aria-hidden />
				</a>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="size-10"
					aria-label="Stop the music"
					onClick={() => void chooseStation(null)}
				>
					<X aria-hidden />
				</Button>
			</div>
		</section>
	);
}
