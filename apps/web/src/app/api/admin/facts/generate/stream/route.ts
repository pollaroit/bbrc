import { FactCategorySchema } from "@bbrc/api/modules/admin/admin-fact.schema";
import { streamAdminFactDrafts } from "@bbrc/api/modules/admin/admin-fact.service";
import type { NextRequest } from "next/server";
import { auth } from "@/services";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
	const session = await auth.api.getSession({
		headers: request.headers,
	});

	if (!session?.user.isAdmin) {
		return new Response("Unauthorized", { status: 401 });
	}

	const params = request.nextUrl.searchParams;
	const count = Number.parseInt(params.get("count") ?? "10", 10);
	const topic = params.get("topic")?.trim() || undefined;
	const categoryRaw = params.get("category")?.trim();
	const categoryParsed = categoryRaw
		? FactCategorySchema.safeParse(categoryRaw)
		: null;
	const category = categoryParsed?.success ? categoryParsed.data : undefined;

	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();

			try {
				for await (const event of streamAdminFactDrafts({
					count: Number.isFinite(count) ? count : 10,
					category,
					topic,
				})) {
					controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
				}
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Fact generation failed";
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
