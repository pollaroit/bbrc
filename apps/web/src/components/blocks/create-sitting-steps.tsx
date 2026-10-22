import { cn } from "@/lib/utils";

const steps = [
	{ key: "configure", label: "Set up" },
	{ key: "review", label: "Review the draw" },
] as const;

export type CreateSittingStep = (typeof steps)[number]["key"];

/** Two-step progress indicator for the start-a-sitting flow. */
export function CreateSittingSteps({ step }: { step: CreateSittingStep }) {
	const activeIndex = steps.findIndex((item) => item.key === step);

	return (
		<ol className="flex items-center gap-3 text-sm" aria-label="Progress">
			{steps.map((item, index) => {
				const done = index < activeIndex;
				const active = index === activeIndex;
				return (
					<li
						key={item.key}
						className="flex items-center gap-3"
						aria-current={active ? "step" : undefined}
					>
						<span className="flex items-center gap-2">
							<span
								className={cn(
									"flex size-6 items-center justify-center border font-medium text-xs tabular-nums",
									active || done
										? "border-foreground bg-foreground text-background"
										: "border-border text-muted-foreground",
								)}
							>
								{index + 1}
							</span>
							<span
								className={cn(active ? "font-medium" : "text-muted-foreground")}
							>
								{item.label}
							</span>
						</span>
						{index < steps.length - 1 ? (
							<span className="h-px w-8 bg-border" aria-hidden />
						) : null}
					</li>
				);
			})}
		</ol>
	);
}
