import type { Database, Prisma } from "@bbrc/db";
import { ORPCError } from "@orpc/server";
import type {
	ListFactReelsInput,
	ListFactReelsOutput,
	MarkFactReelSeenInput,
	PullFactReelDeckInput,
	PullFactReelDeckOutput,
	ToggleFactLikeInput,
	ToggleFactLikeOutput,
} from "./fact.schema";

const publishedFactSelect = {
	id: true,
	body: true,
	category: true,
	source: true,
	image: true,
	confidence: true,
	publishedAt: true,
} as const;

type PublishedFactRow = Prisma.FactGetPayload<{
	select: typeof publishedFactSelect;
}> & {
	_count: { likes: number };
	likes?: { id: string }[];
};

const UNSEEN_POOL_SIZE = 40;

function shuffleInPlace<T>(items: T[]): T[] {
	for (let index = items.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(Math.random() * (index + 1));
		const current = items[index];
		const swap = items[swapIndex];
		if (current === undefined || swap === undefined) {
			continue;
		}
		items[index] = swap;
		items[swapIndex] = current;
	}
	return items;
}

function mapReelItem(
	row: PublishedFactRow,
): PullFactReelDeckOutput["items"][number] {
	if (row.publishedAt == null) {
		throw new Error("Expected published fact");
	}

	return {
		id: row.id,
		body: row.body,
		category: row.category,
		source: row.source,
		image: row.image,
		confidence: row.confidence,
		publishedAt: row.publishedAt,
		likeCount: row._count.likes,
		likedByViewer: (row.likes?.length ?? 0) > 0,
	};
}

function buildUnseenWhere(
	viewerUserId: string,
	excludeFactIds: string[],
): Prisma.FactWhereInput {
	const and: Prisma.FactWhereInput[] = [
		{ publishedAt: { not: null } },
		{
			impressions: { none: { userId: viewerUserId } },
		},
	];

	if (excludeFactIds.length > 0) {
		and.push({ id: { notIn: excludeFactIds } });
	}

	return { AND: and };
}

/** Back-compat for clients still on `fact.listReels` (e.g. cached bundles). */
export async function listFactReels(
	input: ListFactReelsInput,
	viewerUserId: string,
	db: Database,
): Promise<ListFactReelsOutput> {
	const pool = (await db.fact.findMany({
		where: buildUnseenWhere(viewerUserId, []),
		orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
		take: UNSEEN_POOL_SIZE,
		select: {
			...publishedFactSelect,
			_count: { select: { likes: true } },
			likes: {
				where: { userId: viewerUserId },
				select: { id: true },
				take: 1,
			},
		},
	})) as PublishedFactRow[];

	const shuffled = shuffleInPlace([...pool]).slice(0, input.limit);
	const lastItem = shuffled.at(-1);

	return {
		items: shuffled.map((row) => mapReelItem(row)),
		metadata: {
			limit: input.limit,
			hasNextPage: shuffled.length === input.limit && pool.length > input.limit,
			hasPreviousPage: input.cursor != null,
			nextCursor:
				shuffled.length === input.limit && lastItem ? lastItem.id : null,
		},
	};
}

export async function pullFactReelDeck(
	input: PullFactReelDeckInput,
	viewerUserId: string,
	db: Database,
): Promise<PullFactReelDeckOutput> {
	const excludeFactIds = [...new Set(input.excludeFactIds)];

	const pool = (await db.fact.findMany({
		where: buildUnseenWhere(viewerUserId, excludeFactIds),
		orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
		take: UNSEEN_POOL_SIZE,
		select: {
			...publishedFactSelect,
			_count: { select: { likes: true } },
			likes: {
				where: { userId: viewerUserId },
				select: { id: true },
				take: 1,
			},
		},
	})) as PublishedFactRow[];

	const items = shuffleInPlace([...pool])
		.slice(0, input.limit)
		.map((row) => mapReelItem(row));

	return {
		items,
		exhausted: items.length === 0,
	};
}

export async function markFactReelSeen(
	input: MarkFactReelSeenInput,
	userId: string,
	db: Database,
): Promise<{ ok: true }> {
	const fact = await db.fact.findUnique({
		where: { id: input.factId },
		select: { id: true, publishedAt: true },
	});

	if (!fact?.publishedAt) {
		throw new ORPCError("NOT_FOUND", { message: "Fact not found" });
	}

	await db.factImpression.upsert({
		where: {
			factId_userId: { factId: input.factId, userId },
		},
		create: { factId: input.factId, userId },
		update: {},
	});

	return { ok: true };
}

export async function toggleFactLike(
	input: ToggleFactLikeInput,
	userId: string,
	db: Database,
): Promise<ToggleFactLikeOutput> {
	const fact = await db.fact.findUnique({
		where: { id: input.factId },
		select: { id: true, publishedAt: true },
	});

	if (!fact?.publishedAt) {
		throw new ORPCError("NOT_FOUND", { message: "Fact not found" });
	}

	const existing = await db.factLike.findUnique({
		where: {
			factId_userId: { factId: input.factId, userId },
		},
		select: { id: true },
	});

	if (existing) {
		await db.factLike.delete({ where: { id: existing.id } });
	} else {
		await db.factLike.create({
			data: { factId: input.factId, userId },
		});
	}

	const likeCount = await db.factLike.count({
		where: { factId: input.factId },
	});

	return {
		liked: !existing,
		likeCount,
	};
}
