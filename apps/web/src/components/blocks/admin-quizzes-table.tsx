"use client";

import type { ListAdminQuizzesOutput } from "@bbrc/api/modules/admin/admin-quiz.schema";
import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@bbrc/ui/components/table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@bbrc/ui/components/tooltip";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Trash2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
	ADMIN_TABLE_MOBILE_MIN_WIDTH,
	AdminListTableScroll,
} from "@/components/blocks/admin-list-table-scroll";
import { AdminQuizzesToolbar } from "@/components/blocks/admin-quizzes-toolbar";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { formatDateTime } from "@/lib/format-datetime";
import {
	adminQuizStatusLabels,
	toAdminQuizzesListCallInput,
	useAdminQuizzesListingSearchParams,
} from "@/lib/listing/admin-quizzes-listing";
import { orpc } from "@/utils/orpc";

type Row = ListAdminQuizzesOutput["items"][number];

const LOCKED_TIP =
	"Readers already have attempts on this quiz, so it can't be deleted or regenerated.";

function ActionButton({
	locked,
	tip,
	children,
}: {
	locked: boolean;
	tip: string;
	children: React.ReactElement;
}) {
	if (!locked) {
		return children;
	}
	return (
		<Tooltip>
			<TooltipTrigger render={<span className="inline-flex" />}>
				{children}
			</TooltipTrigger>
			<TooltipContent>{tip}</TooltipContent>
		</Tooltip>
	);
}

