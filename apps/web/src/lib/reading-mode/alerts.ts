/*
 * The signals Reading Mode gives when a countdown or a pomodoro phase ends: a
 * soft chime, a vibration, and a notification when the member allowed one.
 * The chime is made in the browser, so there is no sound file to host.
 */

let context: AudioContext | null = null;

type AudioSessionNavigator = Navigator & {
	audioSession?: { type: string };
};

/** One audio context for the whole page. Call this from a tap so the browser lets it play. */
export function getAudioContext(): AudioContext | null {
	if (typeof window === "undefined") return null;
	if (!context) {
		const Ctor =
			window.AudioContext ??
			(window as unknown as { webkitAudioContext?: typeof AudioContext })
				.webkitAudioContext;
		if (!Ctor) return null;
		context = new Ctor();
	}
	return context;
}

/** Wakes the audio up from a tap, and asks iPhones to play even with the silent switch on (where supported). */
export async function unlockAudio(): Promise<void> {
	const ctx = getAudioContext();
	try {
		const session = (navigator as AudioSessionNavigator).audioSession;
		if (session && session.type !== "playback") session.type = "playback";
	} catch {
		// Not supported: nothing to do.
	}
	if (ctx && ctx.state !== "running") {
		try {
			await ctx.resume();
		} catch {
			// The browser said no; the next tap will try again.
		}
	}
}

/** Two soft notes. `double` is a little longer, for "break over". */
export function playChime(kind: "single" | "double" = "single") {
	const ctx = getAudioContext();
	if (ctx?.state !== "running") return;
	const notes = kind === "double" ? [659.25, 880, 1174.66] : [880, 1174.66];
	const start = ctx.currentTime + 0.02;
	notes.forEach((frequency, index) => {
		const at = start + index * 0.28;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "sine";
		osc.frequency.value = frequency;
		gain.gain.setValueAtTime(0.0001, at);
		gain.gain.exponentialRampToValueAtTime(0.22, at + 0.03);
		gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.1);
		osc.connect(gain).connect(ctx.destination);
		osc.start(at);
		osc.stop(at + 1.15);
	});
}

export function vibrate(pattern: number | number[] = [220, 120, 220]) {
	try {
		navigator.vibrate?.(pattern);
	} catch {
		// Not supported (iPhones), which is fine.
	}
}

export function notificationsSupported() {
	return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission():
	| NotificationPermission
	| "unsupported" {
	return notificationsSupported() ? Notification.permission : "unsupported";
}

export async function askNotificationPermission(): Promise<
	NotificationPermission | "unsupported"
> {
	if (!notificationsSupported()) return "unsupported";
	if (Notification.permission !== "default") return Notification.permission;
	try {
		return await Notification.requestPermission();
	} catch {
		return Notification.permission;
	}
}

/** A system notification, through the installed app's worker when there is one (more reliable on phones). */
export async function showNotification(title: string, body: string) {
	if (!notificationsSupported() || Notification.permission !== "granted")
		return;
	const options: NotificationOptions = {
		body,
		tag: "reading-mode",
		icon: "/icon1.png",
	};
	try {
		const registration = await navigator.serviceWorker?.getRegistration();
		if (registration) {
			await registration.showNotification(title, options);
			return;
		}
	} catch {
		// Fall back to a plain notification.
	}
	try {
		new Notification(title, options);
	} catch {
		// Some mobile browsers only allow it through a worker.
	}
}

/** Everything at once, for a timer boundary. */
export function signal(kind: "single" | "double", title: string, body: string) {
	playChime(kind);
	vibrate(kind === "double" ? [250, 120, 250, 120, 250] : [220, 120, 220]);
	if (
		typeof document !== "undefined" &&
		document.visibilityState === "hidden"
	) {
		void showNotification(title, body);
	}
}
