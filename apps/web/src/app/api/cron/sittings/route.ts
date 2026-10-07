import { runSittingDeadlineCron } from "@bbrc/api/modules/sitting/sitting-cron.service";
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

	const result = await runSittingDeadlineCron(db);

	const revalidateIsr = createIsrRevalidator();
	const slugsToRefresh = [
		...new Set([...result.pollsClosed, ...result.sittingsFinished]),
	];
	for (const slug of slugsToRefresh) {
		revalidateIsr.revalidateSitting(slug);
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
