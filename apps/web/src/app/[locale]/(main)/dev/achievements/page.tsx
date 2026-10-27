import type { AchievementSummary } from "@bbrc/api/modules/achievement/achievement.schema";
import {
	ACHIEVEMENTS,
	achievementName,
	describeTier,
	tierName,
} from "@bbrc/shared";
import { notFound } from "next/navigation";
import { AchievementRow } from "@/components/blocks/achievement-row";

/** Builds a card model from the registry with made-up progress, so every state can be seen. */
function sample(index: number): AchievementSummary {
	const definition = ACHIEVEMENTS[index] as (typeof ACHIEVEMENTS)[number];
	const tierCount = definition.thresholds.length;
	// Cycle through: locked, started, partly earned, everything earned.
	const state = index % 4;
	const earned =
		state === 0
			? 0
			: state === 1
				? 0
				: state === 2
					? Math.max(1, tierCount - 1)
					: tierCount;
	const next = definition.thresholds[earned] ?? null;
	return {
		key: definition.key,
		slug: definition.slug,
		name: achievementName(definition.key),
		category: definition.category,
		icon: definition.icon,
		isHidden: Boolean(definition.isHidden),
		isYearly: definition.period === "year",
		tiers: definition.thresholds.map((threshold, i) => ({
			tier: i + 1,
			name: tierName(definition, i + 1),
			threshold,
			description: describeTier(definition, i + 1),
			earnedBy: Math.max(0, 9 - i * 2 - (index % 3)),
		})),
		viewer: {
			tier: earned,
			value: state === 1 && next ? Math.ceil(next / 2) : next ? next - 1 : 0,
			next,
			nextTier: next ? earned + 1 : null,
			earnedAtByTier: {},
		},
	};
}

export default function AchievementsDevPage() {
	if (process.env.NODE_ENV === "production") {
		notFound();
	}

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">
					Achievement cards
				</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Every achievement with made-up progress (locked, started, partly and
					fully earned), to check badges and tiers under any palette.
				</p>
			</div>
			<ul className="border-border border-t">
				{ACHIEVEMENTS.map((definition, index) => (
					<li key={definition.key}>
						<AchievementRow item={sample(index)} memberCount={14} />
					</li>
				))}
			</ul>
		</div>
	);
}
