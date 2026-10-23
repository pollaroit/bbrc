/** A colour in the OKLCH space, with an optional alpha (0 to 1). */
export type Oklch = { l: number; c: number; h: number; a: number };

export function oklch(l: number, c: number, h: number, a = 1): Oklch {
	return { l, c, h, a };
}

function trim(value: number, digits: number): string {
	return String(Number(value.toFixed(digits)));
}

export function formatOklch(color: Oklch): string {
	const base = `${trim(color.l, 3)} ${trim(color.c, 3)} ${trim(color.h, 2)}`;
	return color.a < 1
		? `oklch(${base} / ${trim(color.a * 100, 1)}%)`
		: `oklch(${base})`;
}

type Rgb = { r: number; g: number; b: number };

function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value));
}

function gammaEncode(linear: number): number {
	const value = clamp01(linear);
	return value <= 0.0031308
		? 12.92 * value
		: 1.055 * value ** (1 / 2.4) - 0.055;
}

function gammaDecode(encoded: number): number {
	return encoded <= 0.04045
		? encoded / 12.92
		: ((encoded + 0.055) / 1.055) ** 2.4;
}

/** sRGB with gamma applied, each channel 0 to 1 (out-of-gamut colours are clamped). */
export function oklchToSrgb(color: Oklch): Rgb {
	const hue = (color.h * Math.PI) / 180;
	const a = color.c * Math.cos(hue);
	const b = color.c * Math.sin(hue);

	const l = (color.l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (color.l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (color.l - 0.0894841775 * a - 1.291485548 * b) ** 3;

	return {
		r: gammaEncode(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
		g: gammaEncode(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
		b: gammaEncode(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
	};
}

/** Alpha-composites `color` over an opaque `backdrop`, the way browsers blend. */
export function compositeOver(color: Oklch, backdrop: Oklch): Rgb {
	const top = oklchToSrgb(color);
	const bottom = oklchToSrgb(backdrop);
	const alpha = color.a;
	return {
		r: top.r * alpha + bottom.r * (1 - alpha),
		g: top.g * alpha + bottom.g * (1 - alpha),
		b: top.b * alpha + bottom.b * (1 - alpha),
	};
}

function luminance(rgb: Rgb): number {
	return (
		0.2126 * gammaDecode(rgb.r) +
		0.7152 * gammaDecode(rgb.g) +
		0.0722 * gammaDecode(rgb.b)
	);
}

/** WCAG contrast ratio of two opaque sRGB colours. */
export function contrastRgb(a: Rgb, b: Rgb): number {
	const la = luminance(a);
	const lb = luminance(b);
	return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Contrast of `foreground` (alpha allowed) drawn on `backdrop` (opaque). */
export function contrastOn(foreground: Oklch, backdrop: Oklch): number {
	return contrastRgb(
		compositeOver(foreground, backdrop),
		oklchToSrgb(backdrop),
	);
}

export function rgbToHex(rgb: Rgb): string {
	const part = (value: number) =>
		Math.round(clamp01(value) * 255)
			.toString(16)
			.padStart(2, "0");
	return `#${part(rgb.r)}${part(rgb.g)}${part(rgb.b)}`;
}

export function oklchToHex(color: Oklch, backdrop?: Oklch): string {
	return rgbToHex(
		backdrop ? compositeOver(color, backdrop) : oklchToSrgb(color),
	);
}

function linearToOklab(r: number, g: number, b: number) {
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	return {
		l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
	};
}

/** Converts gamma-encoded sRGB (0 to 1 per channel) to OKLCH. */
export function srgbToOklch(r: number, g: number, b: number, a = 1): Oklch {
	const lab = linearToOklab(gammaDecode(r), gammaDecode(g), gammaDecode(b));
	const c = Math.hypot(lab.a, lab.b);
	const h =
		c < 1e-4 ? 0 : ((Math.atan2(lab.b, lab.a) * 180) / Math.PI + 360) % 360;
	return { l: lab.l, c: c < 1e-4 ? 0 : c, h, a };
}

function hslToSrgb(h: number, s: number, l: number): Rgb {
	const hue = ((h % 360) + 360) % 360;
	const channel = (n: number) => {
		const k = (n + hue / 30) % 12;
		const chroma = s * Math.min(l, 1 - l);
		return l - chroma * Math.max(-1, Math.min(k - 3, 9 - k, 1));
	};
	return { r: channel(0), g: channel(8), b: channel(4) };
}

function numbers(text: string): number[] {
	return (text.match(/-?\d*\.?\d+(?:e-?\d+)?%?/gi) ?? []).map((token) =>
		token.endsWith("%")
			? Number.parseFloat(token) / 100
			: Number.parseFloat(token),
	);
}

/**
 * Reads a CSS colour as OKLCH: `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()`,
 * `hsl()` and `oklch()`. Returns null for anything else.
 */
export function parseColor(input: string): Oklch | null {
	const text = input.trim().toLowerCase();

	if (text.startsWith("#")) {
		const hex = text.slice(1);
		const full =
			hex.length === 3 || hex.length === 4
				? [...hex].map((char) => char + char).join("")
				: hex;
		if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/.test(full)) {
			return null;
		}
		const channel = (index: number) =>
			Number.parseInt(full.slice(index * 2, index * 2 + 2), 16) / 255;
		return srgbToOklch(
			channel(0),
			channel(1),
			channel(2),
			full.length === 8 ? channel(3) : 1,
		);
	}

	if (text.startsWith("oklch(")) {
		const [l, c, h, a] = numbers(text.slice(6, -1));
		if (l == null || c == null || h == null) {
			return null;
		}
		return { l, c, h, a: a ?? 1 };
	}

	if (text.startsWith("hsl(") || text.startsWith("hsla(")) {
		const [h, s, l, a] = numbers(text.slice(text.indexOf("(") + 1, -1));
		if (h == null || s == null || l == null) {
			return null;
		}
		const rgb = hslToSrgb(h, s > 1 ? s / 100 : s, l > 1 ? l / 100 : l);
		return srgbToOklch(rgb.r, rgb.g, rgb.b, a ?? 1);
	}

	if (text.startsWith("rgb(") || text.startsWith("rgba(")) {
		const parts = text
			.slice(text.indexOf("(") + 1, -1)
			.split(/[\s,/]+/)
			.filter(Boolean);
		const channel = (value: string | undefined) =>
			value == null
				? Number.NaN
				: value.endsWith("%")
					? Number.parseFloat(value) / 100
					: Number.parseFloat(value) / 255;
		const [r, g, b] = [channel(parts[0]), channel(parts[1]), channel(parts[2])];
		if ([r, g, b].some(Number.isNaN)) {
			return null;
		}
		return srgbToOklch(r, g, b, parts[3] ? Number.parseFloat(parts[3]) : 1);
	}

	return null;
}
