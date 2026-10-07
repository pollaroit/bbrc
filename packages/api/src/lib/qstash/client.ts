import { resolveQStashPublishConfig } from "./config";

export type PublishQStashJsonInput = {
	destinationUrl: string;
	body: unknown;
	notBefore?: Date;
	deduplicationId?: string;
};

export async function publishQStashJson(
	input: PublishQStashJsonInput,
): Promise<string | null> {
	const config = resolveQStashPublishConfig();
	if (!config) {
		return null;
	}

	const encodedDestination = encodeURIComponent(input.destinationUrl);
	const url = `${config.baseUrl}/v2/publish/${encodedDestination}`;

	const headers: Record<string, string> = {
		Authorization: `Bearer ${config.token}`,
		"Content-Type": "application/json",
	};

	if (input.notBefore && input.notBefore.getTime() > Date.now()) {
		const unixSeconds = Math.floor(input.notBefore.getTime() / 1000);
		headers["Upstash-Not-Before"] = String(unixSeconds);
	}

	if (input.deduplicationId) {
		headers["Upstash-Deduplication-Id"] = input.deduplicationId;
	}

	try {
		const response = await fetch(url, {
			method: "POST",
			headers,
			body: JSON.stringify(input.body),
		});

		if (!response.ok) {
			const text = await response.text().catch(() => "");
			console.error(
				`qstash publish failed (${response.status}): ${text.slice(0, 200)}`,
			);
			return null;
		}

		const data = (await response.json()) as { messageId?: string };
		return data.messageId ?? null;
	} catch (error) {
		console.error("qstash publish error", error);
		return null;
	}
}

export async function deleteQStashMessage(messageId: string): Promise<void> {
	const config = resolveQStashPublishConfig();
	if (!config || !messageId) {
		return;
	}

	const url = `${config.baseUrl}/v2/messages/${encodeURIComponent(messageId)}`;

	try {
		const response = await fetch(url, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${config.token}` },
		});

		if (!response.ok && response.status !== 404) {
			const text = await response.text().catch(() => "");
			console.error(
				`qstash delete failed (${response.status}): ${text.slice(0, 200)}`,
			);
		}
	} catch (error) {
		console.error("qstash delete error", error);
	}
}
