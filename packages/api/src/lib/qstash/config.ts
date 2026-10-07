export type QStashPublishConfig = {
	token: string;
	baseUrl: string;
};

export function resolveQStashPublishConfig(): QStashPublishConfig | null {
	const token = process.env.QSTASH_TOKEN?.trim();
	const baseUrl = process.env.QSTASH_URL?.trim() || "https://qstash.upstash.io";

	if (!token) {
		return null;
	}

	return {
		token,
		baseUrl: baseUrl.replace(/\/$/, ""),
	};
}
