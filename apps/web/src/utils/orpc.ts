import type { AppRouterClient } from "@bbrc/api/router";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RPC_PATH, resolveAppOrigin } from "@/lib/app-origin";

export function createQueryClient() {
	return new QueryClient({
		queryCache: new QueryCache({
			onError: (error, query) => {
				toast.error(`Error: ${error.message}`, {
					action: {
						label: "retry",
						onClick: () => {
							query.invalidate();
						},
					},
				});
			},
		}),
	});
}

export const queryClient = createQueryClient();

export const link = new RPCLink({
	url:
		typeof window !== "undefined"
			? `${window.location.origin}${RPC_PATH}`
			: `http://127.0.0.1:0${RPC_PATH}`,
	fetch: async (request, init) => {
		let finalRequest = request;

		if (typeof window === "undefined" && request instanceof Request) {
			const origin = await resolveAppOrigin();
			const incoming = new URL(request.url);
			finalRequest = new Request(
				`${origin}${incoming.pathname}${incoming.search}`,
				request,
			);
		}

		return fetch(finalRequest, {
			...(init ?? {}),
			credentials: "include",
		});
	},
	headers: async () => {
		if (typeof window !== "undefined") {
			return {};
		}

		const { headers } = await import("next/headers");
		return Object.fromEntries(await headers());
	},
});

export const client = createORPCClient<AppRouterClient>(link);

export const orpc = createTanstackQueryUtils(client);
