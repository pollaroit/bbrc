"use client";

import type {
	GetQuizResultsOutput,
	QuizReviewQuestion,
} from "@bbrc/api/modules/quiz/quiz.schema";
import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@bbrc/ui/components/chart";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { Textarea } from "@bbrc/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Flag, X } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import {
	QuizCounts,
	QuizRank,
	QuizScore,
} from "@/components/blocks/quiz-score-parts";
import { UserPanel } from "@/components/blocks/user-panel";
import { Link } from "@/i18n/navigation";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const LETTERS = ["A", "B", "C", "D"];

export function QuizReviewList({
	questions,
	onReport,
}: {
	questions: QuizReviewQuestion[];
	onReport?: (position: number) => void;
}) {
	return (
		<ol className="flex flex-col gap-3">
			{questions.map((item) => (
				<li
					key={item.position}
					className="flex flex-col gap-3 border border-border p-4"
				>
					<div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground text-xs">
						<span>
							Question {item.position} · {item.difficulty}
						</span>
						<span
							className={cn(
								"font-medium tabular-nums",
								item.earned > 0 && "text-success-ink",
								item.earned < 0 && "text-destructive",
							)}
						>
							{item.myAnswer === -1
								? "Skipped · 0"
								: item.earned > 0
									? `+${item.earned}`
									: item.earned}
						</span>
					</div>
					<p className="text-sm leading-relaxed">{item.question}</p>
					<ul className="flex flex-col gap-1.5">
						{item.choices.map((choice, index) => {
							const picked = item.myAnswer === index;
							return (
								<li
									key={choice.text}
									className={cn(
										"flex items-start gap-2.5 border border-border px-3 py-2 text-sm",
										choice.isCorrect &&
											"border-success/60 bg-success/15 text-success-ink",
										picked &&
											!choice.isCorrect &&
											"border-destructive/60 bg-destructive/10",
									)}
								>
									<span className="inline-flex size-5 shrink-0 items-center justify-center border border-current/30 font-semibold text-xs">
										{LETTERS[index]}
									</span>
									<span className="min-w-0 flex-1">{choice.text}</span>
									{choice.isCorrect ? (
										<Check
											className="size-4 shrink-0"
											aria-label="Correct answer"
										/>
									) : picked ? (
										<X
											className="size-4 shrink-0 text-destructive"
											aria-label="Your answer"
										/>
									) : null}
									{picked ? (
										<Badge variant="outline" className="shrink-0">
											Your pick
										</Badge>
									) : null}
								</li>
							);
						})}
					</ul>
					<p className="text-muted-foreground text-xs leading-relaxed">
						{item.explanation}
					</p>
					{onReport ? (
						<div>
							<Button
								type="button"
								variant="ghost"
								size="xs"
								disabled={item.reported}
								onClick={() => onReport(item.position)}
							>
								<Flag data-icon="inline-start" />
								{item.reported ? "Reported" : "Report this question"}
							</Button>
						</div>
					) : null}
				</li>
			))}
		</ol>
	);
}

