import { achievementTierClassName } from "@/components/blocks/achievement-badge";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { cn } from "@/lib/utils";

type TierLadderProps = {
	/** Value needed for each tier, lowest first. */
	thresholds: readonly number[];
	/** Highest tier earned (0 for none). */
	tier: number;
	/** 0 to 1: how far the member is toward the next tier. */
	progress?: number;
	/** Tier names, shown under the steps in the large variant. */
	names?: readonly string[];
	/** Small and quiet for lists, or large with labels for the detail page. */
	size?: "sm" | "lg";
	className?: string;
};

const SM_HEIGHTS = ["h-2", "h-2.5", "h-3", "h-3.5", "h-4"] as const;

/**
 * The achievement's tiers as rising steps. Earned steps are filled in the
 * tier's colour; the next one fills from the bottom as progress grows.
 */
export function TierLadder({
	thresholds,
	tier,
	progress = 0,
	names,
	size = "sm",
	className,
}: TierLadderProps) {
	const f = useFormatters();
	const count = thresholds.length;

	if (size === "sm") {
		return (
			<span
				className={cn("flex items-end gap-0.5", className)}
				role="img"
				aria-label={`Tier ${tier} of ${count}`}
			>
				{thresholds.map((threshold, index) => (
					<span
						key={threshold}
						className={cn(
							"w-1.5 border",
							SM_HEIGHTS[Math.min(index, SM_HEIGHTS.length - 1)],
							index < tier
								? "border-foreground bg-foreground"
								: index === tier && progress > 0
									? "border-foreground/50 bg-foreground/30"
									: "border-border bg-transparent",
						)}
					/>
				))}
			</span>
		);
	}

	return (
		<ol
			className={cn("flex items-end gap-2 sm:gap-3", className)}
			aria-label="Tiers"
		>
			{thresholds.map((threshold, index) => {
				const earned = index < tier;
				const isNext = index === tier;
				const height = 3.5 + (index / Math.max(count - 1, 1)) * 5.5;
				return (
					<li
						key={threshold}
						className="flex min-w-0 flex-1 flex-col items-stretch gap-1.5"
					>
						<span className="text-center text-muted-foreground text-xs tabular-nums">
							{f.number(threshold)}
						</span>
						<span
							className={cn(
								"relative flex origin-bottom animate-tier-rise items-end justify-center overflow-hidden border",
								earned
									? achievementTierClassName(index + 1, count)
									: "border-border border-dashed bg-background",
							)}
							style={{
								height: `${height}rem`,
								animationDelay: `${index * 90}ms`,
							}}
						>
							{isNext && progress > 0 ? (
								<span
									className="absolute inset-x-0 bottom-0 bg-primary/25"
									style={{ height: `${Math.round(progress * 100)}%` }}
									aria-hidden
								/>
							) : null}
							<span
								className={cn(
									"relative pb-1.5 font-medium text-xs",
									earned ? "" : "text-muted-foreground/70",
								)}
							>
								{index + 1}
							</span>
						</span>
						{names?.[index] ? (
							<span
								className={cn(
									"truncate text-center text-xs",
									earned ? "font-medium" : "text-muted-foreground",
								)}
							>
								{names[index]}
							</span>
						) : null}
					</li>
				);
			})}
		</ol>
	);
}
