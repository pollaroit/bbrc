import type { Database, Prisma } from "@bbrc/db";
import { ORPCError } from "@orpc/server";
import { assertHttpsUrl, assertOptionalFactImageUrl } from "../../lib/fact-url";
import { getGeminiConfig } from "../../lib/gemini/config";
import { geminiGenerateJson } from "../../lib/gemini/generate-json";
import { definePagination } from "../../utils/pagination";
import { adminFactListSorting } from "./admin-fact.listing";
import {
	ADMIN_FACT_SYSTEM_PROMPT,
	buildAdminFactUserPrompt,
	pickRandomFactCategory,
} from "./admin-fact.prompts";
import {
	AdminFactDraftSchema,
	type AdminFactIdInput,
	type AdminFactRecord,
	type AdminFactStreamEvent,
	adminFactDraftGeminiSchema,
	type BatchCreateAdminFactsInput,
	type BatchCreateAdminFactsOutput,
	type CreateAdminFactInput,
	DEFAULT_FACT_GENERATION_BATCH,
	type FactCategory,
	type GenerateAdminFactDraftInput,
	type GenerateAdminFactDraftOutput,
	type ListAdminFactEngagementInput,
	type ListAdminFactEngagementOutput,
	type ListAdminFactsInput,
	type ListAdminFactsOutput,
} from "./admin-fact.schema";

const adminFactSelect = {
	id: true,
	body: true,
	category: true,
	source: true,
	image: true,
	confidence: true,
	createdAt: true,
	publishedAt: true,
	createdBy: {
		select: {
			id: true,
			name: true,
			username: true,
		},
	},
	_count: { select: { impressions: true } },
	votes: { select: { value: true } },
} as const satisfies Prisma.FactSelect;

type AdminFactRow = Prisma.FactGetPayload<{ select: typeof adminFactSelect }>;

function mapAdminFact(row: AdminFactRow): AdminFactRecord {
	let upvoteCount = 0;
	let downvoteCount = 0;
	for (const vote of row.votes) {
		if (vote.value === "up") {
			upvoteCount += 1;
		} else {
			downvoteCount += 1;
		}
	}

	return {
		id: row.id,
		body: row.body,
		category: row.category,
		source: row.source,
		image: row.image,
		confidence: row.confidence,
		createdAt: row.createdAt,
		publishedAt: row.publishedAt,
		createdBy: row.createdBy,
		upvoteCount,
		downvoteCount,
		impressionCount: row._count.impressions,
	};
}

const factEngagementUserSelect = {
	id: true,
	name: true,
	username: true,
	image: true,
} as const;

async function assertAdminFactExists(factId: string, db: Database) {
	const fact = await db.fact.findUnique({
		where: { id: factId },
		select: { id: true },
	});
	if (!fact) {
		throw new ORPCError("NOT_FOUND", { message: "Fact not found" });
	}
}

export async function listAdminFactVotes(
	input: ListAdminFactEngagementInput & { direction: "up" | "down" },
	db: Database,
): Promise<ListAdminFactEngagementOutput> {
	await assertAdminFactExists(input.id, db);
	const pagination = definePagination.offset(input);

	const where = { factId: input.id, value: input.direction };

	const [rows, total] = await Promise.all([
		db.factVote.findMany({
			...pagination.use(),
			where,
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
			select: {
				createdAt: true,
				user: { select: factEngagementUserSelect },
			},
		}),
		db.factVote.count({ where }),
	]);

	const page = pagination.paginate(rows, total);

	return {
		items: page.items.map((row) => ({
			user: row.user,
			createdAt: row.createdAt,
		})),
		metadata: page.metadata,
	};
}

export async function listAdminFactImpressions(
	input: ListAdminFactEngagementInput,
	db: Database,
): Promise<ListAdminFactEngagementOutput> {
	await assertAdminFactExists(input.id, db);
	const pagination = definePagination.offset(input);

	const where = { factId: input.id };

	const [rows, total] = await Promise.all([
		db.factImpression.findMany({
			...pagination.use(),
			where,
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
			select: {
				createdAt: true,
				user: { select: factEngagementUserSelect },
			},
		}),
		db.factImpression.count({ where }),
	]);

	const page = pagination.paginate(rows, total);

	return {
		items: page.items.map((row) => ({
			user: row.user,
			createdAt: row.createdAt,
		})),
		metadata: page.metadata,
	};
}

