import type { Database, Prisma } from "@bbrc/db";
import { ORPCError } from "@orpc/server";
import { definePagination } from "../../utils/pagination";
import type {
	ListFactReelsInput,
	ListFactReelsOutput,
	ListUserSeenFactsInput,
	ListUserSeenFactsOutput,
	MarkFactReelSeenInput,
	PullFactReelDeckInput,
	PullFactReelDeckOutput,
	PullUserSeenFactReelDeckInput,
	PullUserSeenFactReelDeckOutput,
	SetFactVoteInput,
	SetFactVoteOutput,
} from "./fact.schema";
import { buildUserTasteProfile, rankFactsForUser } from "./fact-recommendation";

const publishedFactSelect = {
	id: true,
	body: true,
	category: true,
	subcategory: true,
	source: true,
	image: true,
	confidence: true,
	publishedAt: true,
} as const;

type PublishedFactRow = Prisma.FactGetPayload<{
	select: typeof publishedFactSelect;
}> & {
	votes?: { value: "up" | "down" }[];
};

const UNSEEN_POOL_SIZE = 80;

function mapViewerVote(
	votes: { value: "up" | "down" }[] | undefined,
): "up" | "down" | null {
	const vote = votes?.[0];
	return vote?.value ?? null;
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
		viewerVote: mapViewerVote(row.votes),
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

async function fetchPublishedFactPoolWithDb(
	dbClient: Database,
	where: Prisma.FactWhereInput,
	viewerUserId: string,
	take: number,
	orderBy?: Prisma.FactOrderByWithRelationInput[],
): Promise<PublishedFactRow[]> {
	return dbClient.fact.findMany({
		where,
		orderBy: orderBy ?? [{ publishedAt: "desc" }, { id: "desc" }],
		take,
		select: {
			...publishedFactSelect,
			votes: {
				where: { userId: viewerUserId },
				select: { value: true },
				take: 1,
			},
		},
	}) as Promise<PublishedFactRow[]>;
}

/** Back-compat for clients still on `fact.listReels` (e.g. cached bundles). */
export async function listFactReels(
	input: ListFactReelsInput,
	viewerUserId: string,
	dbClient: Database,
): Promise<ListFactReelsOutput> {
	const pool = await fetchPublishedFactPoolWithDb(
		dbClient,
		buildUnseenWhere(viewerUserId, []),
		viewerUserId,
		UNSEEN_POOL_SIZE,
	);

	const profile = await buildUserTasteProfile(viewerUserId, dbClient);
	const ranked = rankFactsForUser(pool, profile, input.limit);
	const lastItem = ranked.at(-1);

	return {
		items: ranked.map((row) => mapReelItem(row)),
		metadata: {
			limit: input.limit,
			hasNextPage: ranked.length === input.limit && pool.length > input.limit,
			hasPreviousPage: input.cursor != null,
			nextCursor:
				ranked.length === input.limit && lastItem ? lastItem.id : null,
		},
	};
}

export async function pullFactReelDeck(
	input: PullFactReelDeckInput,
	viewerUserId: string,
	dbClient: Database,
): Promise<PullFactReelDeckOutput> {
	const excludeFactIds = [...new Set(input.excludeFactIds)];

	const pool = await fetchPublishedFactPoolWithDb(
		dbClient,
		buildUnseenWhere(viewerUserId, excludeFactIds),
		viewerUserId,
		UNSEEN_POOL_SIZE,
	);

	if (pool.length === 0) {
		return { items: [], exhausted: true };
	}

	const profile = await buildUserTasteProfile(viewerUserId, dbClient);
	const ranked = rankFactsForUser(pool, profile, input.limit);

	return {
		items: ranked.map((row) => mapReelItem(row)),
		exhausted: ranked.length < input.limit,
	};
}

async function resolveProfileUser(username: string, dbClient: Database) {
	const profileUser = await dbClient.user.findUnique({
		where: { username },
		select: { id: true, username: true },
	});

	if (!profileUser) {
		throw new ORPCError("NOT_FOUND", { message: "Member not found" });
	}

	return profileUser;
}

async function assertOwnProfileReplays(
	viewerUserId: string,
	username: string,
	dbClient: Database,
) {
	const profileUser = await resolveProfileUser(username, dbClient);

	if (profileUser.id !== viewerUserId) {
		throw new ORPCError("FORBIDDEN", {
			message: "Fact replays are only visible on your own profile.",
		});
	}

	return profileUser;
}

function buildSeenImpressionWhere(
	profileUserId: string,
	excludeFactIds: Set<string>,
	anchor?: { createdAt: Date; id: string } | null,
): Prisma.FactImpressionWhereInput {
	const and: Prisma.FactImpressionWhereInput[] = [
		{ userId: profileUserId },
		{ fact: { publishedAt: { not: null } } },
	];

	if (excludeFactIds.size > 0) {
		and.push({ factId: { notIn: [...excludeFactIds] } });
	}

	if (anchor) {
		and.push({
			OR: [
				{ createdAt: { lt: anchor.createdAt } },
				{
					createdAt: anchor.createdAt,
					id: { lte: anchor.id },
				},
			],
		});
	}

	return { AND: and };
}

export async function listUserSeenFacts(
	input: ListUserSeenFactsInput,
	viewerUserId: string,
	dbClient: Database,
): Promise<ListUserSeenFactsOutput> {
	const profileUser = await assertOwnProfileReplays(
		viewerUserId,
		input.username,
		dbClient,
	);
	const pagination = definePagination.offset(input);

	const where = buildSeenImpressionWhere(profileUser.id, new Set());

	const [rows, total] = await Promise.all([
		dbClient.factImpression.findMany({
			...pagination.use(),
			where,
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
			select: {
				createdAt: true,
				fact: {
					select: {
						id: true,
						body: true,
						category: true,
						image: true,
					},
				},
			},
		}),
		dbClient.factImpression.count({ where }),
	]);

	const page = pagination.paginate(rows, total);

	const factIds = page.items.map((row) => row.fact.id);
	const votes =
		factIds.length === 0
			? []
			: await dbClient.factVote.findMany({
					where: {
						userId: viewerUserId,
						factId: { in: factIds },
					},
					select: { factId: true, value: true },
				});
	const voteByFactId = new Map(votes.map((vote) => [vote.factId, vote.value]));

	return {
		items: page.items.map((row) => ({
			id: row.fact.id,
			body: row.fact.body,
			category: row.fact.category,
			image: row.fact.image,
			seenAt: row.createdAt,
			viewerVote: voteByFactId.get(row.fact.id) ?? null,
		})),
		metadata: page.metadata,
	};
}

export async function pullUserSeenFactReelDeck(
	input: PullUserSeenFactReelDeckInput,
	viewerUserId: string,
	dbClient: Database,
): Promise<PullUserSeenFactReelDeckOutput> {
	const profileUser = await assertOwnProfileReplays(
		viewerUserId,
		input.username,
		dbClient,
	);

	const excludeFactIds = new Set(input.excludeFactIds);

	let anchor: { createdAt: Date; id: string } | null = null;
	if (input.anchorFactId && excludeFactIds.size === 0) {
		const anchorRow = await dbClient.factImpression.findUnique({
			where: {
				factId_userId: {
					factId: input.anchorFactId,
					userId: profileUser.id,
				},
			},
			select: {
				id: true,
				createdAt: true,
				fact: { select: { publishedAt: true } },
			},
		});

		if (!anchorRow?.fact.publishedAt) {
			throw new ORPCError("NOT_FOUND", {
				message: "Fact not found in replays",
			});
		}

		anchor = { id: anchorRow.id, createdAt: anchorRow.createdAt };
	}

	const impressionRows = await dbClient.factImpression.findMany({
		where: buildSeenImpressionWhere(profileUser.id, excludeFactIds, anchor),
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		take: input.limit,
		select: {
			fact: {
				select: {
					...publishedFactSelect,
					votes: {
						where: { userId: viewerUserId },
						select: { value: true },
						take: 1,
					},
				},
			},
		},
	});

	const items = impressionRows.map((row) =>
		mapReelItem(row.fact as PublishedFactRow),
	);

	return {
		username: profileUser.username,
		items,
		exhausted: items.length < input.limit,
	};
}

export async function markFactReelSeen(
	input: MarkFactReelSeenInput,
	userId: string,
	dbClient: Database,
): Promise<{ ok: true }> {
	const fact = await dbClient.fact.findUnique({
		where: { id: input.factId },
		select: { id: true, publishedAt: true },
	});

	if (!fact?.publishedAt) {
		throw new ORPCError("NOT_FOUND", { message: "Fact not found" });
	}

	await dbClient.factImpression.upsert({
		where: {
			factId_userId: { factId: input.factId, userId },
		},
		create: { factId: input.factId, userId },
		update: {},
	});

	return { ok: true };
}

export async function setFactVote(
	input: SetFactVoteInput,
	userId: string,
	dbClient: Database,
): Promise<SetFactVoteOutput> {
	const fact = await dbClient.fact.findUnique({
		where: { id: input.factId },
		select: { id: true, publishedAt: true },
	});

	if (!fact?.publishedAt) {
		throw new ORPCError("NOT_FOUND", { message: "Fact not found" });
	}

	const existing = await dbClient.factVote.findUnique({
		where: {
			factId_userId: { factId: input.factId, userId },
		},
		select: { id: true, value: true },
	});

	if (existing?.value === input.direction) {
		await dbClient.factVote.delete({ where: { id: existing.id } });
		return { viewerVote: null };
	}

	await dbClient.factVote.upsert({
		where: {
			factId_userId: { factId: input.factId, userId },
		},
		create: {
			factId: input.factId,
			userId,
			value: input.direction,
		},
		update: {
			value: input.direction,
		},
	});

	return { viewerVote: input.direction };
}
