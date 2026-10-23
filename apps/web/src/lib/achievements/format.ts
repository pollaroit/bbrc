const dateFormat = new Intl.DateTimeFormat("en", {
	month: "short",
	day: "numeric",
	year: "numeric",
});

export function formatAchievementDate(iso: string): string {
	return dateFormat.format(new Date(iso));
}

export type Rarity = { label: string; className: string };

/** How rare an achievement tier is, from the share of members who earned it. */
export function rarityOf(earnedBy: number, memberCount: number): Rarity {
	if (earnedBy === 0) {
		return { label: "Unclaimed", className: "text-muted-foreground" };
	}
	const share = earnedBy / Math.max(memberCount, 1);
	if (share >= 0.5) {
		return { label: "Common", className: "text-muted-foreground" };
	}
	if (share >= 0.2) {
		return { label: "Uncommon", className: "text-success-ink" };
	}
	if (share >= 0.05) {
		return { label: "Rare", className: "text-info-ink" };
	}
	if (earnedBy >= 3) {
		return { label: "Epic", className: "text-violet-ink" };
	}
	return { label: "Legendary", className: "text-warning-ink" };
}

export function percentLabel(earnedBy: number, memberCount: number): string {
	if (memberCount === 0) return "0%";
	const share = (earnedBy / memberCount) * 100;
	return `${share >= 10 || share === 0 ? Math.round(share) : share.toFixed(1)}%`;
}
