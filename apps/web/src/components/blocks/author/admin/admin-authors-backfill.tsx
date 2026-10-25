"use client";

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
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Play, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { invalidateAuthorQueries } from "@/components/blocks/author/admin/author-actions-panel";
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

function parseCap(value: string): number | undefined {
	const parsed = Number.parseInt(value, 10);
	return Number.isNaN(parsed) || parsed < 1
		? undefined
		: Math.min(parsed, 2000);
}

export function AdminAuthorsBackfill() {
	const [dailyCap, setDailyCap] = useState("100");
	const [batch, setBatch] = useState("25");
	const [probe, setProbe] = useState(false);
	const cap = parseCap(dailyCap);

	const status = useQuery(
		orpc.authorBackfill.status.queryOptions({ input: { dailyCap: cap } }),
	);

	const plan = useMutation({
		mutationFn: () =>
			client.authorBackfill.plan({
				dailyCap: cap,
				limit: parseCap(batch),
				probe,
			}),
		onError: (error) =>
			toast.error(error.message || "Could not prepare the report."),
	});

	const run = useMutation({
		mutationFn: () =>
			client.authorBackfill.run({ dailyCap: cap, limit: parseCap(batch) }),
		onSuccess: (result) => {
			invalidateAuthorQueries();
			toast.success(
				result.processedAuthors === 0
					? result.done
						? "Every book is linked."
						: "Nothing to do today: the daily limit is used up."
					: `Processed ${result.processedAuthors} ${result.processedAuthors === 1 ? "author" : "authors"}, linked ${result.booksLinked} ${result.booksLinked === 1 ? "book" : "books"}.`,
			);
		},
		onError: (error) =>
			toast.error(error.message || "The backfill run failed."),
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
	const result = run.data;
	const report = plan.data;
	const finished = data != null && data.booksUnlinked === 0;

	return (
		<div className="flex max-w-3xl flex-col gap-6">
			<p className="text-muted-foreground text-sm">
				The backfill turns the author names on existing books into author
				records. It works in small batches, can be stopped at any time, and is
				safe to run again and again: authors already created are never
				duplicated.
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
							<Stat
								label="Done today"
								value={`${data.processedToday} / ${data.dailyCap}`}
							/>
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
					<CardTitle>Limits</CardTitle>
					<CardDescription>
						The daily limit keeps the AI use small: only authors the free
						sources cannot describe are sent to it, about 20 at a time.
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="backfill-cap">Authors per day</Label>
						<Input
							id="backfill-cap"
							inputMode="numeric"
							value={dailyCap}
							onChange={(event) => setDailyCap(event.target.value)}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="backfill-batch">Authors per run</Label>
						<Input
							id="backfill-batch"
							inputMode="numeric"
							value={batch}
							onChange={(event) => setBatch(event.target.value)}
						/>
					</div>
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
							<Stat label="Runs needed" value={report.runsNeeded} />
							<Stat label="Days at this limit" value={report.daysNeeded} />
						</dl>
					) : null}
				</CardContent>
			</Card>

			<Card size="sm">
				<CardHeader>
					<CardTitle>2. Run the next batch</CardTitle>
					<CardDescription>
						Run it again until it says every book is linked.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex flex-wrap gap-2">
						<LoadingButton
							type="button"
							loading={run.isPending}
							disabled={finished || (data != null && data.remainingToday === 0)}
							onClick={() => run.mutate()}
						>
							<Play data-icon="inline-start" />
							{finished ? "All books linked" : "Run next batch"}
						</LoadingButton>
						{data && data.authorsFailed > 0 ? (
							<LoadingButton
								type="button"
								variant="outline"
								loading={retry.isPending}
								onClick={() => retry.mutate()}
							>
								Retry failed lookups
							</LoadingButton>
						) : null}
					</div>
					{data && data.remainingToday === 0 && !finished ? (
						<p className="text-muted-foreground text-sm">
							Today's limit is used up. Run again tomorrow, or raise the limit
							above.
						</p>
					) : null}
					{result ? (
						<dl className="grid grid-cols-2 gap-4 border border-border bg-muted/20 p-3 sm:grid-cols-3">
							<Stat label="Authors processed" value={result.processedAuthors} />
							<Stat label="Created" value={result.createdAuthors} />
							<Stat
								label="Matched an author we had"
								value={result.linkedToExistingAuthors + result.mergedByIdentity}
							/>
							<Stat label="Books linked" value={result.booksLinked} />
							<Stat label="AI requests" value={result.aiRequests} />
							<Stat label="Look-alikes found" value={result.lookAlikeAuthors} />
							<Stat label="Books still to link" value={result.booksRemaining} />
							<Stat label="Left today" value={result.remainingToday} />
							<Stat label="Done" value={result.done ? "Yes" : "Not yet"} />
						</dl>
					) : null}
					{result && result.errors.length > 0 ? (
						<div className="flex flex-col gap-1 text-destructive text-sm">
							<p className="font-medium">
								Some authors could not be processed:
							</p>
							<ul className="list-disc ps-5">
								{result.errors.slice(0, 8).map((message) => (
									<li key={message}>{message}</li>
								))}
							</ul>
						</div>
					) : null}
				</CardContent>
			</Card>
		</div>
	);
}
