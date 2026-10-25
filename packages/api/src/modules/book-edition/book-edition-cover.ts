import { loadR2ConfigFromEnv } from "@bbrc/storage";
import { ORPCError } from "@orpc/server";

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
		throw new ORPCError("BAD_REQUEST", {
			message: "That cover was not uploaded here. Upload it again.",
		});
	}
}
