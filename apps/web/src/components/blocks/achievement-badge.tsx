import { achievementIcon } from "@/lib/achievements/icons";
import { cn } from "@/lib/utils";

type AchievementBadgeProps = {
	icon: string;
	/** Tier earned (1-based); 0 shows the locked look. */
	tier: number;
	/** How many tiers the achievement has. */
	tierCount: number;
	size?: "sm" | "md" | "lg";
	className?: string;
};

/** Tiers climb from neutral through cool and green to gold and violet, all from theme tokens. */
const TIER_CLASSES = [
	"border-border bg-muted text-foreground",
	"border-info/40 bg-info/10 text-info-ink",
	"border-success/40 bg-success/10 text-success-ink",
	"border-warning/50 bg-warning/15 text-warning-ink",
	"border-violet/50 bg-violet/15 text-violet-ink",
] as const;

const SINGLE_TIER = "border-warning/50 bg-warning/15 text-warning-ink";

const SIZES = {
	sm: { box: "size-8", icon: "size-4" },
	md: { box: "size-12", icon: "size-6" },
	lg: { box: "size-20", icon: "size-10" },
} as const;

export function achievementTierClassName(tier: number, tierCount: number) {
	if (tier <= 0) {
		return "border-dashed border-border bg-background text-muted-foreground/60";
	}
	return tierCount === 1
		? SINGLE_TIER
		: (TIER_CLASSES[Math.min(tier, TIER_CLASSES.length) - 1] ??
				TIER_CLASSES[0]);
}

export function AchievementBadge({
	icon,
	tier,
	tierCount,
	size = "md",
	className,
}: AchievementBadgeProps) {
	const Icon = achievementIcon(icon);
	const dimensions = SIZES[size];

	return (
		<span
			className={cn(
				"relative inline-flex shrink-0 items-center justify-center border",
				dimensions.box,
				achievementTierClassName(tier, tierCount),
				className,
			)}
			aria-hidden
		>
			<Icon className={dimensions.icon} />
		</span>
	);
}

/** One small square per tier, filled up to the tier earned. */
export function TierPips({
	tier,
	tierCount,
	className,
}: {
	tier: number;
	tierCount: number;
	className?: string;
}) {
	if (tierCount <= 1) {
		return null;
	}
	return (
		<span className={cn("flex gap-1", className)} aria-hidden>
			{Array.from({ length: tierCount }, (_, index) => (
				<span
					key={index}
					className={cn(
						"size-1.5 border border-border",
						index < tier ? "bg-foreground" : "bg-transparent",
					)}
				/>
			))}
		</span>
	);
}
