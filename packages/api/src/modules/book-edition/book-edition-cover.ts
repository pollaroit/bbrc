import { loadR2ConfigFromEnv } from "@bbrc/storage";
import { appError } from "../../lib/app-error";

/** An edition cover must be a file we stored ourselves under `books/editions/`. */
export function assertOwnEditionCoverUrl(url: string) {
	const config = loadR2ConfigFromEnv();
	const base = config?.publicBaseUrl.replace(/\/$/, "");
	const clean = url.split("?")[0] ?? "";
	if (
		!base ||
		!clean.startsWith(`${base}/`) ||
		!clean.includes("/books/editions/") ||
		!clean.endsWith(".webp")
	) {
		throw appError("BAD_REQUEST", "book.coverNotUploaded");
	}
}
