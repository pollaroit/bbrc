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
 * Hands the picture to the phone's share sheet. Where a browser cannot share a
 * file (most desktops), it is saved instead so it can be posted anywhere.
 */
export async function shareSessionImage(
	sessionId: string,
	title: string,
): Promise<ShareOutcome> {
	const file = await fetchSessionImage(sessionId, "story");

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

	const url = URL.createObjectURL(file);
	const link = document.createElement("a");
	link.href = url;
	link.download = file.name;
	document.body.append(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url), 10_000);
	return "saved";
}
