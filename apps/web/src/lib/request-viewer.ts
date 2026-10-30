import { loadViewer } from "@bbrc/api/modules/visibility/viewer";
import type { Viewer } from "@bbrc/shared";
import { headers } from "next/headers";
import { cache } from "react";
import { auth, db } from "@/services";

/**
 * Who is looking at this request, for server-rendered pages that are not cached
 * (they call `headers()`). Cached pages use `ANONYMOUS_VIEWER` instead and load
 * anything personal per viewer after they open.
 */
export const getRequestViewer = cache(async (): Promise<Viewer> => {
	const session = await auth.api.getSession({ headers: await headers() });
	return loadViewer(db, session);
});
