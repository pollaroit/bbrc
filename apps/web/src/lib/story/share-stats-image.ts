import { type StatsStoryShape, statsStoryPath } from "./constants";

/** A member's stats picture, drawn by the server for the period in `query`, as a file. */
export async function fetchStatsImage(
	username: string,
	shape: StatsStoryShape,
	query: URLSearchParams,
): Promise<File> {
	const response = await fetch(statsStoryPath(username, shape, query), {
		credentials: "include",
	});
	if (!response.ok) {
		throw new Error("The picture could not be made. Try again in a moment.");
	}
	const blob = await response.blob();
	return new File([blob], `bbrc-stats-${shape}.png`, { type: "image/png" });
}
