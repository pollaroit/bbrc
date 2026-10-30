import type { Database, DatabaseTransaction, Prisma } from "@bbrc/db";
import type { Viewer } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { postVisibleWhere } from "../visibility/visibility-resources";

type Db = Database | DatabaseTransaction;

/** The id of the signed-in member looking, or null for a visitor. */
export function viewerUserId(viewer: Viewer): string | null {
	return viewer.kind === "member" ? viewer.userId : null;
}

/** NOT_FOUND unless the viewer may see this post (its author's profile, blocks). */
export async function assertPostVisible(
	db: Db,
	where: { slug: string } | { id: string },
	viewer: Viewer,
	message: string,
	data?: Record<string, unknown>,
): Promise<void> {
	const found = await db.post.findFirst({
		where: {
			AND: [where, postVisibleWhere(viewer) as Prisma.PostWhereInput],
		},
		select: { id: true },
	});
	if (!found) {
		throw new ORPCError("NOT_FOUND", { message, data });
	}
}
