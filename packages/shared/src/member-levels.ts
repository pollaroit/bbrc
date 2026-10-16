export type LevelTier = {
	minInclusive: number;
	maxExclusive: number | null;
	label: string;
	/** Human-readable band for UI (matches product ranges). */
	rangeLabel: string;
};

export type MemberLevelSnapshot = {
	label: string;
	minInclusive: number;
	maxExclusive: number | null;
};

type LevelThreshold = {
	minInclusive: number;
	label: string;
	rangeLabel: string;
};

function thresholdsToTiers(thresholds: readonly LevelThreshold[]): LevelTier[] {
	const sorted = [...thresholds].toSorted(
		(a, b) => a.minInclusive - b.minInclusive,
	);

	return sorted.map((entry, index) => {
		const next = sorted[index + 1];
		return {
			minInclusive: entry.minInclusive,
			maxExclusive: next?.minInclusive ?? null,
			label: entry.label,
			rangeLabel: entry.rangeLabel,
		};
	});
}

function resolveFromThresholds(
	points: number,
	thresholds: readonly LevelThreshold[],
): LevelTier {
	const safe = Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0;
	const sorted = [...thresholds].toSorted(
		(a, b) => b.minInclusive - a.minInclusive,
	);
	const hit = sorted.find((tier) => safe >= tier.minInclusive) ??
		sorted.at(-1) ?? {
			minInclusive: 0,
			label: "Unknown",
			rangeLabel: "—",
		};

	const tiers = thresholdsToTiers(thresholds);
	const full = tiers.find((tier) => tier.label === hit.label);

	return (
		full ?? {
			minInclusive: hit.minInclusive,
			maxExclusive: null,
			label: hit.label,
			rangeLabel: hit.rangeLabel,
		}
	);
}

/** Social / club activity — posts, comments, votes, feedback, participation. */
const XP_LEVEL_THRESHOLDS: LevelThreshold[] = [
	{ minInclusive: 10000, label: "Institution", rangeLabel: "10,000+" },
	{ minInclusive: 4000, label: "Luminary", rangeLabel: "4,000–10,000" },
	{ minInclusive: 2000, label: "Pillar", rangeLabel: "2,000–4,000" },
	{ minInclusive: 1000, label: "Host", rangeLabel: "1,000–2,000" },
	{ minInclusive: 500, label: "Contributor", rangeLabel: "500–1,000" },
	{ minInclusive: 250, label: "Voice", rangeLabel: "250–500" },
	{ minInclusive: 100, label: "Regular", rangeLabel: "100–250" },
	{ minInclusive: 25, label: "Participant", rangeLabel: "25–100" },
	{ minInclusive: 10, label: "Newcomer", rangeLabel: "10–25" },
	{ minInclusive: 0, label: "Wallflower", rangeLabel: "0–10" },
];

/** Finished sittings and reading performance (RP). */
const RP_LEVEL_THRESHOLDS: LevelThreshold[] = [
	{ minInclusive: 7500, label: "Grand Reader", rangeLabel: "7,500+" },
	{ minInclusive: 4000, label: "Living Library", rangeLabel: "4,000–7,500" },
	{ minInclusive: 2000, label: "Omnivore", rangeLabel: "2,000–4,000" },
	{ minInclusive: 1000, label: "Saga", rangeLabel: "1,000–2,000" },
	{ minInclusive: 600, label: "Canon", rangeLabel: "600–1,000" },
	{ minInclusive: 350, label: "Bibliophile", rangeLabel: "350–600" },
	{ minInclusive: 200, label: "Bookworm", rangeLabel: "200–350" },
	{ minInclusive: 100, label: "Bookshelf", rangeLabel: "100–200" },
	{ minInclusive: 60, label: "Plotline", rangeLabel: "60–100" },
	{ minInclusive: 35, label: "Chapter", rangeLabel: "35–60" },
	{ minInclusive: 20, label: "Dog-Ear", rangeLabel: "20–35" },
	{ minInclusive: 10, label: "Bookmark", rangeLabel: "10–20" },
	{ minInclusive: 0, label: "Page One", rangeLabel: "0–10" },
];

/** Club activity (posts, votes, participation, …). */
export const XP_LEVEL_TIERS: LevelTier[] =
	thresholdsToTiers(XP_LEVEL_THRESHOLDS);

/** Reading performance (sitting RP totals). Names are distinct from XP tiers. */
export const RP_LEVEL_TIERS: LevelTier[] =
	thresholdsToTiers(RP_LEVEL_THRESHOLDS);

export function resolveXpLevel(xp: number): LevelTier {
	return resolveFromThresholds(xp, XP_LEVEL_THRESHOLDS);
}

export function resolveRpLevel(rp: number): LevelTier {
	return resolveFromThresholds(rp, RP_LEVEL_THRESHOLDS);
}

export function memberLevelSnapshot(tier: LevelTier): MemberLevelSnapshot {
	return {
		label: tier.label,
		minInclusive: tier.minInclusive,
		maxExclusive: tier.maxExclusive,
	};
}

export function memberLevelsForPoints(
	xp: number,
	rp: number,
): {
	xpLevel: MemberLevelSnapshot;
	rpLevel: MemberLevelSnapshot;
} {
	return {
		xpLevel: memberLevelSnapshot(resolveXpLevel(xp)),
		rpLevel: memberLevelSnapshot(resolveRpLevel(rp)),
	};
}

export function isSameLevelTier(a: LevelTier, b: LevelTier): boolean {
	return a.minInclusive === b.minInclusive && a.label === b.label;
}