function ReportDialog({
	slug,
	position,
	onClose,
}: {
	slug: string;
	position: number | null;
	onClose: () => void;
}) {
	const queryClient = useQueryClient();
	const [reason, setReason] = useState("");
	const mutation = useMutation(
		orpc.quiz.reportQuestion.mutationOptions({
			onSuccess: async () => {
				toast.success("Thanks, an admin will take a look.");
				await queryClient.invalidateQueries({
					queryKey: orpc.quiz.getResults.key(),
				});
				setReason("");
				onClose();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	return (
		<Dialog
			open={position != null}
			onOpenChange={(open) => {
				if (!open && !mutation.isPending) onClose();
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Report question {position}</DialogTitle>
					<DialogDescription>
						Think the correct answer or wording is wrong? Tell us what's off. A
						quiz nobody has taken yet can be fixed by an admin.
					</DialogDescription>
				</DialogHeader>
				<Textarea
					value={reason}
					maxLength={500}
					placeholder="Optional: what's wrong with it?"
					onChange={(event) => setReason(event.target.value)}
				/>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						disabled={mutation.isPending}
						onClick={onClose}
					>
						Cancel
					</Button>
					<LoadingButton
						type="button"
						loading={mutation.isPending}
						onClick={() => {
							if (position == null) return;
							mutation.mutate({
								slug,
								position,
								reason: reason.trim() || undefined,
							});
						}}
					>
						Send report
					</LoadingButton>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

const distributionConfig = {
	count: { label: "Readers", color: "var(--chart-1)" },
} satisfies ChartConfig;
const difficultyConfig = {
	correctPercent: { label: "Got it right (%)", color: "var(--chart-2)" },
} satisfies ChartConfig;

function Charts({ data }: { data: GetQuizResultsOutput }) {
	const myScore = data.me?.score;
	return (
		<section className="grid gap-4 md:grid-cols-2" aria-label="Quiz statistics">
			<div className="flex flex-col gap-2 border border-border p-4">
				<h3 className="font-medium text-sm">How readers scored</h3>
				<ChartContainer config={distributionConfig} className="h-44 w-full">
					<BarChart data={data.distribution} margin={{ left: -20 }}>
						<CartesianGrid vertical={false} />
						<XAxis dataKey="score" tickLine={false} axisLine={false} />
						<YAxis allowDecimals={false} tickLine={false} axisLine={false} />
						<ChartTooltip content={<ChartTooltipContent />} />
						<Bar dataKey="count" fill="var(--color-count)">
							{data.distribution.map((entry) => (
								<Cell
									key={entry.score}
									fillOpacity={entry.score === myScore ? 1 : 0.45}
								/>
							))}
						</Bar>
					</BarChart>
				</ChartContainer>
				<p className="text-muted-foreground text-xs">
					Your score is the solid bar.
				</p>
			</div>
			<div className="flex flex-col gap-2 border border-border p-4">
				<h3 className="font-medium text-sm">How hard each question was</h3>
				<ChartContainer config={difficultyConfig} className="h-44 w-full">
					<BarChart
						data={data.questionStats.map((row) => ({
							...row,
							label: `Q${row.position}`,
						}))}
						margin={{ left: -20 }}
					>
						<CartesianGrid vertical={false} />
						<XAxis dataKey="label" tickLine={false} axisLine={false} />
						<YAxis
							domain={[0, 100]}
							tickLine={false}
							axisLine={false}
							unit="%"
						/>
						<ChartTooltip content={<ChartTooltipContent />} />
						<Bar dataKey="correctPercent" fill="var(--color-correctPercent)" />
					</BarChart>
				</ChartContainer>
				<p className="text-muted-foreground text-xs">
					Share of readers who answered each question correctly.
				</p>
			</div>
		</section>
	);
}

export function QuizResultsView({ slug }: { slug: string }) {
	const query = useQuery(
		orpc.quiz.getResults.queryOptions({ input: { slug } }),
	);
	const [reporting, setReporting] = useState<number | null>(null);

	if (query.isPending) {
		return (
			<div className="flex flex-col gap-4">
				<Skeleton className="h-40 w-full" />
				<Skeleton className="h-72 w-full" />
			</div>
		);
	}

	if (query.isError) {
		return (
			<p className="text-destructive text-sm">
				Could not load the results. {query.error.message}
			</p>
		);
	}

	const data = query.data;
	const coverSrc = bookCoverUrl(data.book.coverId, "M");

	return (
		<div className="flex flex-col gap-6">
			<header className="flex flex-col gap-4 border border-border p-4 sm:flex-row sm:items-center sm:p-5">
				<div className="flex min-w-0 flex-1 items-center gap-3">
					<div className="relative aspect-2/3 w-12 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
						{coverSrc ? (
							<Image
								src={coverSrc}
								alt=""
								fill
								className="object-cover"
								sizes="48px"
							/>
						) : null}
					</div>
					<div className="min-w-0">
						<p className="text-muted-foreground text-xs">Quiz results</p>
						<h1 className="truncate font-semibold text-lg tracking-tight sm:text-xl">
							<Link
								href={`/books/${data.book.slug}` as Route}
								className="hover:underline"
							>
								{data.book.title}
							</Link>
						</h1>
						<p className="truncate text-muted-foreground text-xs">
							{formatBookAuthors(data.book.authors)}
						</p>
					</div>
				</div>
				{data.status === "submitted" && data.me ? (
					<div className="flex items-center gap-5">
						<div className="flex flex-col items-end">
							<QuizScore score={data.me.score} className="text-3xl" />
							<span className="text-muted-foreground text-xs tabular-nums">
								out of {data.maxScore} (low {data.minScore})
							</span>
						</div>
						<div className="flex flex-col gap-1 border-border border-l pl-5 text-sm">
							<span>
								Rank <strong className="tabular-nums">#{data.me.rank}</strong>{" "}
								of <span className="tabular-nums">{data.participantCount}</span>
							</span>
							{data.me.beatPercent != null ? (
								<span className="text-muted-foreground text-xs">
									Better than {data.me.beatPercent}% of readers
								</span>
							) : null}
							<QuizCounts
								correct={data.me.correct}
								incorrect={data.me.incorrect}
								skipped={data.me.skipped}
							/>
						</div>
					</div>
				) : null}
			</header>

			{data.status === "forfeited" ? (
				<div className="border border-border border-dashed p-4 text-sm">
					<p className="font-medium">Did not finish</p>
					<p className="text-muted-foreground">
						This quiz wasn't submitted in time, so your one attempt is used up.
						You can still see how everyone else did below.
					</p>
				</div>
			) : (
				<section className="flex flex-col gap-3">
					<h2 className="font-semibold text-base">Your answers</h2>
					<QuizReviewList questions={data.questions} onReport={setReporting} />
				</section>
			)}

			<section className="flex flex-col gap-3">
				<div className="flex items-center justify-between gap-3">
					<h2 className="font-semibold text-base">Leaderboard</h2>
					<Link
						href={`/books/${data.book.slug}/quizzes` as Route}
						className="text-muted-foreground text-sm underline-offset-2 hover:text-foreground hover:underline"
					>
						See everyone
					</Link>
				</div>
				<ul className="flex flex-col divide-y divide-border border border-border">
					{[...data.leaderboard, ...(data.myRow ? [data.myRow] : [])].map(
						(row, index) => (
							<li
								key={row.user.username}
								className={cn(
									"flex items-center gap-3 px-3 py-2.5 sm:px-4",
									row.isMe && "bg-primary/5",
									data.myRow && index === data.leaderboard.length
										? "border-border border-t-2 border-dashed"
										: null,
								)}
							>
								<QuizRank rank={row.rank} />
								<Link
									href={`/users/${row.user.username}` as Route}
									className="min-w-0 flex-1 hover:underline"
								>
									<UserPanel
										user={row.user}
										renderDescription={
											row.isMe ? "You" : (user) => `@${user.username}`
										}
									/>
								</Link>
								<QuizCounts
									className="hidden sm:inline-flex"
									correct={row.correct}
									incorrect={row.incorrect}
									skipped={row.skipped}
								/>
								<QuizScore score={row.score} />
							</li>
						),
					)}
				</ul>
			</section>

			<Charts data={data} />

			<ReportDialog
				slug={slug}
				position={reporting}
				onClose={() => setReporting(null)}
			/>
		</div>
	);
}