function validateFactUrls(source: string, image?: string): void {
	try {
		assertHttpsUrl(source, "Source");
		assertOptionalFactImageUrl(image);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Invalid URL";
		throw new ORPCError("BAD_REQUEST", { message });
	}
}

function requireGeminiConfig() {
	const config = getGeminiConfig();
	if (!config) {
		throw new ORPCError("PRECONDITION_FAILED", {
			message:
				"Gemini is not configured. Set GEMINI_API_KEY in the server environment.",
		});
	}
	return config;
}

async function generateOneAdminFactDraft(input: {
	category?: FactCategory;
	topic?: string;
	avoidFacts?: string[];
	index?: number;
	total?: number;
}) {
	const config = requireGeminiConfig();
	const userPrompt = buildAdminFactUserPrompt(input);

	return geminiGenerateJson({
		config,
		systemInstruction: ADMIN_FACT_SYSTEM_PROMPT,
		userPrompt,
		responseSchema: adminFactDraftGeminiSchema,
		parse: (value) => AdminFactDraftSchema.parse(value),
	});
}

export async function generateAdminFactDraft(
	input: GenerateAdminFactDraftInput,
): Promise<GenerateAdminFactDraftOutput> {
	try {
		return await generateOneAdminFactDraft(input);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Fact generation failed";
		throw new ORPCError("BAD_GATEWAY", {
			message,
		});
	}
}

export async function* streamAdminFactDrafts(input: {
	count?: number;
	category?: FactCategory;
	topic?: string;
}): AsyncGenerator<AdminFactStreamEvent> {
	const targetCount = input.count ?? DEFAULT_FACT_GENERATION_BATCH;
	requireGeminiConfig();

	yield { type: "meta", targetCount };

	const avoidFacts: string[] = [];

	for (let index = 0; index < targetCount; index += 1) {
		try {
			const draft = await generateOneAdminFactDraft({
				category: input.category ?? pickRandomFactCategory(),
				topic: input.topic,
				avoidFacts,
				index,
				total: targetCount,
			});
			avoidFacts.push(draft.fact);
			yield { type: "fact", index, draft };
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Fact generation failed";
			yield { type: "error", index, message };
		}
	}

	yield { type: "done" };
}

export async function createAdminFact(
	input: CreateAdminFactInput,
	createdById: string,
	db: Database,
): Promise<AdminFactRecord> {
	validateFactUrls(input.source, input.image);

	const row = await db.fact.create({
		data: {
			body: input.body,
			category: input.category,
			subcategory: input.subcategory ?? null,
			source: input.source,
			image: input.image ?? null,
			confidence: input.confidence,
			aiGenerated: true,
			createdById,
			publishedAt: input.publish ? new Date() : null,
		},
		select: adminFactSelect,
	});

	return mapAdminFact(row);
}

export async function batchCreateAdminFacts(
	input: BatchCreateAdminFactsInput,
	createdById: string,
	db: Database,
): Promise<BatchCreateAdminFactsOutput> {
	const publishedAt = input.publish ? new Date() : null;
	const created: AdminFactRecord[] = [];

	for (const item of input.items) {
		validateFactUrls(item.source);
		const row = await db.fact.create({
			data: {
				body: item.body,
				category: item.category,
				subcategory: item.subcategory,
				source: item.source,
				confidence: item.confidence,
				image: null,
				aiGenerated: true,
				createdById,
				publishedAt,
			},
			select: adminFactSelect,
		});
		created.push(mapAdminFact(row));
	}

	return { created };
}

function adminFactsListWhere(
	input: ListAdminFactsInput,
): Prisma.FactWhereInput {
	if (input.status === "draft") {
		return { publishedAt: null };
	}
	if (input.status === "published") {
		return { publishedAt: { not: null } };
	}
	return {};
}

