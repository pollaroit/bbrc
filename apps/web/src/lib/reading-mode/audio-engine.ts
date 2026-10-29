import { getAudioContext } from "@/lib/reading-mode/alerts";

/*
 * Ambient sounds for Reading Mode, made in the browser.
 *
 * Each one is built the way sound designers build them, in layers, in stereo,
 * with a little randomness so it never loops audibly:
 *
 *  - rain: a wide pink-noise bed (two decorrelated channels), a mid "boiling"
 *    layer, a low rumble, and thousands of tiny synthesised drops;
 *  - fireplace: a low rumble and a soft roar, a faint hiss, and crackles and
 *    pops scheduled at random times (a Poisson process whose rate drifts);
 *  - wind: pink noise through a filter that wanders on slow, unrelated cycles,
 *    gusts that swell now and then, and a very quiet whistle.
 *
 * Everything runs through Web Audio because phones ignore the volume of a normal
 * audio element but obey a gain node. A recorded loop (café, forest) can be
 * added in `reading-sounds.ts`.
 */

type Channel = {
	gain: GainNode;
	stop: () => void;
};

type Disposer = () => void;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

// ── Noise ────────────────────────────────────────────────────────────────

/** Makes the end of a buffer flow into its start, so it can loop without a click. */
function seamless(source: Float32Array, fade: number): Float32Array {
	const length = source.length - fade;
	const out = new Float32Array(length);
	for (let index = 0; index < length; index++) {
		out[index] = source[index] ?? 0;
	}
	for (let index = 0; index < fade; index++) {
		const mix = index / fade;
		// Equal power, so the loop point is not quieter than the rest.
		const head = Math.sin((mix * Math.PI) / 2);
		const tail = Math.cos((mix * Math.PI) / 2);
		out[index] =
			(source[index] ?? 0) * head + (source[length + index] ?? 0) * tail;
	}
	return out;
}

function pinkData(samples: number): Float32Array {
	// Paul Kellet's refined filter: close to a true -3 dB per octave slope.
	let b0 = 0;
	let b1 = 0;
	let b2 = 0;
	let b3 = 0;
	let b4 = 0;
	let b5 = 0;
	let b6 = 0;
	const data = new Float32Array(samples);
	for (let index = 0; index < samples; index++) {
		const white = Math.random() * 2 - 1;
		b0 = 0.99886 * b0 + white * 0.0555179;
		b1 = 0.99332 * b1 + white * 0.0750759;
		b2 = 0.969 * b2 + white * 0.153852;
		b3 = 0.8665 * b3 + white * 0.3104856;
		b4 = 0.55 * b4 + white * 0.5329522;
		b5 = -0.7616 * b5 - white * 0.016898;
		data[index] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
		b6 = white * 0.115926;
	}
	return data;
}

function brownData(samples: number): Float32Array {
	let last = 0;
	const data = new Float32Array(samples);
	for (let index = 0; index < samples; index++) {
		last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
		data[index] = last * 3.5;
	}
	return data;
}

/** A looping stereo buffer; each channel is its own noise, so it sounds wide. */
function stereoNoise(
	ctx: AudioContext,
	seconds: number,
	kind: "pink" | "brown",
): AudioBuffer {
	const fade = Math.floor(ctx.sampleRate * 0.1);
	const total = Math.floor(ctx.sampleRate * seconds) + fade;
	const make = kind === "pink" ? pinkData : brownData;
	const left = seamless(make(total), fade);
	const right = seamless(make(total), fade);
	const buffer = ctx.createBuffer(2, left.length, ctx.sampleRate);
	buffer.copyToChannel(left as Float32Array<ArrayBuffer>, 0);
	buffer.copyToChannel(right as Float32Array<ArrayBuffer>, 1);
	return buffer;
}

/**
 * Makes a recording loop without a gap or a click, whatever its format: the
 * last second flows into the first (equal power). MP3 and AAC add a little
 * silence at each end, and recordings are rarely cut at a perfect loop point;
 * this hides both.
 */
function smoothLoop(ctx: AudioContext, source: AudioBuffer): AudioBuffer {
	const fade = Math.min(
		Math.floor(source.sampleRate * 1.5),
		Math.floor(source.length / 4),
	);
	const length = source.length - fade;
	if (fade < 1 || length < 1) return source;
	const out = ctx.createBuffer(
		source.numberOfChannels,
		length,
		source.sampleRate,
	);
	for (let channel = 0; channel < source.numberOfChannels; channel++) {
		const input = source.getChannelData(channel);
		const target = out.getChannelData(channel);
		target.set(input.subarray(0, length));
		for (let index = 0; index < fade; index++) {
			const mix = index / fade;
			target[index] =
				(input[index] ?? 0) * Math.sin((mix * Math.PI) / 2) +
				(input[length + index] ?? 0) * Math.cos((mix * Math.PI) / 2);
		}
	}
	return out;
}

