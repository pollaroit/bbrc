"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import { Input } from "@bbrc/ui/components/input";
import { Label } from "@bbrc/ui/components/label";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { Progress } from "@bbrc/ui/components/progress";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Pause, Play, Search, Square } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminAuthorsFixCountries } from "@/components/blocks/author/admin/admin-authors-fix-countries";
import { invalidateAuthorQueries } from "@/components/blocks/author/admin/author-actions-panel";
import { formatElapsed, useRunUntilDone } from "@/lib/use-run-until-done";
import { client, orpc } from "@/utils/orpc";

const dateFormat = new Intl.DateTimeFormat("en", {
	dateStyle: "medium",
	timeStyle: "short",
});

function Stat({ label, value }: { label: string; value: string | number }) {
	return (
		<div className="flex flex-col gap-0.5">
			<dt className="text-muted-foreground text-xs">{label}</dt>
			<dd className="font-semibold text-lg tabular-nums">{value}</dd>
		</div>
	);
}

/** Empty or 0 means "no limit". */
function parseLimit(value: string): number | undefined {
	const parsed = Number.parseInt(value, 10);
	return Number.isNaN(parsed) || parsed < 1 ? undefined : parsed;
}

type RunResult = Awaited<ReturnType<typeof client.authorBackfill.run>>;

type Totals = {
	processed: number;
	created: number;
	matched: number;
	booksLinked: number;
	aiRequests: number;
	lookAlikes: number;
	errors: string[];
	authorsRemaining: number | null;
	booksRemaining: number | null;
};

const EMPTY_TOTALS: Totals = {
	processed: 0,
	created: 0,
	matched: 0,
	booksLinked: 0,
	aiRequests: 0,
	lookAlikes: 0,
	errors: [],
	authorsRemaining: null,
	booksRemaining: null,
};

function addResult(totals: Totals, result: RunResult): Totals {
	return {
		processed: totals.processed + result.processedAuthors,
		created: totals.created + result.createdAuthors,
		matched:
			totals.matched + result.linkedToExistingAuthors + result.mergedByIdentity,
		booksLinked: totals.booksLinked + result.booksLinked,
		aiRequests: totals.aiRequests + result.aiRequests,
		lookAlikes: totals.lookAlikes + result.lookAlikeAuthors,
		errors: [...new Set([...totals.errors, ...result.errors])].slice(-50),
		authorsRemaining: result.authorsRemaining,
		booksRemaining: result.booksRemaining,
	};
}

