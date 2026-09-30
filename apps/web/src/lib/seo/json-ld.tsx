type JsonLdValue = Record<string, unknown> | Record<string, unknown>[];

export function JsonLd({ data }: { data: JsonLdValue }) {
	const payload = Array.isArray(data) ? data : [data];

	return (
		<script
			type="application/ld+json"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires inline script
			dangerouslySetInnerHTML={{
				__html: JSON.stringify(payload.length === 1 ? payload[0] : payload),
			}}
		/>
	);
}
