import { ENV } from "@/env";

const DEV_ORIGIN = "http://localhost:3001";

function originFromEnv(): string | undefined {
	if (process.env.VERCEL_URL) {
		return `https://${process.env.VERCEL_URL}`;
	}

	const authUrl = ENV.BETTER_AUTH_URL?.trim();
	if (authUrl) {
		return authUrl.replace(/\/$/, "");
	}

	return undefined;
}

/** Public origin for server-side fetches to this app (RPC, etc.). */
export async function resolveAppOrigin(): Promise<string> {
	if (typeof window !== "undefined") {
		return window.location.origin;
	}

	try {
		const { headers } = await import("next/headers");
		const requestHeaders = await headers();
		const host =
			requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
		if (host) {
			const hostName = host.split(",")[0]?.trim() ?? host;
			const forwardedProto = requestHeaders.get("x-forwarded-proto");
			const proto =
				forwardedProto?.split(",")[0]?.trim() ??
				(hostName.includes("localhost") || hostName.startsWith("127.0.0.1")
					? "http"
					: "https");
			return `${proto}://${hostName}`;
		}
	} catch {
		// headers() unavailable outside a request (e.g. some build paths)
	}

	return originFromEnv() ?? DEV_ORIGIN;
}

export const RPC_PATH = "/api/rpc";

export async function resolveRpcUrl(): Promise<string> {
	return `${await resolveAppOrigin()}${RPC_PATH}`;
}
