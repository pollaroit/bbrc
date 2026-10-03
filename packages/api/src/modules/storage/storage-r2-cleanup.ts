import {
	createR2Client,
	deleteObject,
	loadR2ConfigFromEnv,
} from "@bbrc/storage";

/** Best-effort delete when the URL is under our configured R2 public base. */
export async function tryDeleteR2PublicUrl(
	url: string | null | undefined,
): Promise<void> {
	const config = loadR2ConfigFromEnv();
	if (!config || !url?.trim()) {
		return;
	}

	const base = config.publicBaseUrl.replace(/\/$/, "");
	const withoutQuery = url.trim().split("?")[0] ?? "";
	if (!withoutQuery.startsWith(`${base}/`)) {
		return;
	}

	const key = withoutQuery.slice(base.length + 1);
	if (!key) {
		return;
	}

	try {
		const client = createR2Client(config);
		await deleteObject(client, config, key);
	} catch {
		// ignore cleanup failures
	}
}