function loop(ctx: AudioContext, buffer: AudioBuffer) {
	const source = ctx.createBufferSource();
	source.buffer = buffer;
	source.loop = true;
	return source;
}

function filter(
	ctx: AudioContext,
	type: BiquadFilterType,
	frequency: number,
	q = Math.SQRT1_2,
) {
	const node = ctx.createBiquadFilter();
	node.type = type;
	node.frequency.value = frequency;
	node.Q.value = q;
	return node;
}

function gainNode(ctx: AudioContext, value: number) {
	const node = ctx.createGain();
	node.gain.value = value;
	return node;
}

/** A slow wobble added to a parameter, so a steady sound breathes. */
function wobble(
	ctx: AudioContext,
	target: AudioParam,
	rate: number,
	depth: number,
): OscillatorNode {
	const lfo = ctx.createOscillator();
	lfo.frequency.value = rate;
	const amount = gainNode(ctx, depth);
	lfo.connect(amount).connect(target);
	lfo.start();
	return lfo;
}

function stopAll(nodes: (AudioScheduledSourceNode | null)[]) {
	for (const node of nodes) {
		try {
			node?.stop();
		} catch {
			// Already stopped.
		}
	}
}

// ── Rain ─────────────────────────────────────────────────────────────────

/** Thousands of tiny drops: a short pitched chirp each, spread across the stereo field. */
function dropsBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
	const rate = ctx.sampleRate;
	const length = Math.floor(rate * seconds);
	const buffer = ctx.createBuffer(2, length, rate);
	const left = buffer.getChannelData(0);
	const right = buffer.getChannelData(1);

	const add = (
		perSecond: number,
		low: number,
		high: number,
		ms: [number, number],
		loudness: number,
	) => {
		const drops = Math.floor(perSecond * seconds);
		for (let drop = 0; drop < drops; drop++) {
			const start = Math.floor(Math.random() * length);
			const base = rand(low, high);
			const duration = Math.floor((rate * rand(ms[0], ms[1])) / 1000);
			const level = Math.random() ** 2.2 * loudness;
			const pan = Math.random();
			for (let index = 0; index < duration; index++) {
				const time = index / rate;
				const progress = index / duration;
				// Each drop rings up in pitch as its bubble closes, then dies away.
				const frequency = base * (1 + 1.4 * progress);
				const sample =
					Math.sin(2 * Math.PI * frequency * time) *
					Math.exp((-6 * index) / duration) *
					level;
				// Wrapping round the end keeps the loop seamless.
				const at = (start + index) % length;
				left[at] = (left[at] ?? 0) + sample * (1 - pan);
				right[at] = (right[at] ?? 0) + sample * pan;
			}
		}
	};

	add(70, 1900, 4800, [4, 9], 0.7);
	add(26, 900, 1900, [8, 16], 0.5);
	add(8, 420, 900, [14, 28], 0.45);
	return buffer;
}

function buildRain(ctx: AudioContext, out: AudioNode): Disposer {
	const bed = loop(ctx, stereoNoise(ctx, 9, "pink"));
	const bedLevel = gainNode(ctx, 0.5);
	bed
		.connect(filter(ctx, "highpass", 260))
		.connect(filter(ctx, "lowpass", 8800))
		.connect(bedLevel)
		.connect(out);

	const boil = loop(ctx, stereoNoise(ctx, 7, "pink"));
	const boilLevel = gainNode(ctx, 0.22);
	boil
		.connect(filter(ctx, "bandpass", 1900, 0.8))
		.connect(boilLevel)
		.connect(out);

	const rumble = loop(ctx, stereoNoise(ctx, 11, "brown"));
	rumble
		.connect(filter(ctx, "lowpass", 170))
		.connect(gainNode(ctx, 0.1))
		.connect(out);

	const drops = loop(ctx, dropsBuffer(ctx, 12));
	drops
		.connect(filter(ctx, "highpass", 700))
		.connect(gainNode(ctx, 0.45))
		.connect(out);

	const swells = [
		wobble(ctx, bedLevel.gain, 0.045, 0.06),
		wobble(ctx, boilLevel.gain, 0.11, 0.05),
	];
	for (const source of [bed, boil, rumble, drops]) source.start();
	return () => stopAll([bed, boil, rumble, drops, ...swells]);
}

