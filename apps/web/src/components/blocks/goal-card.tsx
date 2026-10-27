import type { GoalListItemSchema } from "@bbrc/api/modules/goal/goal.schema";
import { Badge } from "@bbrc/ui/components/badge";
import type { Route } from "next";
import type { z } from "zod";
import { GoalProgressBar } from "@/components/blocks/goal-progress-bar";
import { GoalScopeChips } from "@/components/blocks/goal-scope-chips";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type GoalListItem = z.infer<typeof GoalListItemSchema>;

type GoalCardProps = {
	username: string;
	goal: GoalListItem;
};

export function GoalCard({ username, goal }: GoalCardProps) {
	const href = `/users/${username}/goals/${goal.slug}` as Route;

	return (
		<Link
			href={href}
			className={cn(
				"flex h-full flex-col gap-4 border border-border p-4 transition-colors hover:bg-muted/40",
				goal.isComplete && "border-success/50 bg-success/5",
			)}
		>
			<div className="flex items-start justify-between gap-3">
				<h3 className="font-semibold leading-snug">{goal.title}</h3>
				<div className="flex shrink-0 items-center gap-2">
					{goal.isComplete ? (
						<Badge className="border-success/30 bg-success text-white">
							Complete
						</Badge>
					) : null}
					{goal.isExpired && !goal.isComplete ? (
						<Badge variant="secondary">Expired</Badge>
					) : null}
					<span className="text-muted-foreground text-sm tabular-nums">
						{goal.year}
					</span>
				</div>
			</div>

			{goal.description ? (
				<p className="line-clamp-2 text-muted-foreground text-sm leading-relaxed">
					{goal.description}
				</p>
			) : null}

			<GoalScopeChips scope={goal.scope} />

			<GoalProgressBar
				current={goal.current}
				target={goal.target}
				isComplete={goal.isComplete}
				className="mt-auto"
			/>
		</Link>
	);
}
