import type { GoalListItemSchema } from "@bbrc/api/modules/goal/goal.schema";
import { Badge } from "@bbrc/ui/components/badge";
import type { Route } from "next";
import Link from "next/link";
import type { z } from "zod";
import { GoalProgressBar } from "@/components/blocks/goal-progress-bar";
import { formatGoalScopeSummary } from "@/lib/goal-scope-ui";
import { cn } from "@/lib/utils";

type GoalListItem = z.infer<typeof GoalListItemSchema>;

type GoalCardProps = {
	username: string;
	goal: GoalListItem;
};

export function GoalCard({ username, goal }: GoalCardProps) {
	const href = `/users/${username}/goals/${goal.slug}` as Route;
	const scopeSummary = formatGoalScopeSummary(goal.scope);

	return (
		<Link
			href={href}
			className={cn(
				"flex h-full flex-col gap-4 border border-border p-4 transition-colors hover:bg-muted/40",
				goal.isComplete &&
					"border-emerald-600/50 bg-emerald-500/5 dark:border-emerald-500/40 dark:bg-emerald-500/10",
			)}
		>
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div className="min-w-0 space-y-1">
					<h3 className="font-semibold leading-snug">{goal.title}</h3>
					<p className="text-muted-foreground text-sm">{goal.year}</p>
				</div>
				<div className="flex flex-wrap gap-2">
					{goal.isComplete ? (
						<Badge className="border-emerald-600/30 bg-emerald-600 text-white dark:bg-emerald-500">
							Complete
						</Badge>
					) : null}
					{goal.isExpired && !goal.isComplete ? (
						<Badge variant="secondary">Expired</Badge>
					) : null}
				</div>
			</div>

			{goal.description ? (
				<p className="line-clamp-3 text-muted-foreground text-sm leading-relaxed">
					{goal.description}
				</p>
			) : null}

			{scopeSummary ? (
				<p className="text-muted-foreground text-xs leading-relaxed">
					{scopeSummary}
				</p>
			) : (
				<p className="text-muted-foreground text-xs">All finished reads</p>
			)}

			<GoalProgressBar
				current={goal.current}
				target={goal.target}
				isComplete={goal.isComplete}
				className="mt-auto"
			/>
		</Link>
	);
}
