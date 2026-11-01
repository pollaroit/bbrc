import type { Database, DatabaseTransaction } from "@bbrc/db";
import { validateContentMap } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import type { ContentMapInput } from "./content-map.schema";

type DbLike = Database | DatabaseTransaction;

function assertValidMapInput(input: ContentMapInput): ContentMapInput {
	const problem = validateContentMap(input);
	if (problem) {
		throw new ORPCError("BAD_REQUEST", { message: problem });
	}
	return input;
}

export async function syncPostMap(
	tx: DbLike,
	postId: string,
	map: ContentMapInput | null | undefined,
): Promise<void> {
	if (map === undefined) {
		return;
	}
	if (map === null) {
		await tx.postMap.deleteMany({ where: { postId } });
		return;
	}
	const data = assertValidMapInput(map);
	await tx.postMap.upsert({
		where: { postId },
		create: { postId, ...data },
		update: data,
	});
}

export async function syncCommentMap(
	tx: DbLike,
	commentId: string,
	map: ContentMapInput,
): Promise<void> {
	const data = assertValidMapInput(map);
	await tx.commentMap.upsert({
		where: { commentId },
		create: { commentId, ...data },
		update: data,
	});
}
