let audioContext: AudioContext | null = null;

/** Short, quiet chime — no asset file; respects reduced motion preference loosely via caller. */
export function playNotificationChime(): void {
	if (typeof window === "undefined") {
		return;
	}

	try {
		audioContext ??= new AudioContext();
		const ctx = audioContext;
		if (ctx.state === "suspended") {
			void ctx.resume();
		}

		const oscillator = ctx.createOscillator();
		const gain = ctx.createGain();
		oscillator.type = "sine";
		oscillator.frequency.setValueAtTime(880, ctx.currentTime);
		oscillator.frequency.exponentialRampToValueAtTime(
			660,
			ctx.currentTime + 0.12,
		);
		gain.gain.setValueAtTime(0.0001, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.04, ctx.currentTime + 0.02);
		gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);

		oscillator.connect(gain);
		gain.connect(ctx.destination);
		oscillator.start(ctx.currentTime);
		oscillator.stop(ctx.currentTime + 0.2);
	} catch {
		// autoplay policy or unsupported
	}
}