export function AdminQuizzesTable() {
	const queryClient = useQueryClient();
	const [params, setParams] = useAdminQuizzesListingSearchParams();
	const listInput = toAdminQuizzesListCallInput(params);
	const [pendingDelete, setPendingDelete] = useState<Row | null>(null);

	const { data, isPending, isError, error, refetch } = useQuery(
		orpc.admin.listQuizzes.queryOptions({ input: listInput }),
	);

	async function refresh() {
		await queryClient.invalidateQueries({
			queryKey: orpc.admin.listQuizzes.key(),
		});
		await queryClient.invalidateQueries({
			queryKey: orpc.admin.getQuizOverview.key(),
		});
		await queryClient.invalidateQueries({
			queryKey: orpc.admin.getQuizStats.key(),
		});
	}

	const deleteMutation = useMutation(
		orpc.quiz.adminDelete.mutationOptions({
			onSuccess: async () => {
				toast.success("Quiz deleted");
				setPendingDelete(null);
				await refresh();
			},
			onError: (err) => toast.error(err.message),
		}),
	);
	const clearMutation = useMutation(
		orpc.quiz.adminClearUnavailable.mutationOptions({
			onSuccess: async () => {
				toast.success("Cleared. The next reader can trigger a new attempt.");
				await refresh();
			},
			onError: (err) => toast.error(err.message),
		}),
	);
	const regenerateMutation = useMutation(
		orpc.quiz.adminRegenerate.mutationOptions({
			onSuccess: async () => {
				toast.success("Quiz regenerated");
				await refresh();
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	const footer = data ? (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<p className="text-muted-foreground text-sm tabular-nums">
				{data.metadata.total} quizzes · Page {data.metadata.page} of{" "}
				{Math.max(data.metadata.totalPages, 1)}
			</p>
			<div className="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={data.metadata.prevPage == null}
					onClick={() => {
						if (data.metadata.prevPage != null) {
							void setParams({ page: data.metadata.prevPage });
						}
					}}
				>
					Previous
				</Button>
				<Button
					variant="outline"
					size="sm"
					disabled={data.metadata.nextPage == null}
					onClick={() => {
						if (data.metadata.nextPage != null) {
							void setParams({ page: data.metadata.nextPage });
						}
					}}
				>
					Next
				</Button>
			</div>
		</div>
	) : null;

	return (
		<div className="flex flex-col gap-4">
			<AdminQuizzesToolbar />

			{isPending ? (
				<Skeleton className="h-120 w-full" />
			) : isError ? (
				<div className="flex flex-col items-start gap-3 border border-dashed p-6">
					<p className="text-sm">
						{error?.message ?? "Could not load quizzes."}
					</p>
					<Button variant="outline" size="sm" onClick={() => refetch()}>
						Try again
					</Button>
				</div>
			) : data.items.length === 0 ? (
				<div className="border border-dashed p-8 text-center">
					<p className="font-medium text-sm">No quizzes match these filters</p>
					<p className="mt-1 text-muted-foreground text-sm">
						Try clearing search or filters.
					</p>
				</div>
			) : (
				<>
					<AdminListTableScroll>
						<Table className={ADMIN_TABLE_MOBILE_MIN_WIDTH}>
							<TableHeader>
								<TableRow>
									<TableHead>Book</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="hidden md:table-cell">
										Generated by
									</TableHead>
									<TableHead className="text-right tabular-nums">
										Attempts
									</TableHead>
									<TableHead className="hidden text-right tabular-nums lg:table-cell">
										Avg score
									</TableHead>
									<TableHead className="text-right tabular-nums">
										Reports
									</TableHead>
									<TableHead className="hidden lg:table-cell">
										Generated
									</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.items.map((row) => {
									const locked =
										row.counts.submitted +
											row.counts.forfeited +
											row.counts.inProgress >
										0;
									const busy =
										(deleteMutation.isPending &&
											deleteMutation.variables?.quizId === row.id) ||
										(regenerateMutation.isPending &&
											regenerateMutation.variables?.quizId === row.id) ||
										(clearMutation.isPending &&
											clearMutation.variables?.quizId === row.id);

									return (
										<TableRow key={row.id} className="align-top">
											<TableCell>
												<div className="flex min-w-0 flex-col gap-0.5">
													<Link
														href={`/books/${row.book.slug}` as Route}
														className="line-clamp-2 font-medium text-sm hover:underline"
													>
														{row.book.title}
													</Link>
													<p className="line-clamp-1 text-muted-foreground text-xs">
														{row.book.authors.join(", ")}
													</p>
													{row.reportedQuestions.length > 0 ? (
														<details className="mt-1 text-xs">
															<summary className="cursor-pointer text-destructive">
																Reported questions
															</summary>
															<ul className="mt-1 flex flex-col gap-2">
																{row.reportedQuestions.map((item) => (
																	<li key={item.position}>
																		<Badge variant="outline">
																			Q{item.position} · {item.count}
																		</Badge>
																		<p className="mt-0.5 text-muted-foreground">
																			{item.question}
																		</p>
																		{item.reasons.length > 0 ? (
																			<ul className="list-disc pl-4">
																				{item.reasons.map((reason) => (
																					<li key={reason}>{reason}</li>
																				))}
																			</ul>
																		) : null}
																	</li>
																))}
															</ul>
														</details>
													) : null}
												</div>
											</TableCell>
											<TableCell>
												<div className="flex flex-col gap-1">
													<Badge variant="secondary">
														{adminQuizStatusLabels[row.status]}
													</Badge>
													{row.status === "unavailable" &&
													row.unavailableUntil ? (
														<span className="text-muted-foreground text-xs">
															Retry after {formatDateTime(row.unavailableUntil)}
														</span>
													) : null}
												</div>
											</TableCell>
											<TableCell className="hidden text-sm md:table-cell">
												{row.generatedBy ? (
													<Link
														href={`/users/${row.generatedBy.username}` as Route}
														className="hover:underline"
													>
														@{row.generatedBy.username}
													</Link>
												) : (
													<span className="text-muted-foreground">—</span>
												)}
												{row.model ? (
													<p className="font-mono text-muted-foreground text-xs">
														{row.model}
													</p>
												) : null}
											</TableCell>
											<TableCell className="text-right tabular-nums">
												<span title="Submitted">{row.counts.submitted}</span>
												{row.counts.forfeited > 0 ||
												row.counts.inProgress > 0 ? (
													<span className="block text-muted-foreground text-xs">
														{row.counts.forfeited} abandoned ·{" "}
														{row.counts.inProgress} open
													</span>
												) : null}
											</TableCell>
											<TableCell className="hidden text-right tabular-nums lg:table-cell">
												{row.averageScore == null
													? "—"
													: row.averageScore.toFixed(1)}
											</TableCell>
											<TableCell className="text-right tabular-nums">
												{row.counts.reports > 0 ? (
													<span className="font-medium text-destructive">
														{row.counts.reports}
													</span>
												) : (
													<span className="text-muted-foreground">0</span>
												)}
											</TableCell>
											<TableCell className="hidden text-muted-foreground text-xs lg:table-cell">
												{formatDateTime(row.createdAt)}
											</TableCell>
											<TableCell>
												<div className="flex flex-wrap justify-end gap-1.5">
													{row.status === "unavailable" ? (
														<Button
															type="button"
															variant="outline"
															size="xs"
															disabled={busy}
															onClick={() =>
																clearMutation.mutate({ quizId: row.id })
															}
														>
															Clear
														</Button>
													) : null}
													{row.status === "ready" ? (
														<>
															<ActionButton locked={locked} tip={LOCKED_TIP}>
																<Button
																	type="button"
																	variant="outline"
																	size="xs"
																	disabled={locked || busy}
																	onClick={() =>
																		regenerateMutation.mutate({
																			quizId: row.id,
																		})
																	}
																>
																	<RefreshCw data-icon="inline-start" />
																	{regenerateMutation.isPending &&
																	regenerateMutation.variables?.quizId ===
																		row.id
																		? "Working…"
																		: "Regenerate"}
																</Button>
															</ActionButton>
															<ActionButton locked={locked} tip={LOCKED_TIP}>
																<Button
																	type="button"
																	variant="outline"
																	size="xs"
																	disabled={locked || busy}
																	onClick={() => setPendingDelete(row)}
																>
																	<Trash2 data-icon="inline-start" />
																	Delete
																</Button>
															</ActionButton>
														</>
													) : null}
												</div>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</AdminListTableScroll>
					{footer}
				</>
			)}

			<DestructiveConfirmDialog
				open={pendingDelete != null}
				onOpenChange={(open) => {
					if (!open) setPendingDelete(null);
				}}
				title="Delete quiz?"
				description={
					pendingDelete ? (
						<>
							Delete the quiz for <strong>{pendingDelete.book.title}</strong>?
							The next reader to open it will generate a new one, which counts
							against their daily first-time quizzes.
						</>
					) : null
				}
				confirmLabel="Delete"
				loading={deleteMutation.isPending}
				onConfirm={() => {
					if (!pendingDelete) return;
					deleteMutation.mutate({ quizId: pendingDelete.id });
				}}
			/>
		</div>
	);
}
