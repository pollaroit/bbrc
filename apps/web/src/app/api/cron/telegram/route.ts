import { runSittingTelegramCronJob } from "@bbrc/api/modules/sitting/sitting-telegram-cron.service";
import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/qstash/verify-cron-request";
import { db } from "@/services";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
	const bodyText = await request.text();

	if (!(await isCronRequestAuthorized(request, bodyText))) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let payload: unknown;
	try {
		payload = bodyText ? JSON.parse(bodyText) : null;
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	if (payload == null || typeof payload !== "object") {
		return NextResponse.json({ error: "Missing job body" }, { status: 400 });
	}

	try {
		const result = await runSittingTelegramCronJob(db, payload);
		return NextResponse.json({
			at: new Date().toISOString(),
			...result,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Job failed";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
