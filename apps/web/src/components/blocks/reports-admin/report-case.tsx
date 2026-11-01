"use client";

import type { ReportGroup } from "@bbrc/api/modules/report/report.schema";
import {
	canApplyReportAction,
	REPORT_ACTION_LABELS,
	REPORT_ADMIN_NOTE_MAX,
	REPORT_REASON_LABELS,
	REPORT_TARGET_LABELS,
	type ReportActionKind,
	reportActionsFor,
} from "@bbrc/shared";
import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import { Field, FieldDescription, FieldLabel } from "@bbrc/ui/components/field";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { Textarea } from "@bbrc/ui/components/textarea";
import { useMutation } from "@tanstack/react-query";
import { Check, ExternalLink, RotateCcw, Trash2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { type ReactNode, useId, useState } from "react";
import { toast } from "sonner";
import { RelativeTime } from "@/components/blocks/relative-time";
import { UserPanel } from "@/components/blocks/user-panel";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";
import { ReportKindIcon } from "./report-kind";

/** A reporter with at least this many closed reports, most of them dismissed, is flagged for the admin. */
const FLAG_MIN_CLOSED = 3;
const FLAG_DISMISSED_SHARE = 0.7;

type Confirmable = "delete_content";

function plural(count: number, one: string, many = `${one}s`) {
	return `${count} ${count === 1 ? one : many}`;
}

function Section({
	title,
	children,
	className,
}: {
	title: string;
	children: ReactNode;
	className?: string;
}) {
	return (
		<section className={cn("flex flex-col gap-3", className)}>
			<h3 className="font-semibold text-sm">{title}</h3>
			{children}
		</section>
	);
}

/** Everything about one reported item, and what the admin can do about it. */
export function ReportCase({ group }: { group: ReportGroup }) {
	const [note, setNote] = useState("");
	const [confirming, setConfirming] = useState<Confirmable | null>(null);
	const [showHistory, setShowHistory] = useState(false);
	const noteId = useId();

	const act = useMutation(
		orpc.report.act.mutationOptions({
			onSuccess: (result, variables) => {
				const label = REPORT_ACTION_LABELS[variables.action];
				toast.success(
					variables.action === "note"
						? "Note saved."
						: result.notified > 0
							? `${label}. ${plural(result.notified, "reporter")} told.`
							: `${label}.`,
				);
				setNote("");
				setConfirming(null);
				void queryClient.invalidateQueries({ queryKey: orpc.report.key() });
			},
			onError: (error) => {
				setConfirming(null);
				toast.error(error.message ?? "Could not save.");
			},
		}),
	);

	const owner = group.owner;
	const ownerName = owner?.name ?? "The owner";
	const what = REPORT_TARGET_LABELS[group.target].toLowerCase();
	const isOpen = group.status === "open";
	const available = reportActionsFor(group.target);
	const can = (action: ReportActionKind) =>
		available.includes(action) && canApplyReportAction(group.status, action);

	function run(action: ReportActionKind) {
		act.mutate({
			target: group.target,
			targetId: group.targetId,
			action,
			note: note.trim() || undefined,
		});
	}

	const busy = (action: ReportActionKind) =>
		act.isPending && act.variables?.action === action;

	const breakdown = group.reasons
		.map((r) => `${r.count} ${REPORT_REASON_LABELS[r.reason].toLowerCase()}`)
		.join(", ");

	return (
		<article className="flex flex-col divide-y divide-border border border-border bg-card">
			<header className="flex flex-col gap-2 p-5">
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant="outline" className="gap-1">
						<ReportKindIcon kind={group.target} className="size-3" />
						{REPORT_TARGET_LABELS[group.target]}
					</Badge>
					{isOpen ? (
						<Badge
							variant="outline"
							className="border-warning/30 bg-warning/10 text-warning-ink"
						>
							Open
						</Badge>
					) : (
						<Badge variant="outline" className="text-muted-foreground">
							{group.status === "resolved" ? "Resolved" : "Dismissed"}
						</Badge>
					)}
					{!group.live ? (
						<Badge variant="outline" className="text-muted-foreground">
							Deleted
						</Badge>
					) : null}
				</div>
				<h2 className="font-semibold text-lg leading-snug">
					{group.href && group.live ? (
						<Link
							href={group.href as Route}
							target="_blank"
							className="inline-flex items-start gap-1.5 hover:underline"
						>
							{group.title ?? "Open"}
							<ExternalLink
								className="mt-1.5 size-3.5 shrink-0 text-muted-foreground"
								aria-label="Opens in a new tab"
							/>
						</Link>
					) : (
						(group.title ?? "Removed content")
					)}
				</h2>
				<p className="text-muted-foreground text-sm">
					{plural(group.count, "member")} reported this: {breakdown}. Latest{" "}
					<RelativeTime date={group.latestAt} />.
				</p>
			</header>

			<div className="flex flex-col gap-6 p-5">
				{group.text ? (
					<blockquote className="border-border border-l-2 bg-muted/40 px-4 py-3 text-sm leading-relaxed">
						{group.text}
						{!group.live ? (
							<footer className="mt-2 text-muted-foreground text-xs">
								It was deleted. This is the copy saved when it was reported.
							</footer>
						) : null}
					</blockquote>
				) : null}

				{owner ? (
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="flex min-w-0 items-center gap-3">
							<UserPanel user={owner} className="min-w-0" />
						</div>
						<p className="text-muted-foreground text-sm">
							{plural(owner.reportsAgainst, "report")} against them in total
						</p>
					</div>
				) : (
					<p className="text-muted-foreground text-sm">
						The owner's account no longer exists.
					</p>
				)}

				<Section title="Who reported it">
					<ul className="flex flex-col divide-y divide-border border border-border">
						{group.reports.map((report) => {
							const flagged =
								report.reporterTrack.closed >= FLAG_MIN_CLOSED &&
								(report.reporterTrack.dismissedShare ?? 0) >=
									FLAG_DISMISSED_SHARE;
							return (
								<li key={report.id} className="flex flex-col gap-1.5 p-3">
									<div className="flex flex-wrap items-center justify-between gap-2">
										<div className="flex flex-wrap items-center gap-2 text-sm">
											<span className="font-medium">
												{report.reporter
													? report.reporter.name
													: "A deleted member"}
											</span>
											{report.reporter ? (
												<span className="text-muted-foreground">
													@{report.reporter.username}
												</span>
											) : null}
											<Badge variant="secondary">
												{REPORT_REASON_LABELS[report.reason]}
											</Badge>
										</div>
										<span className="text-muted-foreground text-xs">
											<RelativeTime date={report.createdAt} />
										</span>
									</div>
									{report.note ? (
										<p className="text-sm leading-relaxed">“{report.note}”</p>
									) : null}
									<p
										className={cn(
											"text-xs",
											flagged
												? "font-medium text-warning-ink"
												: "text-muted-foreground",
										)}
									>
										{flagged
											? `Often dismissed: ${report.reporterTrack.label}`
											: report.reporterTrack.closed === 0
												? "Their first report"
												: `Earlier reports: ${report.reporterTrack.label}`}
									</p>
								</li>
							);
						})}
					</ul>
				</Section>

				<Section title={isOpen ? "Your decision" : "This report is closed"}>
					<Field>
						<FieldLabel htmlFor={noteId}>Note</FieldLabel>
						<Textarea
							id={noteId}
							value={note}
							rows={2}
							maxLength={REPORT_ADMIN_NOTE_MAX}
							onChange={(event) => setNote(event.target.value)}
						/>
						<FieldDescription>
							Saved in the history. {ownerName} sees it when you delete their{" "}
							{what}.
						</FieldDescription>
					</Field>

					<ul className="flex flex-col divide-y divide-border border border-border">
						{can("dismiss") ? (
							<DecisionRow
								title="Dismiss"
								consequence={`Nothing happens to the ${what} or to ${ownerName}. Reporters are told we looked.`}
								action={
									<LoadingButton
										variant="outline"
										size="sm"
										loading={busy("dismiss")}
										disabled={act.isPending}
										onClick={() => run("dismiss")}
									>
										<Check data-icon="inline-start" aria-hidden />
										Dismiss
									</LoadingButton>
								}
							/>
						) : null}
						{can("delete_content") && group.live ? (
							<DecisionRow
								title={`Delete the ${what}`}
								consequence={`Removed for good, with its comments and likes. ${ownerName} gets a notice.`}
								action={
									<Button
										variant="outline"
										size="sm"
										disabled={act.isPending}
										onClick={() => setConfirming("delete_content")}
									>
										<Trash2 data-icon="inline-start" aria-hidden />
										Delete
									</Button>
								}
							/>
						) : null}
						{can("reopen") ? (
							<DecisionRow
								title="Reopen"
								consequence="Back to the open queue. Reporters are not told a second time."
								action={
									<LoadingButton
										variant="outline"
										size="sm"
										loading={busy("reopen")}
										disabled={act.isPending}
										onClick={() => run("reopen")}
									>
										<RotateCcw data-icon="inline-start" aria-hidden />
										Reopen
									</LoadingButton>
								}
							/>
						) : null}
					</ul>

					{note.trim() ? (
						<LoadingButton
							variant="ghost"
							size="sm"
							className="w-fit"
							loading={busy("note")}
							disabled={act.isPending}
							onClick={() => run("note")}
						>
							Save the note without deciding
						</LoadingButton>
					) : null}
				</Section>

				{group.actions.length > 0 ? (
					<section className="flex flex-col gap-3">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="w-fit px-0 text-muted-foreground"
							aria-expanded={showHistory}
							onClick={() => setShowHistory((value) => !value)}
						>
							{showHistory ? "Hide" : "Show"} history ({group.actions.length})
						</Button>
						{showHistory ? (
							<ol className="flex flex-col gap-3 border-border border-l pl-4 text-sm">
								{group.actions.map((entry) => (
									<li key={entry.id} className="flex flex-col gap-0.5">
										<span>
											<span className="font-medium">
												{REPORT_ACTION_LABELS[entry.action]}
											</span>{" "}
											by {entry.admin ? entry.admin.name : "a removed admin"}{" "}
											<RelativeTime
												date={entry.createdAt}
												className="text-muted-foreground"
											/>
										</span>
										{entry.note ? (
											<span className="text-muted-foreground">
												{entry.note}
											</span>
										) : null}
									</li>
								))}
							</ol>
						) : null}
					</section>
				) : null}
			</div>

			<DestructiveConfirmDialog
				open={confirming !== null}
				onOpenChange={(open) => {
					if (!open) setConfirming(null);
				}}
				title={`Delete this ${what}?`}
				description="It is removed for good, with its comments and likes. The owner is told. This cannot be undone."
				confirmLabel="Delete"
				loading={act.isPending}
				onConfirm={() => confirming && run(confirming)}
			/>
		</article>
	);
}

/** One choice, with what it does to whom written next to the button. */
function DecisionRow({
	title,
	consequence,
	action,
}: {
	title: string;
	consequence: string;
	action: ReactNode;
}) {
	return (
		<li className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex min-w-0 flex-col gap-0.5">
				<span className="font-medium text-sm">{title}</span>
				<span className="text-muted-foreground text-xs leading-relaxed">
					{consequence}
				</span>
			</div>
			<div className="shrink-0">{action}</div>
		</li>
	);
}
