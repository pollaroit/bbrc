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
