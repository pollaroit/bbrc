import { goalProgressPercent } from "@bbrc/shared";
import { cn } from "@/lib/utils";

type GoalProgressBarProps = {
	current: number;
	target: number;
	isComplete?: boolean;
	className?: string;
};

export function GoalProgressBar({
	current,
	target,
	isComplete = current >= target,
	className,
}: GoalProgressBarProps) {
	const percent = goalProgressPercent(current, target);

	return (
		<div className={cn("space-y-1.5", className)}>
			<div className="flex items-baseline justify-between gap-3 text-sm">
				<span className="font-medium tabular-nums">
					{current} / {target} books
				</span>
				<span className="text-muted-foreground tabular-nums">{percent}%</span>
			</div>
			<div
				className="h-2 border border-border bg-muted/30"
				role="progressbar"
				aria-valuenow={Math.min(current, target)}
				aria-valuemin={0}
				aria-valuemax={target}
				aria-label={`${current} of ${target} books`}
			>
				<div
					className={cn(
						"h-full transition-[width] duration-300 motion-reduce:transition-none",
						isComplete ? "bg-success" : "bg-foreground",
					)}
					style={{ width: `${percent}%` }}
				/>
			</div>
		</div>
	);
}