// ── Fireplace ────────────────────────────────────────────────────────────

/** A pool of short crackles: a few sharp little bursts that die away fast. */
function crackleBursts(ctx: AudioContext, count: number): AudioBuffer[] {
	const rate = ctx.sampleRate;
	return Array.from({ length: count }, () => {
		const length = Math.floor((rate * rand(28, 110)) / 1000);
		const buffer = ctx.createBuffer(1, length, rate);
		const data = buffer.getChannelData(0);
		const clicks = 1 + Math.floor(Math.random() * 3);
		for (let click = 0; click < clicks; click++) {
			const at = Math.floor(Math.random() * length * 0.6);
			const decay = rate * rand(0.0006, 0.004);
			const strength = rand(0.5, 1);
			for (let index = at; index < length; index++) {
				const sample = (Math.random() * 2 - 1) * strength;
				data[index] =
					(data[index] ?? 0) + sample * Math.exp(-(index - at) / decay);
			}
		}
		return buffer;
	});
}

function buildFire(ctx: AudioContext, out: AudioNode): Disposer {
	const rumble = loop(ctx, stereoNoise(ctx, 10, "brown"));
	const rumbleLevel = gainNode(ctx, 0.95);
	rumble
		.connect(filter(ctx, "lowpass", 150))
		.connect(rumbleLevel)
		.connect(out);

	const roar = loop(ctx, stereoNoise(ctx, 8, "brown"));
	const roarLevel = gainNode(ctx, 0.3);
	roar
		.connect(filter(ctx, "bandpass", 430, 0.5))
		.connect(roarLevel)
		.connect(out);

	const hiss = loop(ctx, stereoNoise(ctx, 6, "pink"));
	const hissLevel = gainNode(ctx, 0.05);
	hiss
		.connect(filter(ctx, "highpass", 3600))
		.connect(filter(ctx, "lowpass", 9500))
		.connect(hissLevel)
		.connect(out);

	const breathing = [
		wobble(ctx, rumbleLevel.gain, 0.19, 0.16),
		wobble(ctx, roarLevel.gain, 0.31, 0.12),
		wobble(ctx, hissLevel.gain, 0.13, 0.025),
	];

	// Crackles and pops arrive at random: scheduled a little ahead, so they stay
	// on time even when the page is busy.
	const bursts = crackleBursts(ctx, 18);
	const started = ctx.currentTime;
	let scheduledUntil = ctx.currentTime;
	const AHEAD = 0.4;

	function crackle(at: number) {
		const source = ctx.createBufferSource();
		source.buffer = bursts[Math.floor(Math.random() * bursts.length)] ?? null;
		source.playbackRate.value = rand(0.75, 1.5);
		const band = filter(ctx, "bandpass", rand(800, 5600), rand(0.8, 3.2));
		// Mostly quiet, now and then loud.
		const level = gainNode(ctx, 0.12 + Math.random() ** 3 * 1.1);
		const pan = ctx.createStereoPanner();
		pan.pan.value = rand(-0.85, 0.85);
		source.connect(band).connect(level).connect(pan).connect(out);
		source.start(at);
	}

	function pop(at: number) {
		const osc = ctx.createOscillator();
		osc.type = "sine";
		osc.frequency.setValueAtTime(rand(130, 240), at);
		osc.frequency.exponentialRampToValueAtTime(70, at + 0.08);
		const level = gainNode(ctx, 0.0001);
		level.gain.setValueAtTime(0.0001, at);
		level.gain.exponentialRampToValueAtTime(rand(0.25, 0.6), at + 0.004);
		level.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
		const pan = ctx.createStereoPanner();
		pan.pan.value = rand(-0.5, 0.5);
		osc.connect(level).connect(pan).connect(out);
		osc.start(at);
		osc.stop(at + 0.12);
		crackle(at);
	}

	const timer = window.setInterval(() => {
		const now = ctx.currentTime;
		if (scheduledUntil < now) scheduledUntil = now;
		while (scheduledUntil < now + AHEAD) {
			// The busyness drifts slowly: calm stretches, and livelier ones.
			const busy =
				7 + 5 * Math.sin(((scheduledUntil - started) * 2 * Math.PI) / 23);
			// Time to the next crackle: exponential, like a Poisson process.
			scheduledUntil += -Math.log(1 - Math.random()) / Math.max(2, busy);
			if (Math.random() < 0.06) pop(scheduledUntil);
			else crackle(scheduledUntil);
		}
	}, 110);

	for (const source of [rumble, roar, hiss]) source.start();
	return () => {
		window.clearInterval(timer);
		stopAll([rumble, roar, hiss, ...breathing]);
	};
}