export function AdminAuthorsBackfill() {
	const [dailyCap, setDailyCap] = useState("");
	const [batch, setBatch] = useState("");
	const [probe, setProbe] = useState(false);
	const [totals, setTotals] = useState<Totals>(EMPTY_TOTALS);
	// 0 tells the server there is no daily limit.
	const cap = parseLimit(dailyCap) ?? 0;
	const perRun = parseLimit(batch);

	const status = useQuery(
		orpc.authorBackfill.status.queryOptions({ input: { dailyCap: cap } }),
	);

	const plan = useMutation({
		mutationFn: () =>
			client.authorBackfill.plan({ dailyCap: cap, limit: perRun, probe }),
		onError: (error) =>
			toast.error(error.message || "Could not prepare the report."),
	});

	const loop = useRunUntilDone<RunResult>({
		step: () => client.authorBackfill.run({ dailyCap: cap, limit: perRun }),
		isDone: (result) => result.done,
		madeProgress: (result) =>
			result.processedAuthors > 0 || result.booksLinked > 0,
		onResult: (result) => setTotals((current) => addResult(current, result)),
		onSettled: () => {
			invalidateAuthorQueries();
			void status.refetch();
		},
	});

	const retry = useMutation({
		mutationFn: () => client.authorBackfill.retryFailed({}),
		onSuccess: (result) => {
			invalidateAuthorQueries();
			toast.success(
				`Retried ${result.retried} lookups; ${result.stillFailed} still failing.`,
			);
		},
		onError: (error) =>
			toast.error(error.message || "Could not retry the lookups."),
	});

	const data = status.data;
	const report = plan.data;
	const finished = data != null && data.booksUnlinked === 0;
	const running = loop.state === "running" || loop.state === "stopping";
	const hasRun = loop.steps > 0 || loop.state !== "idle";
	const total =
		totals.authorsRemaining == null
			? 0
			: totals.processed + totals.authorsRemaining;
	const percent =
		loop.state === "done"
			? 100
			: total > 0
				? Math.min(99, Math.round((totals.processed / total) * 100))
				: 0;

	return (
		<div className="flex max-w-3xl flex-col gap-6">
			<p className="text-muted-foreground text-sm">
				The backfill turns the author names on existing books into author
				records. Press the button once and it keeps going by itself until every
				book is linked. You can stop it at any time and it is safe to run again:
				authors already created are never duplicated.
			</p>

			<Card size="sm">
				<CardHeader>
					<CardTitle>Where it stands</CardTitle>
					<CardDescription>
						{data?.lastRunAt
							? `Last run ${dateFormat.format(new Date(data.lastRunAt))}`
							: "Not run yet"}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{status.isPending ? (
						<Skeleton className="h-20 w-full" aria-hidden />
					) : data ? (
						<dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
							<Stat
								label="Books linked"
								value={`${data.booksLinked} / ${data.booksTotal}`}
							/>
							<Stat label="Books to go" value={data.booksUnlinked} />
							<Stat label="Authors" value={data.authorsTotal} />
							<Stat label="Done today" value={data.processedToday} />
							<Stat label="Lookups waiting" value={data.authorsPending} />
							<Stat label="Lookups failed" value={data.authorsFailed} />
							<Stat
								label="Filled in automatically"
								value={data.authorsAutoFilled}
							/>
							<Stat label="Need review" value={data.authorsNeedingReview} />
						</dl>
					) : (
						<p className="text-muted-foreground text-sm">
							Could not load the status.
						</p>
					)}
				</CardContent>
			</Card>

			<Card size="sm">
				<CardHeader>
					<CardTitle>1. Check first (nothing is changed)</CardTitle>
					<CardDescription>
						See how many authors, look-alikes and AI requests it would take.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="inline-flex items-center gap-2 text-sm">
						<Checkbox
							id="backfill-probe"
							checked={probe}
							onCheckedChange={(checked) => setProbe(checked === true)}
						/>
						<Label htmlFor="backfill-probe" className="font-normal">
							Also sample a few authors to estimate how many need the AI
							(slower)
						</Label>
					</div>
					<div>
						<LoadingButton
							type="button"
							variant="outline"
							loading={plan.isPending}
							onClick={() => plan.mutate()}
						>
							<Search data-icon="inline-start" />
							Check what would happen
						</LoadingButton>
					</div>
					{report ? (
						<dl className="grid grid-cols-2 gap-4 border border-border bg-muted/20 p-3 sm:grid-cols-3">
							<Stat
								label="Books without authors"
								value={`${report.booksUnlinked} of ${report.booksTotal}`}
							/>
							<Stat label="Authors to create" value={report.authorsToCreate} />
							<Stat label="Already known" value={report.authorsAlreadyKnown} />
							<Stat label="Look-alike pairs" value={report.lookAlikePairs} />
							<Stat
								label="Need the AI"
								value={
									report.estimatedNeedAi != null
										? `about ${report.estimatedNeedAi}`
										: `up to ${report.maxNeedAi}`
								}
							/>
							<Stat
								label="AI requests (at most)"
								value={report.maxAiRequests}
							/>
						</dl>
					) : null}
				</CardContent>
			</Card>

			<Card size="sm">
				<CardHeader>
					<CardTitle>2. Backfill everything</CardTitle>
					<CardDescription>
						Runs batch after batch on its own. Keep this page open while it
						works.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex flex-wrap gap-2">
						{running ? (
							<Button
								type="button"
								variant="outline"
								disabled={loop.state === "stopping"}
								onClick={loop.stop}
							>
								<Square data-icon="inline-start" />
								{loop.state === "stopping"
									? "Stopping after this batch…"
									: "Stop"}
							</Button>
						) : (
							<Button
								type="button"
								disabled={finished && loop.state !== "paused"}
								onClick={() => {
									if (loop.state !== "paused") setTotals(EMPTY_TOTALS);
									loop.start();
								}}
							>
								{loop.state === "paused" ? (
									<Pause data-icon="inline-start" />
								) : (
									<Play data-icon="inline-start" />
								)}
								{finished && loop.state !== "paused"
									? "All books linked"
									: loop.state === "paused"
										? "Resume"
										: "Backfill everything"}
							</Button>
						)}
						{data && data.authorsFailed > 0 ? (
							<LoadingButton
								type="button"
								variant="outline"
								loading={retry.isPending}
								disabled={running}
								onClick={() => retry.mutate()}
							>
								Retry failed lookups
							</LoadingButton>
						) : null}
					</div>

					{hasRun ? (
						<div className="flex flex-col gap-3" aria-live="polite">
							<Progress value={percent} aria-label="Backfill progress">
								<span className="text-sm">
									{loop.state === "done"
										? "Every book is linked."
										: loop.state === "paused"
											? "Paused"
											: loop.state === "idle"
												? "Stopped"
												: "Working…"}
								</span>
								<span className="ms-auto text-muted-foreground text-sm tabular-nums">
									{totals.processed} authors done
									{totals.authorsRemaining != null
										? `, ${totals.authorsRemaining} to go`
										: ""}{" "}
									· {formatElapsed(loop.elapsedSeconds)}
								</span>
							</Progress>
							{loop.pauseReason ? (
								<p className="text-destructive text-sm">{loop.pauseReason}</p>
							) : null}
							<dl className="grid grid-cols-2 gap-4 border border-border bg-muted/20 p-3 sm:grid-cols-3">
								<Stat label="Authors processed" value={totals.processed} />
								<Stat label="Created" value={totals.created} />
								<Stat label="Matched an author we had" value={totals.matched} />
								<Stat label="Books linked" value={totals.booksLinked} />
								<Stat label="AI requests" value={totals.aiRequests} />
								<Stat label="Look-alikes found" value={totals.lookAlikes} />
								{totals.booksRemaining != null ? (
									<Stat
										label="Books still to link"
										value={totals.booksRemaining}
									/>
								) : null}
								<Stat label="Batches" value={loop.steps} />
							</dl>
							{totals.errors.length > 0 ? (
								<div className="flex flex-col gap-1 text-destructive text-sm">
									<p className="font-medium">
										Some authors could not be processed ({totals.errors.length}
										):
									</p>
									<ul className="max-h-48 list-disc overflow-y-auto ps-5">
										{totals.errors.map((message) => (
											<li key={message}>{message}</li>
										))}
									</ul>
								</div>
							) : null}
						</div>
					) : null}
				</CardContent>
			</Card>

			<AdminAuthorsFixCountries />

			<Card size="sm">
				<CardHeader>
					<CardTitle>Advanced</CardTitle>
					<CardDescription>
						Leave both empty to process everything in as few batches as
						possible. A limit per day keeps the AI use small: only authors the
						free sources cannot describe are sent to it.
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="backfill-cap">Limit per day (0 = no limit)</Label>
						<Input
							id="backfill-cap"
							inputMode="numeric"
							placeholder="No limit"
							value={dailyCap}
							disabled={running}
							onChange={(event) => setDailyCap(event.target.value)}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="backfill-batch">Authors per batch</Label>
						<Input
							id="backfill-batch"
							inputMode="numeric"
							placeholder="Automatic"
							value={batch}
							disabled={running}
							onChange={(event) => setBatch(event.target.value)}
						/>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
