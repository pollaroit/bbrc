"use client";

import { ACHIEVEMENT_BY_KEY } from "@bbrc/shared";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@bbrc/ui/components/tooltip";
import type { Route } from "next";
import { AchievementBadge } from "@/components/blocks/achievement-badge";
import { usePinnedAwards } from "@/components/blocks/user-achievements-panel";
import { Link } from "@/i18n/navigation";

/** The member's pinned achievements, shown on their profile header. Renders nothing when none are pinned. */
export function PinnedAchievements({ username }: { username: string }) {
	const query = usePinnedAwards(username);
	const pinned = (query.data?.awards ?? [])
		.filter((award) => award.pinOrder != null)
		.sort((a, b) => (a.pinOrder ?? 0) - (b.pinOrder ?? 0));

	if (pinned.length === 0) {
		return null;
	}

	return (
		<ul
			className="flex flex-wrap items-center gap-2"
			aria-label="Pinned achievements"
		>
			{pinned.map((award) => {
				const definition = ACHIEVEMENT_BY_KEY.get(award.key);
				if (!definition) return null;
				return (
					<li key={award.id}>
						<Tooltip>
							<TooltipTrigger
								render={
									<Link
										href={`/users/${username}/achievements` as Route}
										aria-label={`${definition.name}, pinned achievement`}
									/>
								}
							>
								<AchievementBadge
									icon={definition.icon}
									tier={award.tier}
									tierCount={definition.thresholds.length}
									size="sm"
								/>
							</TooltipTrigger>
							<TooltipContent>{definition.name}</TooltipContent>
						</Tooltip>
					</li>
				);
			})}
		</ul>
	);
}
