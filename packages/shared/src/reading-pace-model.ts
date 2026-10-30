/*
 * Learning a member's reading pace, and moving their page for them.
 *
 * Pace is per reading (a different edition has a different page size and font),
 * in units per active minute. Active time never includes pauses or breaks.
 * Everything here is pure, so it is tested without a screen.
 */

/** What a pace is counted in: pages, percent (no page count known) or seconds of audio. */
export type PaceUnit = "pages" | "percent" | "seconds";

/** A stretch needs at least this much active reading to say anything about speed. */
export const PACE_MIN_SAMPLE_SECONDS = 20;
/** ...and must have gained at least this much. */
export const PACE_MIN_SAMPLE_GAIN = 1;
/** Usable samples needed to learn a pace. */
export const PACE_MIN_USABLE_SAMPLES = 2;
/** A sample more than this many times faster or slower than the median is thrown away. */
export const PACE_OUTLIER_FACTOR = 3;
/** Faster than this per minute is not reading (a skipped chapter, a typo). */
export const PACE_MAX_PER_MINUTE: Record<PaceUnit, number> = {
	pages: 5,
	percent: 3,
	seconds: 180,
};

export type PaceSample = {
	/** How much the member moved (pages, percent or seconds of audio). */
	gain: number;
	/** Active reading seconds that took. */
	activeSeconds: number;
};

/** Units per minute for one sample. */
export function sampleRate(sample: PaceSample): number {
	return sample.activeSeconds <= 0
		? 0
		: (sample.gain / sample.activeSeconds) * 60;
}

function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	if (sorted.length === 0) return 0;
	return sorted.length % 2 === 1
		? (sorted[middle] ?? 0)
		: ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

export type LearnPaceResult =
	| { ok: true; perMinute: number; used: number; dropped: number }
	| { ok: false; reason: "not_enough" };

/**
 * The pace from what was collected: drop stretches that are too short, moved
 * nothing or are not humanly possible, then drop the ones far from the median
 * and take the mean of the rest.
 */
export function learnPace(
	samples: readonly PaceSample[],
	unit: PaceUnit,
): LearnPaceResult {
	const usable = samples.filter(
		(sample) =>
			sample.gain >= PACE_MIN_SAMPLE_GAIN &&
			sample.activeSeconds >= PACE_MIN_SAMPLE_SECONDS &&
			sampleRate(sample) <= PACE_MAX_PER_MINUTE[unit],
	);
	if (usable.length < PACE_MIN_USABLE_SAMPLES) {
		return { ok: false, reason: "not_enough" };
	}
	const rates = usable.map(sampleRate);
	const mid = median(rates);
	const kept = rates.filter(
		(rate) =>
			rate >= mid / PACE_OUTLIER_FACTOR && rate <= mid * PACE_OUTLIER_FACTOR,
	);
	if (kept.length < PACE_MIN_USABLE_SAMPLES) {
		return { ok: false, reason: "not_enough" };
	}
	const mean = kept.reduce((sum, rate) => sum + rate, 0) / kept.length;
	return {
		ok: true,
		perMinute: mean,
		used: kept.length,
		dropped: samples.length - kept.length,
	};
}

/** What the learning stage has gathered so far. */
export type PaceCollector = {
	/** The place and the active time at the start of the stretch being measured. */
	anchorValue: number;
	anchorSeconds: number;
	samples: PaceSample[];
};

export function startCollecting(
	value: number,
	activeSeconds: number,
): PaceCollector {
	return { anchorValue: value, anchorSeconds: activeSeconds, samples: [] };
}

/**
 * The member entered where they are. A stretch is measured from its start until
 * enough time has passed to say something about speed (`PACE_MIN_SAMPLE_SECONDS`)
 * and the member has moved forward: updating often, a page at a time, just keeps
 * the stretch open instead of making many stretches too short to use. Going back
 * only moves the start (a correction says nothing about speed).
 */
export function collectUpdate(
	collector: PaceCollector,
	value: number,
	activeSeconds: number,
): PaceCollector {
	if (value < collector.anchorValue) {
		return { ...collector, anchorValue: value, anchorSeconds: activeSeconds };
	}
	const gain = value - collector.anchorValue;
	const seconds = activeSeconds - collector.anchorSeconds;
	if (gain >= PACE_MIN_SAMPLE_GAIN && seconds >= PACE_MIN_SAMPLE_SECONDS) {
		return {
			anchorValue: value,
			anchorSeconds: activeSeconds,
			samples: [...collector.samples, { gain, activeSeconds: seconds }],
		};
	}
	return collector;
}

/**
 * Where the member probably is: the last confirmed place plus pace times active
 * time since then. Never past `max` (the last page), never behind where they were.
 */
export function estimatePosition(input: {
	baseline: number;
	perMinute: number;
	activeSecondsSinceBaseline: number;
	max: number;
}): number {
	const moved = Math.floor(
		(input.perMinute * Math.max(0, input.activeSecondsSinceBaseline)) / 60,
	);
	return Math.min(input.max, Math.max(input.baseline, input.baseline + moved));
}

/** How the pace reads to a member: "about 1.4 pages a minute (84 an hour)". */
export function describePace(perMinute: number, unit: PaceUnit): string {
	if (unit === "seconds") {
		const speed = perMinute / 60;
		return `about ${speed.toFixed(speed < 2 ? 2 : 1)}x listening speed`;
	}
	const noun = unit === "pages" ? "pages" : "percent";
	const perMin = perMinute < 10 ? perMinute.toFixed(1) : Math.round(perMinute);
	return `about ${perMin} ${noun} a minute (${Math.round(perMinute * 60)} an hour)`;
}
