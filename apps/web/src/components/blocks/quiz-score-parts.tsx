import { Check, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuizCounts({
	correct,
	incorrect,
	skipped,
	className,
}: {
	correct: number;
	incorrect: number;
	skipped: number;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-3 text-muted-foreground text-xs tabular-nums",
				className,
			)}
		>
			<span
				className="inline-flex items-center gap-0.5"
				title={`${correct} correct`}
			>
				<Check
					className="size-3.5 text-emerald-700 dark:text-emerald-400"
					aria-hidden
				/>
				{correct}
			</span>
			<span
				className="inline-flex items-center gap-0.5"
				title={`${incorrect} wrong`}
			>
				<X className="size-3.5 text-destructive" aria-hidden />
				{incorrect}
			</span>
			<span
				className="inline-flex items-center gap-0.5"
				title={`${skipped} skipped`}
			>
				<Minus className="size-3.5" aria-hidden />
				{skipped}
			</span>
		</span>
	);
}

export function QuizScore({
	score,
	className,
}: {
	score: number;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"font-semibold text-lg tabular-nums",
				score < 0 && "text-destructive",
				className,
			)}
		>
			{score > 0 ? `+${score}` : score}
		</span>
	);
}

export function QuizRank({ rank }: { rank: number }) {
	return (
		<span
			className={cn(
				"inline-flex size-8 shrink-0 items-center justify-center border border-border font-semibold text-sm tabular-nums",
				rank === 1 && "border-amber-600/60 bg-amber-100 text-amber-950",
				rank === 2 && "border-slate-500/60 bg-slate-200 text-slate-900",
				rank === 3 && "border-orange-700/50 bg-orange-100 text-orange-950",
			)}
		>
			{rank}
		</span>
	);
}
