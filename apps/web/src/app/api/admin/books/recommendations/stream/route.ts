import { streamBookRecommendations } from "@bbrc/api/modules/book/book-recommendation.service";
import type { NextRequest } from "next/server";
import { auth, db } from "@/services";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
	const session = await auth.api.getSession({
		headers: request.headers,
	});

	if (!session?.user.isAdmin) {
		return new Response("Unauthorized", { status: 401 });
	}

	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();

			try {
				for await (const event of streamBookRecommendations(db)) {
					controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
				}
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "Could not load recommendations";
				controller.enqueue(
					encoder.encode(`${JSON.stringify({ type: "error", message })}\n`),
				);
			} finally {
				controller.close();
			}
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "application/x-ndjson; charset=utf-8",
			"Cache-Control": "no-store",
		},
	});
}
