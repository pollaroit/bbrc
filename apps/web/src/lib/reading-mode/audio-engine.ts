import { getAudioContext } from "@/lib/reading-mode/alerts";

/*
 * Ambient sounds for Reading Mode.
 *
 * Rain, fireplace and wind are made in the browser from filtered noise, so they
 * need no files, no licence and never end. A recorded loop (café, forest) can be
 * added in `reading-sounds.ts`. Everything goes through Web Audio because phones
 * ignore the volume of a normal audio element but obey a gain node.
 */

type Channel = {
	gain: GainNode;
	stop: () => void;
};

function noiseBuffer(
	ctx: AudioContext,
	seconds: number,
	colour: "white" | "brown",
): AudioBuffer {
	const length = Math.floor(ctx.sampleRate * seconds);
	const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	let last = 0;
	for (let index = 0; index < length; index++) {
		const white = Math.random() * 2 - 1;
		if (colour === "white") {
			data[index] = white;
		} else {
			last = (last + 0.02 * white) / 1.02;
			data[index] = last * 3.5;
		}
	}
	// Crossfade the ends so the loop has no click.
	const fade = Math.floor(ctx.sampleRate * 0.05);
	for (let index = 0; index < fade; index++) {
		const mix = index / fade;
		const head = data[index] ?? 0;
		const tail = data[length - fade + index] ?? 0;
		data[index] = head * mix + tail * (1 - mix);
	}
	return buffer;
}

/** Sparse little clicks with a short decay, like embers. */
function crackleBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
	const length = Math.floor(ctx.sampleRate * seconds);
	const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	const clicks = Math.floor(seconds * 9);
	for (let click = 0; click < clicks; click++) {
		const at = Math.floor(Math.random() * (length - 2000));
		const strength = 0.25 + Math.random() * 0.75;
		const decay = 40 + Math.random() * 160;
		const size = Math.floor(ctx.sampleRate * (0.004 + Math.random() * 0.012));
		for (let index = 0; index < size; index++) {
			const sample =
				(Math.random() * 2 - 1) * strength * Math.exp(-index / decay);
			data[at + index] = (data[at + index] ?? 0) + sample;
		}
	}
	return buffer;
}

function loop(ctx: AudioContext, buffer: AudioBuffer) {
	const source = ctx.createBufferSource();
	source.buffer = buffer;
	source.loop = true;
	return source;
}

/** A slow wobble, so a steady noise breathes a little. */
function wobble(
	ctx: AudioContext,
	target: AudioParam,
	rate: number,
	depth: number,
): OscillatorNode {
	const lfo = ctx.createOscillator();
	const amount = ctx.createGain();
	lfo.frequency.value = rate;
	amount.gain.value = depth;
	lfo.connect(amount).connect(target);
	lfo.start();
	return lfo;
}

function buildRain(ctx: AudioContext, out: AudioNode): () => void {
	const body = loop(ctx, noiseBuffer(ctx, 6, "white"));
	const high = ctx.createBiquadFilter();
	high.type = "highpass";
	high.frequency.value = 900;
	const low = ctx.createBiquadFilter();
	low.type = "lowpass";
	low.frequency.value = 7500;
	const level = ctx.createGain();
	level.gain.value = 0.55;
	body.connect(high).connect(low).connect(level).connect(out);

	const patter = loop(ctx, noiseBuffer(ctx, 5, "white"));
	const band = ctx.createBiquadFilter();
	band.type = "bandpass";
	band.frequency.value = 2400;
	band.Q.value = 0.7;
	const patterLevel = ctx.createGain();
	patterLevel.gain.value = 0.22;
	patter.connect(band).connect(patterLevel).connect(out);

	const lfo = wobble(ctx, level.gain, 0.17, 0.08);
	body.start();
	patter.start();
	return () => {
		for (const node of [body, patter, lfo]) {
			try {
				node.stop();
			} catch {
				// Already stopped.
			}
		}
	};
}

function buildWind(ctx: AudioContext, out: AudioNode): () => void {
	const source = loop(ctx, noiseBuffer(ctx, 8, "brown"));
	const filter = ctx.createBiquadFilter();
	filter.type = "lowpass";
	filter.frequency.value = 520;
	filter.Q.value = 0.6;
	const level = ctx.createGain();
	level.gain.value = 0.9;
	source.connect(filter).connect(level).connect(out);
	const sweep = wobble(ctx, filter.frequency, 0.06, 220);
	const swell = wobble(ctx, level.gain, 0.09, 0.25);
	source.start();
	return () => {
		for (const node of [source, sweep, swell]) {
			try {
				node.stop();
			} catch {
				// Already stopped.
			}
		}
	};
}

function buildFire(ctx: AudioContext, out: AudioNode): () => void {
	const bed = loop(ctx, noiseBuffer(ctx, 7, "brown"));
	const warm = ctx.createBiquadFilter();
	warm.type = "lowpass";
	warm.frequency.value = 380;
	const bedLevel = ctx.createGain();
	bedLevel.gain.value = 0.55;
	bed.connect(warm).connect(bedLevel).connect(out);

	const crackle = loop(ctx, crackleBuffer(ctx, 9));
	const band = ctx.createBiquadFilter();
	band.type = "bandpass";
	band.frequency.value = 2600;
	band.Q.value = 0.5;
	const crackleLevel = ctx.createGain();
	crackleLevel.gain.value = 1.4;
	crackle.connect(band).connect(crackleLevel).connect(out);

	const flicker = wobble(ctx, bedLevel.gain, 0.4, 0.12);
	bed.start();
	crackle.start();
	return () => {
		for (const node of [bed, crackle, flicker]) {
			try {
				node.stop();
			} catch {
				// Already stopped.
			}
		}
	};
}

const BUILDERS: Record<
	string,
	(ctx: AudioContext, out: AudioNode) => () => void
> = {
	rain: buildRain,
	wind: buildWind,
	fire: buildFire,
};

/** The mixer: any number of sounds at once, each with its own volume. */
export class AmbientMixer {
	private channels = new Map<string, Channel>();
	private loading = new Set<string>();

	isOn(id: string): boolean {
		return this.channels.has(id);
	}

	async start(id: string, volume: number, src?: string | null): Promise<void> {
		const ctx = getAudioContext();
		if (!ctx || this.channels.has(id) || this.loading.has(id)) return;
		if (ctx.state !== "running") await ctx.resume().catch(() => undefined);

		const gain = ctx.createGain();
		gain.gain.value = volume;
		gain.connect(ctx.destination);

		const builder = BUILDERS[id];
		if (builder) {
			this.channels.set(id, { gain, stop: builder(ctx, gain) });
			return;
		}
		if (!src) {
			gain.disconnect();
			return;
		}

		// A recorded loop.
		this.loading.add(id);
		try {
			const response = await fetch(src);
			const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
			const source = loop(ctx, buffer);
			source.connect(gain);
			source.start();
			this.channels.set(id, {
				gain,
				stop: () => {
					try {
						source.stop();
					} catch {
						// Already stopped.
					}
				},
			});
		} catch {
			gain.disconnect();
		} finally {
			this.loading.delete(id);
		}
	}

	setVolume(id: string, volume: number) {
		const channel = this.channels.get(id);
		const ctx = getAudioContext();
		if (!channel || !ctx) return;
		// A short ramp, so moving the slider never crackles.
		channel.gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.05);
	}

	stop(id: string) {
		const channel = this.channels.get(id);
		if (!channel) return;
		channel.stop();
		channel.gain.disconnect();
		this.channels.delete(id);
	}

	stopAll() {
		for (const id of [...this.channels.keys()]) this.stop(id);
	}
}
