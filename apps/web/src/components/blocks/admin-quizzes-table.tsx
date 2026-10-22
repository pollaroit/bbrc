"use client";

import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@bbrc/ui/components/tooltip";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, RefreshCw, Trash2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { parseAsBoolean, useQueryStates } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";
import { QuizPager } from "@/components/blocks/quiz-pager";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { ListingSearch } from "@/components/listing/listing-search";
import { ListingToggleChip } from "@/components/listing/listing-toggle-chip";
import { formatDateTime } from "@/lib/format-datetime";
import { quizListingSearchParams } from "@/lib/listing/quiz-listing";
import { orpc } from "@/utils/orpc";

const PAGE_SIZE = 20;

const statusLabel = {
	generating: "Generating",
	ready: "Ready",
	unavailable: "Unavailable",
} as const;

export function AdminQuizzesTable() {
	const queryClient = useQueryClient();
	const [params, setParams] = useQueryStates({
		search: quizListingSearchParams.search,
		page: quizListingSearchParams.page,
		reported: parseAsBoolean.withDefault(false),
	});
	const [pendingDelete, setPendingDelete] = useState<{
		id: string;
		title: string;
	} | null>(null);

	const options = orpc.quiz.adminList.queryOptions({
		input: {
			page: params.page,
			limit: PAGE_SIZE,
			search: params.search ?? undefined,
			reportedOnly: params.reported || undefined,
		},
	});
	const query = useQuery({
		...options,
		placeholderData: (previous) => previous,
	});

	async function refresh() {
		await queryClient.invalidateQueries({
			queryKey: orpc.quiz.adminList.key(),
		});
	}

	const deleteMutation = useMutation(
		orpc.quiz.adminDelete.mutationOptions({
			onSuccess: async () => {
				toast.success("Quiz deleted");
				setPendingDelete(null);
				await refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const clearMutation = useMutation(
		orpc.quiz.adminClearUnavailable.mutationOptions({
			onSuccess: async () => {
				toast.success("Cleared — the next reader can trigger a new attempt");
				await refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);
	const regenerateMutation = useMutation(
		orpc.quiz.adminRegenerate.mutationOptions({
			onSuccess: async () => {
				toast.success("Quiz regenerated");
				await refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3 md:flex-row md:items-center">
				<ListingSearch
					value={params.search ?? ""}
					onChange={(search) => {
						void setParams({ search, page: 1 });
					}}
					placeholder="Search by book title…"
				/>
				<ListingToggleChip
					pressed={params.reported}
					onPressedChange={(reported) => {
						void setParams({ reported, page: 1 });
					}}
					icon={<Flag data-icon="inline-start" />}
				>
					Reported only
				</ListingToggleChip>
			</div>

			{query.isPending ? (
				<Skeleton className="h-64 w-full" />
			) : query.isError ? (
				<p className="text-destructive text-sm">{query.error.message}</p>
			) : query.data.items.length === 0 ? (
				<p className="border border-border border-dashed px-4 py-10 text-center text-muted-foreground text-sm">
					No quizzes yet.
				</p>
			) : (
				<>
					<ul className="flex flex-col divide-y divide-border border border-border">
						{query.data.items.map((row) => {
							const locked = row.submissionCount > 0;
							const busy =
								(deleteMutation.isPending &&
									deleteMutation.variables?.quizId === row.id) ||
								(regenerateMutation.isPending &&
									regenerateMutation.variables?.quizId === row.id) ||
								(clearMutation.isPending &&
									clearMutation.variables?.quizId === row.id);
							const lockedTip =
								"Readers already have attempts on this quiz, so it can't be deleted or regenerated.";

							return (
								<li key={row.id} className="flex flex-col gap-3 p-4">
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div className="min-w-0">
											<Link
												href={`/books/${row.book.slug}` as Route}
												className="font-medium text-sm hover:underline"
											>
												{row.book.title}
											</Link>
											<p className="text-muted-foreground text-xs">
												{statusLabel[row.status]}
												{row.generatedBy
													? ` · by @${row.generatedBy.username}`
													: ""}
												{` · ${formatDateTime(row.createdAt)}`}
												{row.model ? ` · ${row.model}` : ""}
											</p>
											<p className="text-muted-foreground text-xs tabular-nums">
												{row.submissionCount} attempts · {row.reportCount}{" "}
												reports
												{row.status === "unavailable" && row.unavailableUntil
													? ` · retry after ${formatDateTime(row.unavailableUntil)}`
													: ""}
											</p>
										</div>
										<div className="flex flex-wrap items-center gap-2">
											{row.status === "unavailable" ? (
												<Button
													type="button"
													variant="outline"
													size="sm"
													disabled={busy}
													onClick={() =>
														clearMutation.mutate({ quizId: row.id })
													}
												>
													Clear unavailable
												</Button>
											) : null}
											{row.status === "ready" ? (
												<>
													<ActionWithTip
														disabled={locked || busy}
														tip={locked ? lockedTip : null}
													>
														<Button
															type="button"
															variant="outline"
															size="sm"
															disabled={locked || busy}
															onClick={() =>
																regenerateMutation.mutate({ quizId: row.id })
															}
														>
															<RefreshCw data-icon="inline-start" />
															Regenerate
														</Button>
													</ActionWithTip>
													<ActionWithTip
														disabled={locked || busy}
														tip={locked ? lockedTip : null}
													>
														<Button
															type="button"
															variant="outline"
															size="sm"
															disabled={locked || busy}
															onClick={() =>
																setPendingDelete({
																	id: row.id,
																	title: row.book.title,
																})
															}
														>
															<Trash2 data-icon="inline-start" />
															Delete
														</Button>
													</ActionWithTip>
												</>
											) : null}
										</div>
									</div>
									{row.reportedQuestions.length > 0 ? (
										<ul className="flex flex-col gap-2 border border-border border-dashed p-3">
											{row.reportedQuestions.map((item) => (
												<li key={item.position} className="text-xs">
													<div className="flex items-center gap-2">
														<Badge variant="outline">
															Q{item.position} · {item.count}{" "}
															{item.count === 1 ? "report" : "reports"}
														</Badge>
													</div>
													<p className="mt-1 text-muted-foreground">
														{item.question}
													</p>
													{item.reasons.length > 0 ? (
														<ul className="mt-1 list-disc pl-5">
															{item.reasons.map((reason) => (
																<li key={reason}>{reason}</li>
															))}
														</ul>
													) : null}
												</li>
											))}
										</ul>
									) : null}
								</li>
							);
						})}
					</ul>
					<QuizPager
						page={query.data.metadata.page}
						totalPages={query.data.metadata.totalPages}
						total={query.data.metadata.total}
						onPageChange={(page) => {
							void setParams({ page });
						}}
					/>
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
							Delete the quiz for <strong>{pendingDelete.title}</strong>? The
							next reader to open it will generate a new one, which counts
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

function ActionWithTip({
	tip,
	disabled,
	children,
}: {
	tip: string | null;
	disabled: boolean;
	children: React.ReactElement;
}) {
	if (!tip || !disabled) {
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
