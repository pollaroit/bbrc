"use client";

import type { AdminQuizOverviewOutput } from "@bbrc/api/modules/admin/admin-quiz.schema";
import { Badge } from "@bbrc/ui/components/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import type { Route } from "next";
import Link from "next/link";
import { formatDateTime } from "@/lib/format-datetime";
import { adminQuizStatusLabels } from "@/lib/listing/admin-quizzes-listing";

type Item = AdminQuizOverviewOutput["rankings"]["mostAttempted"][number];

function QuizRankingCard({
	title,
	items,
	metricLabel,
	secondaryLabel,
	format,
}: {
	title: string;
	items: Item[];
	metricLabel: string;
	secondaryLabel?: string;
	format?: (metric: number) => string;
}) {
	return (
		<Card size="sm">
			<CardHeader className="pb-2">
				<CardTitle className="text-sm">{title}</CardTitle>
			</CardHeader>
			<CardContent>
				{items.length === 0 ? (
					<p className="text-muted-foreground text-sm">Nothing to show yet.</p>
				) : (
					<ul>
						{items.map((item) => (
							<li
								key={item.quizId}
								className="flex items-start gap-2 border-border border-b py-2 last:border-0"
							>
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-center gap-2">
										<Link
											href={`/books/${item.bookSlug}` as Route}
											className="line-clamp-2 font-medium text-sm hover:underline"
										>
											{item.title}
										</Link>
										<Badge variant="secondary">
											{adminQuizStatusLabels[item.status]}
										</Badge>
									</div>
									<p className="text-muted-foreground text-xs tabular-nums">
										{metricLabel}: {format ? format(item.metric) : item.metric}
										{item.secondaryMetric != null && secondaryLabel
											? ` · ${secondaryLabel}: ${item.secondaryMetric}`
											: ""}
									</p>
								</div>
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}

export function AdminQuizRankingLists({
	rankings,
}: {
	rankings: AdminQuizOverviewOutput["rankings"];
}) {
	return (
		<div className="grid gap-4 lg:grid-cols-2">
			<QuizRankingCard
				title="Most attempted"
				items={rankings.mostAttempted}
				metricLabel="Attempts"
				secondaryLabel="Reports"
			/>
			<QuizRankingCard
				title="Most reported"
				items={rankings.mostReported}
				metricLabel="Reports"
				secondaryLabel="Attempts"
			/>
			<QuizRankingCard
				title="Highest average score"
				items={rankings.highestAverageScore}
				metricLabel="Average"
				secondaryLabel="Attempts"
				format={(metric) => metric.toFixed(1)}
			/>
			<QuizRankingCard
				title="Lowest average score"
				items={rankings.lowestAverageScore}
				metricLabel="Average"
				secondaryLabel="Attempts"
				format={(metric) => metric.toFixed(1)}
			/>
			<QuizRankingCard
				title="Recently generated"
				items={rankings.recentlyGenerated}
				metricLabel="Generated"
				secondaryLabel="Attempts"
				format={(metric) => formatDateTime(new Date(metric))}
			/>
			<Card size="sm">
				<CardHeader className="pb-2">
					<CardTitle className="text-sm">Top quiz generators</CardTitle>
				</CardHeader>
				<CardContent>
					{rankings.topGenerators.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Nothing to show yet.
						</p>
					) : (
						<ul>
							{rankings.topGenerators.map((user) => (
								<li
									key={user.username}
									className="flex items-center justify-between gap-2 border-border border-b py-2 text-sm last:border-0"
								>
									<Link
										href={`/users/${user.username}` as Route}
										className="font-medium hover:underline"
									>
										{user.name}{" "}
										<span className="text-muted-foreground">
											@{user.username}
										</span>
									</Link>
									<span className="text-muted-foreground text-xs tabular-nums">
										{user.count} quizzes
									</span>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
