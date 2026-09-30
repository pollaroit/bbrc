import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { cn } from "@/lib/utils";

const copy: Record<
	GetSittingBySlugOutput["status"],
	{ title: string; description: string; accent: string }
> = {
	voting: {
		title: "Voting phase",
		description:
			"Members rank poll options below. When voting ends, an admin picks the club read and the sitting moves to reading.",
		accent: "border-l-primary",
	},
	reading: {
		title: "Reading phase",
		description:
			"The club is reading the selected book. Mark when you start and when you finish — the poll is closed.",
		accent: "border-l-emerald-600 dark:border-l-emerald-500",
	},
	finished: {
		title: "Finished",
		description:
			"This sitting is complete. Reviews and final reading outcomes are the focus now.",
		accent: "border-l-muted-foreground",
	},
};

type SittingPhaseIntroProps = {
	status: GetSittingBySlugOutput["status"];
	className?: string;
};

export function SittingPhaseIntro({
	status,
	className,
}: SittingPhaseIntroProps) {
	const { title, description, accent } = copy[status];

	return (
		<div className={cn("border-l-4 bg-muted/40 px-4 py-3", accent, className)}>
			<p className="font-medium text-sm">{title}</p>
			<p className="text-muted-foreground text-sm leading-relaxed">
				{description}
			</p>
		</div>
	);
}
