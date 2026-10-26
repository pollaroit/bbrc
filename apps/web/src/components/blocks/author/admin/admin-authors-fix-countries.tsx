"use client";

import { getBookCountryName } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import { Label } from "@bbrc/ui/components/label";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { Progress } from "@bbrc/ui/components/progress";
import { useMutation } from "@tanstack/react-query";
import { Pause, Play, Search, Square } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { invalidateAuthorQueries } from "@/components/blocks/author/admin/author-actions-panel";
import { formatElapsed, useRunUntilDone } from "@/lib/use-run-until-done";
import { client } from "@/utils/orpc";

type FixResult = Awaited<
	ReturnType<typeof client.authorAdmin.fixNationalities>
>;

type Totals = {
	checked: number;
	changed: number;
	stillEmpty: number;
	lockedSkipped: number;
	aiRequests: number;
	remaining: number | null;
	samples: FixResult["samples"];
};

const EMPTY: Totals = {
	checked: 0,
	changed: 0,
	stillEmpty: 0,
	lockedSkipped: 0,
	aiRequests: 0,
	remaining: null,
	samples: [],
};

function addResult(totals: Totals, result: FixResult): Totals {
	return {
		checked: totals.checked + result.checked,
		changed: totals.changed + result.changed,
		stillEmpty: totals.stillEmpty + result.stillEmpty,
		lockedSkipped: totals.lockedSkipped + result.lockedSkipped,
		aiRequests: totals.aiRequests + result.aiRequests,
		remaining: result.remaining,
		samples: [...totals.samples, ...result.samples].slice(0, 60),
	};
}

function countries(codes: readonly string[]): string {
	return codes.length === 0
		? "none"
		: codes.map((code) => getBookCountryName(code) ?? code).join(", ");
}

function Stat({ label, value }: { label: string; value: string | number }) {
	return (
		<div className="flex flex-col gap-0.5">
			<dt className="text-muted-foreground text-xs">{label}</dt>
			<dd className="font-semibold text-lg tabular-nums">{value}</dd>
		</div>
	);
}

function SampleList({ samples }: { samples: FixResult["samples"] }) {
	if (samples.length === 0) return null;
	return (
		<ul className="flex max-h-72 flex-col divide-y divide-border overflow-y-auto border border-border text-sm">
			{samples.map((sample) => (
				<li
					key={sample.id}
					className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-3 py-2"
				>
					<span className="font-medium">{sample.name}</span>
					<span className="text-muted-foreground">
						{countries(sample.before)} → {countries(sample.after)}
					</span>
				</li>
			))}
		</ul>
	);
}

export function AdminAuthorsFixCountries() {
	const [retryAttempted, setRetryAttempted] = useState(false);
	const [totals, setTotals] = useState<Totals>(EMPTY);

	const preview = useMutation({
		mutationFn: () =>
			client.authorAdmin.fixNationalities({ dryRun: true, retryAttempted }),
		onError: (error) =>
			toast.error(error.message || "Could not check the countries."),
	});

	const loop = useRunUntilDone<FixResult>({
		step: () => client.authorAdmin.fixNationalities({ retryAttempted }),
		isDone: (result) => result.done,
		madeProgress: (result) => result.checked > 0,
		onResult: (result) => setTotals((current) => addResult(current, result)),
		onSettled: () => {
			invalidateAuthorQueries();
			toast.success("Countries updated.");
		},
	});

	const running = loop.state === "running" || loop.state === "stopping";
	const hasRun = loop.steps > 0 || loop.state !== "idle";
	const all = totals.remaining == null ? 0 : totals.checked + totals.remaining;
	const percent =
		loop.state === "done"
			? 100
			: all > 0
				? Math.min(99, Math.round((totals.checked / all) * 100))
				: 0;
	const report = preview.data;

	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle>Fix countries</CardTitle>
				<CardDescription>
					Finds authors with no country, or with a country that no longer exists
					(Russian Empire, USSR, Qing dynasty, Yugoslavia…), and gives them
					today's country, for example Russia or China. Fields an admin locked
					are never touched, and nothing is changed until you press Apply.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="inline-flex items-center gap-2 text-sm">
					<Checkbox
						id="fix-countries-retry"
						checked={retryAttempted}
						disabled={running}
						onCheckedChange={(checked) => setRetryAttempted(checked === true)}
					/>
					<Label htmlFor="fix-countries-retry" className="font-normal">
						Also look again at authors an earlier run could not find a country
						for
					</Label>
				</div>

				<div className="flex flex-wrap gap-2">
					<LoadingButton
						type="button"
						variant="outline"
						loading={preview.isPending}
						disabled={running}
						onClick={() => preview.mutate()}
					>
						<Search data-icon="inline-start" />
						Check what would change
					</LoadingButton>
					{running ? (
						<Button
							type="button"
							variant="outline"
							disabled={loop.state === "stopping"}
							onClick={loop.stop}
						>
							<Square data-icon="inline-start" />
							{loop.state === "stopping" ? "Stopping…" : "Stop"}
						</Button>
					) : (
						<Button
							type="button"
							onClick={() => {
								if (loop.state !== "paused") setTotals(EMPTY);
								loop.start();
							}}
						>
							{loop.state === "paused" ? (
								<Pause data-icon="inline-start" />
							) : (
								<Play data-icon="inline-start" />
							)}
							{loop.state === "paused" ? "Resume" : "Apply to all authors"}
						</Button>
					)}
				</div>

				{report && !hasRun ? (
					<div className="flex flex-col gap-3">
						<dl className="grid grid-cols-2 gap-4 border border-border bg-muted/20 p-3 sm:grid-cols-4">
							<Stat label="Would change" value={report.changed} />
							<Stat label="Checked" value={report.checked} />
							<Stat label="Still to check" value={report.remaining} />
							<Stat label="Locked (skipped)" value={report.lockedSkipped} />
						</dl>
						{report.samples.length > 0 ? (
							<SampleList samples={report.samples} />
						) : (
							<p className="text-muted-foreground text-sm">
								Nothing to change in the authors checked.
							</p>
						)}
						{report.remaining > 0 ? (
							<p className="text-muted-foreground text-xs">
								This check looks at the first batch only. Apply goes through
								every author.
							</p>
						) : null}
					</div>
				) : null}

				{hasRun ? (
					<div className="flex flex-col gap-3" aria-live="polite">
						<Progress value={percent} aria-label="Fix countries progress">
							<span className="text-sm">
								{loop.state === "done"
									? "Done."
									: loop.state === "paused"
										? "Paused"
										: loop.state === "idle"
											? "Stopped"
											: "Working…"}
							</span>
							<span className="ms-auto text-muted-foreground text-sm tabular-nums">
								{totals.checked} checked
								{totals.remaining != null ? `, ${totals.remaining} to go` : ""}{" "}
								· {formatElapsed(loop.elapsedSeconds)}
							</span>
						</Progress>
						{loop.pauseReason ? (
							<p className="text-destructive text-sm">{loop.pauseReason}</p>
						) : null}
						<dl className="grid grid-cols-2 gap-4 border border-border bg-muted/20 p-3 sm:grid-cols-4">
							<Stat label="Changed" value={totals.changed} />
							<Stat label="Still without a country" value={totals.stillEmpty} />
							<Stat label="Locked (skipped)" value={totals.lockedSkipped} />
							<Stat label="AI requests" value={totals.aiRequests} />
						</dl>
						<SampleList samples={totals.samples} />
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}
