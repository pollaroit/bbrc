import { runSittingDeadlineCron } from "@bbrc/api/modules/sitting/sitting-cron.service";
import { NextResponse } from "next/server";
import { ENV } from "@/env";
import { db } from "@/services";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
	const secret = ENV.CRON_SECRET;
	if (!secret) {
		return ENV.NODE_ENV === "development";
	}

	const header = request.headers.get("authorization");
	return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
	if (!isAuthorized(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const result = await runSittingDeadlineCron(db);

	return NextResponse.json({
		ok: true,
		at: new Date().toISOString(),
		...result,
	});
}
