const DEFAULT_NTFY_BASE_URL = "https://ntfy.sh";

export type NtfyConfig = {
	baseUrl: string;
	token: string | undefined;
	topicPrefix: string;
};

export function resolveNtfyConfig(): NtfyConfig | null {
	const baseUrl = process.env.NTFY_BASE_URL?.trim() || DEFAULT_NTFY_BASE_URL;
	const token = process.env.NTFY_TOKEN?.trim() || undefined;
	const topicPrefix = process.env.NTFY_TOPIC_PREFIX?.trim() || "bbrc";

	if (!token) {
		return null;
	}

	return { baseUrl: baseUrl.replace(/\/$/, ""), token, topicPrefix };
}

export function ntfyUserTopic(prefix: string, userId: string): string {
	return `${prefix}-user-${userId}`;
}

export function ntfyAdminTopic(prefix: string): string {
	return `${prefix}-admin`;
}

export function ntfySittingTopic(prefix: string, sittingSlug: string): string {
	return `${prefix}-sitting-${sittingSlug}`;
}

export type PublishNtfyInput = {
	topic: string;
	title: string;
	message: string;
	click?: string;
	priority?: "min" | "low" | "default" | "high" | "max";
};

export async function publishNtfy(input: PublishNtfyInput): Promise<void> {
	const config = resolveNtfyConfig();
	if (!config) {
		return;
	}

	const url = `${config.baseUrl}/${encodeURIComponent(input.topic)}`;
	const headers: Record<string, string> = {
		Title: input.title,
		Authorization: `Bearer ${config.token}`,
	};

	if (input.click) {
		headers.Click = input.click;
	}

	if (input.priority && input.priority !== "default") {
		headers.Priority = input.priority;
	}

	try {
		const response = await fetch(url, {
			method: "POST",
			headers,
			body: input.message,
		});

		if (!response.ok) {
			console.error(
				`ntfy publish failed (${response.status}) for topic ${input.topic}`,
			);
		}
	} catch (error) {
		console.error("ntfy publish error", error);
	}
}
