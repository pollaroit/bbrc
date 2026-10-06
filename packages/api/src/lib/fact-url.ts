const FACT_IMAGE_HOST_ALLOWLIST = new Set([
	"upload.wikimedia.org",
	"commons.wikimedia.org",
	"covers.openlibrary.org",
]);

export function assertHttpsUrl(value: string, label: string): void {
	let parsed: URL;
	try {
		parsed = new URL(value);
	} catch {
		throw new Error(`${label} must be a valid URL`);
	}
	if (parsed.protocol !== "https:") {
		throw new Error(`${label} must use HTTPS`);
	}
}

export function assertOptionalFactImageUrl(
	value: string | null | undefined,
): void {
	if (value == null || value.trim() === "") {
		return;
	}
	assertHttpsUrl(value, "Image");
	const host = new URL(value).hostname.toLowerCase();
	if (!FACT_IMAGE_HOST_ALLOWLIST.has(host)) {
		throw new Error(
			`Image host is not allowed. Use: ${[...FACT_IMAGE_HOST_ALLOWLIST].join(", ")}`,
		);
	}
}
