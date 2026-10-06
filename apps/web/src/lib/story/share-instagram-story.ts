import { toast } from "sonner";
import { bookStoryPath } from "./constants";

export async function shareBookToInstagramStory(bookSlug: string) {
	const path = bookStoryPath(bookSlug);

	try {
		const response = await fetch(path, { credentials: "include" });

		if (!response.ok) {
			throw new Error("Story image failed");
		}

		const blob = await response.blob();
		const file = new File([blob], `bbrc-${bookSlug}-story.png`, {
			type: "image/png",
		});

		if (
			typeof navigator !== "undefined" &&
			typeof navigator.share === "function" &&
			(typeof navigator.canShare !== "function" ||
				navigator.canShare({ files: [file] }))
		) {
			await navigator.share({ files: [file] });
			return;
		}
	} catch (error) {
		if (error instanceof DOMException && error.name === "AbortError") {
			return;
		}
	}

	window.open(path, "_blank", "noopener,noreferrer");
	toast.message("Save the image, then add it to your Instagram Story.");
}
