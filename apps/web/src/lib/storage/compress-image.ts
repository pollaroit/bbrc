import { MAX_IMAGE_BYTES } from "@/lib/storage/image-upload-limits";

export const DEFAULT_OUTPUT_MIMES = ["image/webp", "image/jpeg"] as const;

export type OutputImageMime = (typeof DEFAULT_OUTPUT_MIMES)[number];

function stripExtension(name: string): string {
	const base = name.replace(/\.[^.]+$/, "");
	return base.length > 0 ? base : "image";
}

function canvasToBlob(
	canvas: HTMLCanvasElement,
	type: OutputImageMime,
	quality: number,
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) {
					resolve(blob);
				} else {
					reject(new Error("Could not encode image."));
				}
			},
			type,
			quality,
		);
	});
}

function drawToCanvas(
	source: CanvasImageSource,
	width: number,
	height: number,
): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Could not prepare image.");
	}
	ctx.drawImage(source, 0, 0, width, height);
	return canvas;
}

function scaledDimensions(
	width: number,
	height: number,
	maxEdge: number,
): { width: number; height: number } {
	if (Math.max(width, height) <= maxEdge) {
		return { width, height };
	}
	const scale = maxEdge / Math.max(width, height);
	return {
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale)),
	};
}

export type CompressImageOptions = {
	maxBytes?: number;
	maxEdge: number;
	fileName: string;
	/** Avatars are stored at `avatar.jpg`; shelf/post keys use `.png`. */
	outputMimeTypes?: readonly OutputImageMime[];
};

/** Encode as WebP or JPEG with reduced quality until under the size cap. */
export async function compressImageForUpload(
	source: Blob,
	options: CompressImageOptions,
): Promise<File> {
	const maxBytes = options.maxBytes ?? MAX_IMAGE_BYTES;
	const bitmap = await createImageBitmap(source);

	try {
		let { width, height } = scaledDimensions(
			bitmap.width,
			bitmap.height,
			options.maxEdge,
		);

		const mimeOrder = options.outputMimeTypes ?? DEFAULT_OUTPUT_MIMES;

		for (let pass = 0; pass < 4; pass++) {
			const canvas = drawToCanvas(bitmap, width, height);

			for (const mime of mimeOrder) {
				for (let quality = 0.85; quality >= 0.5; quality -= 0.08) {
					const blob = await canvasToBlob(canvas, mime, quality);
					if (blob.size <= maxBytes) {
						const ext = mime === "image/webp" ? "webp" : "jpg";
						return new File(
							[blob],
							`${stripExtension(options.fileName)}.${ext}`,
							{ type: mime },
						);
					}
				}
			}

			width = Math.max(1, Math.round(width * 0.85));
			height = Math.max(1, Math.round(height * 0.85));
		}

		throw new Error(
			"Image is still too large after compression. Try a smaller crop.",
		);
	} finally {
		bitmap.close();
	}
}
