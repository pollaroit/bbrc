import { runSittingDeadlineCron } from "@bbrc/api/modules/sitting/sitting-cron.service";
import { Receiver } from "@upstash/qstash";
import { NextResponse } from "next/server";
import { ENV } from "@/env";
import { createIsrRevalidator } from "@/lib/isr-revalidation";
import { db } from "@/services";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** QStash signs the public URL configured on the schedule, not Vercel's internal host. */
function urlForQStashVerification(request: Request): string {
	const url = new URL(request.url);
	const host =
		request.headers.get("x-forwarded-host") ?? request.headers.get("host");
	if (!host) {
		return request.url;
	}
	const hostName = host.split(",")[0]?.trim() ?? host;
	const forwardedProto = request.headers.get("x-forwarded-proto");
	const proto =
		forwardedProto?.split(",")[0]?.trim() ??
		(hostName.includes("localhost") || hostName.startsWith("127.0.0.1")
			? "http"
			: "https");
	return `${proto}://${hostName}${url.pathname}${url.search}`;
}

function isBearerAuthorized(request: Request): boolean {
	const secret = ENV.CRON_SECRET;
	if (!secret) {
		return ENV.NODE_ENV === "development";
	}

	const header = request.headers.get("authorization");
	return header === `Bearer ${secret}`;
}

async function isQStashAuthorized(
	request: Request,
	body: string,
): Promise<boolean> {
	const current = ENV.QSTASH_CURRENT_SIGNING_KEY;
	const next = ENV.QSTASH_NEXT_SIGNING_KEY;
	if (!current || !next) {
		return false;
	}

	const signature = request.headers.get("upstash-signature");
	if (!signature) {
		return false;
	}

	const receiver = new Receiver({
		currentSigningKey: current,
		nextSigningKey: next,
	});

	try {
		const isValid = await receiver.verify({
			signature,
			body,
			url: urlForQStashVerification(request),
		});
		return isValid;
	} catch {
		return false;
	}
}

async function isAuthorized(request: Request, body: string): Promise<boolean> {
	if (await isQStashAuthorized(request, body)) {
		return true;
	}
	return isBearerAuthorized(request);
}

async function handleCron(request: Request) {
	const body = request.method === "GET" ? "" : await request.text();

	if (!(await isAuthorized(request, body))) {
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
