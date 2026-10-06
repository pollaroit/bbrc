export type GeminiConfig = {
	apiKey: string;
	model: string;
};

const DEFAULT_MODEL = "gemini-3.5-flash-lite";

export function getGeminiConfig(): GeminiConfig | null {
	const apiKey = process.env.GEMINI_API_KEY?.trim();
	if (!apiKey) {
		return null;
	}

	const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;

	return { apiKey, model };
}
