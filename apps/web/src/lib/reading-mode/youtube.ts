/*
 * A thin wrapper over the YouTube IFrame Player API, loaded only when someone
 * opens the music list. Only videos that allow embedding will play.
 */

export type YouTubePlayer = {
	playVideo: () => void;
	pauseVideo: () => void;
	setVolume: (volume: number) => void;
	loadVideoById: (id: string) => void;
	getPlayerState: () => number;
	destroy: () => void;
};

type YouTubeApi = {
	Player: new (
		element: HTMLElement | string,
		options: {
			height?: string | number;
			width?: string | number;
			videoId?: string;
			playerVars?: Record<string, string | number>;
			events?: {
				onReady?: (event: { target: YouTubePlayer }) => void;
				onStateChange?: (event: {
					data: number;
					target: YouTubePlayer;
				}) => void;
				onError?: (event: { data: number }) => void;
			};
		},
	) => YouTubePlayer;
	PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
};

declare global {
	interface Window {
		YT?: YouTubeApi;
		onYouTubeIframeAPIReady?: () => void;
	}
}

let apiPromise: Promise<YouTubeApi> | null = null;

export function loadYouTubeApi(): Promise<YouTubeApi> {
	if (typeof window === "undefined") {
		return Promise.reject(new Error("No window"));
	}
	if (window.YT?.Player) return Promise.resolve(window.YT);
	if (apiPromise) return apiPromise;

	apiPromise = new Promise<YouTubeApi>((resolve, reject) => {
		const previous = window.onYouTubeIframeAPIReady;
		window.onYouTubeIframeAPIReady = () => {
			previous?.();
			if (window.YT?.Player) resolve(window.YT);
			else reject(new Error("YouTube did not load."));
		};
		const script = document.createElement("script");
		script.src = "https://www.youtube.com/iframe_api";
		script.async = true;
		script.onerror = () => {
			apiPromise = null;
			reject(new Error("YouTube could not be reached."));
		};
		document.head.appendChild(script);
	});
	return apiPromise;
}
