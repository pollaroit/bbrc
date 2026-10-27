import { runWithLocale } from "@bbrc/api/lib/request-locale";
import { appRouter } from "@bbrc/api/router";
import { DEFAULT_LOCALE } from "@bbrc/i18n";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import type { NextRequest } from "next/server";

import { createContext } from "../../../../context";

/** Quiz generation calls the AI model, which can take up to a minute. */
export const maxDuration = 90;

const rpcHandler = new RPCHandler(appRouter, {
	interceptors: [
		onError((error) => {
			console.error(error);
		}),
	],
});
const apiHandler = new OpenAPIHandler(appRouter, {
	plugins: [
		new OpenAPIReferencePlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
		}),
	],
	interceptors: [
		onError((error) => {
			console.error(error);
		}),
	],
});

async function handleRequest(req: NextRequest) {
	const context = await createContext(req);
	// Everything below (services, errors) runs "in" the language the page sent.
	return runWithLocale(context.locale ?? DEFAULT_LOCALE, async () => {
		const rpcResult = await rpcHandler.handle(req, {
			prefix: "/api/rpc",
			context,
		});
		if (rpcResult.response) return rpcResult.response;

		const apiResult = await apiHandler.handle(req, {
			prefix: "/api/rpc/api-reference",
			context,
		});
		if (apiResult.response) return apiResult.response;

		return new Response("Not found", { status: 404 });
	});
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
