import { sweepAchievements } from "@bbrc/api/modules/achievement/achievement.service";
import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/qstash/verify-cron-request";
import { db } from "@/services";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Daily sweep (schedule it in QStash): awards what only time or other members
 * can trigger, such as anniversaries, likes received, finished years and
 * approved documents. Safe to run any time: awards are never duplicated.
 */
export async function POST(request: Request) {
	const bodyText = await request.text();

	if (!(await isCronRequestAuthorized(request, bodyText))) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const result = await sweepAchievements(db);
		return NextResponse.json({ at: new Date().toISOString(), ...result });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Sweep failed";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
