import type { RecommendationStreamEvent } from "@bbrc/api/modules/book/book-recommendation.schema";

export async function consumeBookRecommendationsStream(
	signal: AbortSignal,
	onEvent: (event: RecommendationStreamEvent) => void,
): Promise<void> {
	const response = await fetch("/api/admin/books/recommendations/stream", {
		method: "GET",
		credentials: "include",
		signal,
	});

	if (!response.ok) {
		throw new Error("Could not load recommendations");
	}

	if (!response.body) {
		throw new Error("Empty recommendation stream");
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}

		buffer += decoder.decode(value, { stream: true });

		while (true) {
			const newlineIndex = buffer.indexOf("\n");
			if (newlineIndex === -1) {
				break;
			}

			const line = buffer.slice(0, newlineIndex).trim();
			buffer = buffer.slice(newlineIndex + 1);

			if (!line) {
				continue;
			}

			const event = JSON.parse(line) as RecommendationStreamEvent;
			onEvent(event);

			if (event.type === "error") {
				throw new Error(event.message);
			}
		}
	}
}
