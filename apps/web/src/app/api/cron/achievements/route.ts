import { sweepAchievements } from "@bbrc/api/modules/achievement/achievement.service";
import { sweepEndedPolls } from "@bbrc/api/modules/post-poll/post-poll.service";
import { sweepViews } from "@bbrc/api/modules/view/view-maintenance.service";
import { NextResponse } from "next/server";
import { isCronRequestAuthorized } from "@/lib/qstash/verify-cron-request";
import { db } from "@/services";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Daily sweep (schedule it in QStash). It awards what only time or other
 * members can trigger (anniversaries, likes received, finished years, approved
 * documents), tells people about polls that ended with nobody looking, and runs
 * the views chores: summing old views into daily rows, removing views of
 * deleted items and the Monday views digest. Safe to run any time: awards and
 * notices are never duplicated.
 */
export async function POST(request: Request) {
	const bodyText = await request.text();

	if (!(await isCronRequestAuthorized(request, bodyText))) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		// `sweepViews` catches its own failures, so it never blocks the rest.
		const views = await sweepViews(db);
		const result = await sweepAchievements(db);
		const endedPolls = await sweepEndedPolls(db);
		return NextResponse.json({
			at: new Date().toISOString(),
			...result,
			endedPolls,
			views,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Sweep failed";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
