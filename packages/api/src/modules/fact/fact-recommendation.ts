import type { Database } from "@bbrc/db";
import type { FactCategory } from "../admin/admin-fact.schema";

type TasteProfile = {
	categoryScores: Map<FactCategory, number>;
	subcategoryScores: Map<string, number>;
};

type ScoredFact = {
	id: string;
	score: number;
};

const CATEGORY_UP = 2;
const CATEGORY_DOWN = -2.5;
const SUBCATEGORY_UP = 3;
const SUBCATEGORY_DOWN = -3.5;
const NEUTRAL_SUBCATEGORY = -0.35;

function normalizeSubcategory(value: string | null | undefined): string | null {
	if (!value) {
		return null;
	}
	const trimmed = value.trim().toLowerCase();
	return trimmed.length > 0 ? trimmed : null;
}

export async function buildUserTasteProfile(
	userId: string,
	db: Database,
): Promise<TasteProfile> {
	const categoryScores = new Map<FactCategory, number>();
	const subcategoryScores = new Map<string, number>();

	const votes = await db.factVote.findMany({
		where: { userId },
		select: {
			value: true,
			fact: { select: { category: true, subcategory: true } },
		},
	});

	for (const vote of votes) {
		const category = vote.fact.category;
		const subcategory = normalizeSubcategory(vote.fact.subcategory);
		const categoryDelta = vote.value === "up" ? CATEGORY_UP : CATEGORY_DOWN;
		const subDelta = vote.value === "up" ? SUBCATEGORY_UP : SUBCATEGORY_DOWN;

		categoryScores.set(
			category,
			(categoryScores.get(category) ?? 0) + categoryDelta,
		);
		if (subcategory) {
			subcategoryScores.set(
				subcategory,
				(subcategoryScores.get(subcategory) ?? 0) + subDelta,
			);
		}
	}

	const neutralImpressions = await db.factImpression.findMany({
		where: {
			userId,
			fact: { votes: { none: { userId } } },
		},
		select: {
			fact: { select: { subcategory: true } },
		},
		take: 500,
		orderBy: { createdAt: "desc" },
	});

	for (const row of neutralImpressions) {
		const subcategory = normalizeSubcategory(row.fact.subcategory);
		if (!subcategory) {
			continue;
		}
		subcategoryScores.set(
			subcategory,
			(subcategoryScores.get(subcategory) ?? 0) + NEUTRAL_SUBCATEGORY,
		);
	}

	return { categoryScores, subcategoryScores };
}

export function scoreFactForUser(
	fact: {
		id: string;
		category: FactCategory;
		subcategory: string | null;
	},
	profile: TasteProfile,
): number {
	let score = 0;
	score += profile.categoryScores.get(fact.category) ?? 0;

	const subcategory = normalizeSubcategory(fact.subcategory);
	if (subcategory) {
		score += profile.subcategoryScores.get(subcategory) ?? 0;
	}

	// Small jitter so ties don't always pick the same ordering.
	score += (hashString(fact.id) % 1000) / 10_000;

	return score;
}

function hashString(value: string): number {
	let hash = 0;
	for (let index = 0; index < value.length; index += 1) {
		hash = (hash * 31 + value.charCodeAt(index)) | 0;
	}
	return Math.abs(hash);
}

export function rankFactsForUser<
	T extends { id: string; category: FactCategory; subcategory: string | null },
>(facts: T[], profile: TasteProfile, limit: number): T[] {
	if (facts.length <= limit) {
		return facts;
	}

	const scored: ScoredFact[] = facts.map((fact) => ({
		id: fact.id,
		score: scoreFactForUser(fact, profile),
	}));

	scored.sort((a, b) => b.score - a.score);

	// Blend top picks with exploration: take best 70% of slots from top half of pool, rest from weighted random.
	const topHalf = scored.slice(0, Math.ceil(scored.length / 2));
	const exploration = scored.slice(Math.ceil(scored.length / 2));

	const primaryCount = Math.max(1, Math.ceil(limit * 0.7));
	const pickedIds = new Set<string>();

	const primary = topHalf.slice(0, primaryCount);
	for (const row of primary) {
		pickedIds.add(row.id);
	}

	const remaining = limit - pickedIds.size;
	const pool = [...topHalf.slice(primaryCount), ...exploration].filter(
		(row) => !pickedIds.has(row.id),
	);

	for (let index = 0; index < remaining && pool.length > 0; index += 1) {
		const weights = pool.map((row) => Math.max(0.1, row.score + 4));
		const total = weights.reduce((sum, weight) => sum + weight, 0);
		let roll = Math.random() * total;
		let pickIndex = 0;
		for (let weightIndex = 0; weightIndex < weights.length; weightIndex += 1) {
			roll -= weights[weightIndex] ?? 0;
			if (roll <= 0) {
				pickIndex = weightIndex;
				break;
			}
		}
		const picked = pool.splice(pickIndex, 1)[0];
		if (picked) {
			pickedIds.add(picked.id);
		}
	}

	const byId = new Map(facts.map((fact) => [fact.id, fact]));
	return [...pickedIds]
		.map((id) => byId.get(id))
		.filter((fact): fact is T => fact != null);
}
