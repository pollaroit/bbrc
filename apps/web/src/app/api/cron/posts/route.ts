import { publishDueScheduledPosts } from "@bbrc/api/modules/post/post-publish.service";
import { NextResponse } from "next/server";
import { createIsrRevalidator } from "@/lib/isr-revalidation";
import { isCronRequestAuthorized } from "@/lib/qstash/verify-cron-request";
import { db } from "@/services";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handleCron(request: Request) {
	const body = request.method === "GET" ? "" : await request.text();

	if (!(await isCronRequestAuthorized(request, body))) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const result = await publishDueScheduledPosts(db);

	const revalidateIsr = createIsrRevalidator();
	for (const slug of result.published) {
		revalidateIsr.revalidatePost(slug);
	}
	if (result.published.length > 0) {
		revalidateIsr.revalidateFeeds();
	}

	return NextResponse.json({
		ok: true,
		at: new Date().toISOString(),
		...result,
	});
}

export async function GET(request: Request) {
	return handleCron(request);
}

export async function POST(request: Request) {
	return handleCron(request);
}
