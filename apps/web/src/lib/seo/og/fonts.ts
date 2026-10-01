import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type OgFont = {
	name: string;
	data: ArrayBuffer;
	weight: 400 | 600;
	style: "normal";
};

const fontsDir = join(dirname(fileURLToPath(import.meta.url)), "fonts");

function loadFontFile(filename: string): ArrayBuffer {
	const buffer = readFileSync(join(fontsDir, filename));
	return buffer.buffer.slice(
		buffer.byteOffset,
		buffer.byteOffset + buffer.byteLength,
	);
}

let fontsCache: OgFont[] | undefined;

/** Geist Mono — matches the app UI (`next/font` Geist Mono). */
export function getOgFonts(): OgFont[] {
	if (!fontsCache) {
		fontsCache = [
			{
				name: "Geist Mono",
				data: loadFontFile("GeistMono-Regular.ttf"),
				weight: 400,
				style: "normal",
			},
			{
				name: "Geist Mono",
				data: loadFontFile("GeistMono-SemiBold.ttf"),
				weight: 600,
				style: "normal",
			},
		];
	}

	return fontsCache;
}