// ── Wind ─────────────────────────────────────────────────────────────────

function buildWind(ctx: AudioContext, out: AudioNode): Disposer {
	const body = loop(ctx, stereoNoise(ctx, 13, "pink"));
	const band = filter(ctx, "bandpass", 430, 0.85);
	const level = gainNode(ctx, 0.55);
	const gust = gainNode(ctx, 0.7);
	body.connect(band).connect(level).connect(gust).connect(out);

	// The pitch of the wind wanders on cycles that never line up.
	const wander = [
		wobble(ctx, band.frequency, 0.043, 170),
		wobble(ctx, band.frequency, 0.091, 90),
		wobble(ctx, band.frequency, 0.167, 40),
		wobble(ctx, level.gain, 0.07, 0.22),
	];

	const low = loop(ctx, stereoNoise(ctx, 9, "brown"));
	low
		.connect(filter(ctx, "lowpass", 220))
		.connect(gainNode(ctx, 0.28))
		.connect(out);

	// A very quiet whistle, wavering in pitch and loudness.
	const whistle = loop(ctx, stereoNoise(ctx, 8, "pink"));
	const whistleBand = filter(ctx, "bandpass", 880, 16);
	const whistleLevel = gainNode(ctx, 0.05);
	whistle.connect(whistleBand).connect(whistleLevel).connect(out);
	const whistleWander = [
		wobble(ctx, whistleBand.frequency, 0.11, 260),
		wobble(ctx, whistleLevel.gain, 0.17, 0.035),
	];

	// Gusts: now and then the wind swells and settles back.
	let gustTimer = 0;
	function scheduleGust() {
		gustTimer = window.setTimeout(
			() => {
				const now = ctx.currentTime;
				const rise = rand(2.2, 4.2);
				const fall = rand(3, 6);
				gust.gain.cancelScheduledValues(now);
				gust.gain.setValueAtTime(gust.gain.value, now);
				gust.gain.linearRampToValueAtTime(rand(1.15, 1.6), now + rise);
				gust.gain.linearRampToValueAtTime(0.7, now + rise + fall);
				scheduleGust();
			},
			rand(7000, 16000),
		);
	}
	scheduleGust();

	for (const source of [body, low, whistle]) source.start();
	return () => {
		window.clearTimeout(gustTimer);
		stopAll([body, low, whistle, ...wander, ...whistleWander]);
	};
}

const BUILDERS: Record<
	string,
	(ctx: AudioContext, out: AudioNode) => Disposer
> = {
	rain: buildRain,
	wind: buildWind,
	fire: buildFire,
};

/** The mixer: any number of sounds at once, each with its own volume. */
export class AmbientMixer {
	private channels = new Map<string, Channel>();
	private loading = new Set<string>();
	private bus: AudioNode | null = null;

	/** Everything shares one gentle limiter, so stacking sounds never clips. */
	private output(ctx: AudioContext): AudioNode {
		if (this.bus) return this.bus;
		const compressor = ctx.createDynamicsCompressor();
		compressor.threshold.value = -20;
		compressor.knee.value = 24;
		compressor.ratio.value = 3;
		compressor.attack.value = 0.01;
		compressor.release.value = 0.3;
		compressor.connect(filter(ctx, "lowpass", 15000)).connect(ctx.destination);
		this.bus = compressor;
		return compressor;
	}

	isOn(id: string): boolean {
		return this.channels.has(id);
	}

	async start(id: string, volume: number, src?: string | null): Promise<void> {
		const ctx = getAudioContext();
		if (!ctx || this.channels.has(id) || this.loading.has(id)) return;
		if (ctx.state !== "running") await ctx.resume().catch(() => undefined);

		const gain = ctx.createGain();
		gain.gain.value = volume;
		gain.connect(this.output(ctx));

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
			if (!response.ok) throw new Error("Could not load the sound.");
			const decoded = await ctx.decodeAudioData(await response.arrayBuffer());
			const source = loop(ctx, smoothLoop(ctx, decoded));
			source.connect(gain);
			source.start();
			this.channels.set(id, {
				gain,
				stop: () => stopAll([source]),
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
