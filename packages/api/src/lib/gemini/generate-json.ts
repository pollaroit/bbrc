import type { GeminiConfig } from "./config";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

type GeminiJsonSchema = Record<string, unknown>;

type GenerateJsonParams<T> = {
	config: GeminiConfig;
	systemInstruction: string;
	userPrompt: string;
	responseSchema: GeminiJsonSchema;
	parse: (value: unknown) => T;
	temperature?: number;
};

type GeminiGenerateContentResponse = {
	candidates?: Array<{
		content?: { parts?: Array<{ text?: string }> };
	}>;
	error?: { message?: string };
};

export async function geminiGenerateJson<T>({
	config,
	systemInstruction,
	userPrompt,
	responseSchema,
	parse,
	temperature = 0.8,
}: GenerateJsonParams<T>): Promise<T> {
	const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;

	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			systemInstruction: {
				parts: [{ text: systemInstruction }],
			},
			contents: [
				{
					role: "user",
					parts: [{ text: userPrompt }],
				},
			],
			generationConfig: {
				temperature,
				responseMimeType: "application/json",
				responseSchema,
			},
		}),
	});

	const payload = (await response.json()) as GeminiGenerateContentResponse;

	if (!response.ok) {
		const message =
			payload.error?.message ?? `Gemini request failed (${response.status})`;
		throw new Error(message);
	}

	const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
	if (!text) {
		throw new Error("Gemini returned an empty response");
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(text) as unknown;
	} catch {
		throw new Error("Gemini returned invalid JSON");
	}

	return parse(parsed);
}
