import { createRealtimeTokenRequest } from "@bbrc/api/modules/realtime/realtime.service";
import type { NextRequest } from "next/server";
import { createContext } from "@/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" };

/**
 * Hands a signed-in member a short-lived Ably token. The browser never sees the
 * Ably key; what the token allows is decided here, from the session and the
 * database, and cannot be asked for by the caller.
 */
async function issue(req: NextRequest) {
	const { db, session } = await createContext(req);
	if (!session?.user) {
		return Response.json(
			{ error: "Sign in to use live features." },
			{ status: 401, headers: NO_STORE },
		);
	}

	const result = await createRealtimeTokenRequest(db, session);
	if (!result.ok) {
		return result.reason === "banned"
			? Response.json(
					{ error: "Live features are not available." },
					{ status: 403, headers: NO_STORE },
				)
			: Response.json(
					{ error: "Realtime is not set up." },
					{ status: 503, headers: NO_STORE },
				);
	}
	return Response.json(result.tokenRequest, { headers: NO_STORE });
}

export const GET = issue;
export const POST = issue;
