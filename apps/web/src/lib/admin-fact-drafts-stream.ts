import type {
	AdminFactStreamEvent,
	FactCategory,
} from "@bbrc/api/modules/admin/admin-fact.schema";

type StreamFactsParams = {
	count: number;
	category?: FactCategory;
	topic?: string;
	signal: AbortSignal;
	onEvent: (event: AdminFactStreamEvent) => void;
};

export async function consumeAdminFactDraftsStream({
	count,
	category,
	topic,
	signal,
	onEvent,
}: StreamFactsParams): Promise<void> {
	const search = new URLSearchParams({ count: String(count) });
	if (category) {
		search.set("category", category);
	}
	if (topic) {
		search.set("topic", topic);
	}

	const response = await fetch(
		`/api/admin/facts/generate/stream?${search.toString()}`,
		{
			method: "GET",
			credentials: "include",
			signal,
		},
	);

	if (!response.ok) {
		throw new Error("Could not generate facts");
	}

	if (!response.body) {
		throw new Error("Empty fact stream");
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

			const event = JSON.parse(line) as AdminFactStreamEvent;
			onEvent(event);
		}
	}
}
