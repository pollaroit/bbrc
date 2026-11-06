import { type SessionStoryShape, sessionStoryPath } from "./constants";

/** The picture of a finished session, drawn by the server, as a file. */
export async function fetchSessionImage(
	sessionId: string,
	shape: SessionStoryShape,
): Promise<File> {
	const response = await fetch(sessionStoryPath(sessionId, shape), {
		credentials: "include",
	});
	if (!response.ok) {
		throw new Error("The picture could not be made. Try again in a moment.");
	}
	const blob = await response.blob();
	return new File([blob], `bbrc-reading-${shape}.png`, { type: "image/png" });
}

export type ShareOutcome = "shared" | "saved" | "cancelled";

/**
 * Hands a picture to the phone's share sheet. Where a browser cannot share a file
 * (most desktops), it is saved instead so it can be posted anywhere.
 */
export async function shareImageFile(
	file: File,
	title: string,
): Promise<ShareOutcome> {
	if (
		typeof navigator !== "undefined" &&
		typeof navigator.share === "function" &&
		(typeof navigator.canShare !== "function" ||
			navigator.canShare({ files: [file] }))
	) {
		try {
			await navigator.share({ files: [file], title });
			return "shared";
		} catch (error) {
			if (error instanceof DOMException && error.name === "AbortError") {
				return "cancelled";
			}
			// Anything else: fall through to saving it.
		}
	}

	saveImageFile(file);
	return "saved";
}

/** Saves a picture to the device. */
export function saveImageFile(file: File) {
	const url = URL.createObjectURL(file);
	const link = document.createElement("a");
	link.href = url;
	link.download = file.name;
	document.body.append(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function shareSessionImage(
	sessionId: string,
	title: string,
): Promise<ShareOutcome> {
	return shareImageFile(await fetchSessionImage(sessionId, "story"), title);
}