function stableFactIdOrder(
	direction: "asc" | "desc",
): Prisma.FactOrderByWithRelationInput {
	return { id: direction };
}

async function listAdminFactsSortedByVoteCount(
	input: ListAdminFactsInput,
	db: Database,
	where: Prisma.FactWhereInput,
	voteValue: "up" | "down",
): Promise<ListAdminFactsOutput> {
	const pagination = definePagination.offset(input);
	const sorting = adminFactListSorting.from(input);
	const direction = sorting.sortDirection;

	const matching = await db.fact.findMany({ where, select: { id: true } });
	const total = matching.length;
	if (total === 0) {
		const page = pagination.paginate([], 0);
		return { items: [], metadata: page.metadata };
	}

	const counts = await db.factVote.groupBy({
		by: ["factId"],
		where: {
			value: voteValue,
			factId: { in: matching.map((row) => row.id) },
		},
		_count: { _all: true },
	});
	const countByFactId = new Map(
		counts.map((row) => [row.factId, row._count._all]),
	);

	const sortedIds = matching
		.map((row) => row.id)
		.toSorted((a, b) => {
			const diff = (countByFactId.get(a) ?? 0) - (countByFactId.get(b) ?? 0);
			if (diff !== 0) {
				return direction === "asc" ? diff : -diff;
			}
			return direction === "asc" ? a.localeCompare(b) : b.localeCompare(a);
		});

	const { skip, take } = pagination.use();
	const pageIds = sortedIds.slice(skip, skip + take);

	const rows = await db.fact.findMany({
		where: { id: { in: pageIds } },
		select: adminFactSelect,
	});
	const rowById = new Map(rows.map((row) => [row.id, row]));
	const orderedRows = pageIds.flatMap((id) => {
		const row = rowById.get(id);
		return row ? [row] : [];
	});

	const page = pagination.paginate(orderedRows, total);
	return {
		items: page.items.map(mapAdminFact),
		metadata: page.metadata,
	};
}

export async function listAdminFacts(
	input: ListAdminFactsInput,
	db: Database,
): Promise<ListAdminFactsOutput> {
	const pagination = definePagination.offset(input);
	const sorting = adminFactListSorting.from(input);
	const where = adminFactsListWhere(input);

	if (sorting.sortBy === "upvoteCount") {
		return listAdminFactsSortedByVoteCount(input, db, where, "up");
	}
	if (sorting.sortBy === "downvoteCount") {
		return listAdminFactsSortedByVoteCount(input, db, where, "down");
	}

	const primaryOrder = sorting.use();
	const orderBy: Prisma.FactOrderByWithRelationInput[] = [
		primaryOrder,
		stableFactIdOrder(sorting.sortDirection),
	];

	const [rows, total] = await Promise.all([
		db.fact.findMany({
			...pagination.use(),
			where,
			orderBy,
			select: adminFactSelect,
		}),
		db.fact.count({ where }),
	]);

	const page = pagination.paginate(rows, total);

	return {
		items: page.items.map(mapAdminFact),
		metadata: page.metadata,
	};
}

export async function publishAdminFact(
	input: AdminFactIdInput,
	db: Database,
): Promise<AdminFactRecord> {
	const existing = await db.fact.findUnique({
		where: { id: input.id },
		select: { id: true, publishedAt: true },
	});

	if (!existing) {
		throw new ORPCError("NOT_FOUND", { message: "Fact not found" });
	}

	const row = await db.fact.update({
		where: { id: input.id },
		data: {
			publishedAt: existing.publishedAt ?? new Date(),
		},
		select: adminFactSelect,
	});

	return mapAdminFact(row);
}

export async function deleteAdminFact(
	input: AdminFactIdInput,
	db: Database,
): Promise<{ ok: true }> {
	const deleted = await db.fact.deleteMany({ where: { id: input.id } });

	if (deleted.count === 0) {
		throw new ORPCError("NOT_FOUND", { message: "Fact not found" });
	}

	return { ok: true };
}
