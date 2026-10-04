import {
	type Crop,
	centerCrop,
	makeAspectCrop,
	type PixelCrop,
} from "react-image-crop";

export function centerAspectCrop(
	mediaWidth: number,
	mediaHeight: number,
	aspect: number,
): Crop {
	return centerCrop(
		makeAspectCrop(
			{
				unit: "%",
				width: 90,
			},
			aspect,
			mediaWidth,
			mediaHeight,
		),
		mediaWidth,
		mediaHeight,
	);
}

export function initialFreeCrop(mediaWidth: number, mediaHeight: number): Crop {
	return centerCrop(
		{
			unit: "%",
			x: 5,
			y: 5,
			width: 90,
			height: 90,
		},
		mediaWidth,
		mediaHeight,
	);
}

export async function cropImageToBlob(
	image: HTMLImageElement,
	crop: PixelCrop,
): Promise<Blob> {
	const scaleX = image.naturalWidth / image.width;
	const scaleY = image.naturalHeight / image.height;

	const pixelWidth = crop.width * scaleX;
	const pixelHeight = crop.height * scaleY;

	const canvas = document.createElement("canvas");
	canvas.width = pixelWidth;
	canvas.height = pixelHeight;

	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Could not crop image.");
	}

	ctx.drawImage(
		image,
		crop.x * scaleX,
		crop.y * scaleY,
		pixelWidth,
		pixelHeight,
		0,
		0,
		pixelWidth,
		pixelHeight,
	);

	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) {
					resolve(blob);
				} else {
					reject(new Error("Could not crop image."));
				}
			},
			"image/png",
			1,
		);
	});
}
