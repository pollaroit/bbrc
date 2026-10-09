"use client";

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
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { AdminSittingsToolbar } from "@/components/blocks/admin-sittings-toolbar";
import { BookStatusBadge } from "@/components/blocks/book-status-badge";
import { SittingStatusBadge } from "@/components/blocks/sitting-status-badge";
import {
	toAdminSittingsListCallInput,
	useAdminSittingsListingSearchParams,
} from "@/lib/listing/admin-sittings-listing";
import { orpc } from "@/utils/orpc";

function formatDate(date: Date) {
	return new Intl.DateTimeFormat(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(date);
}

function formatDateTime(date: Date) {
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(date);
}

export function AdminSittingsTable() {
	const [params, setParams] = useAdminSittingsListingSearchParams();
	const listInput = toAdminSittingsListCallInput(params);

	const { data, isPending, isError, error, refetch } = useQuery(
		orpc.admin.listSittings.queryOptions({
			input: listInput,
		}),
	);

	return (
		<div className="flex flex-col gap-4">
			<AdminSittingsToolbar />

			{isPending ? (
				<Skeleton className="h-120 w-full" />
			) : isError ? (
				<div className="flex flex-col items-start gap-3 border border-dashed p-6">
					<p className="text-sm">
						{error?.message ?? "Could not load sittings."}
					</p>
					<Button variant="outline" size="sm" onClick={() => refetch()}>
						Try again
					</Button>
				</div>
			) : data.items.length === 0 ? (
				<div className="border border-dashed p-8 text-center">
					<p className="font-medium text-sm">No sittings match these filters</p>
					<p className="mt-1 text-muted-foreground text-sm">
						Try clearing search or filters.
					</p>
				</div>
			) : (
				<>
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Sitting</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="hidden md:table-cell">
										Selected book
									</TableHead>
									<TableHead className="hidden lg:table-cell">
										Deadline
									</TableHead>
									<TableHead className="text-right tabular-nums">
										Participants
									</TableHead>
									<TableHead className="hidden text-right tabular-nums sm:table-cell">
										Poll votes
									</TableHead>
									<TableHead className="hidden text-right tabular-nums xl:table-cell">
										Completed
									</TableHead>
									<TableHead className="hidden text-right tabular-nums xl:table-cell">
										DNF
									</TableHead>
									<TableHead className="hidden lg:table-cell">
										Telegram
									</TableHead>
									<TableHead className="hidden lg:table-cell">
										Started
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.items.map((sitting) => (
									<TableRow key={sitting.id}>
										<TableCell>
											<div className="flex min-w-0 flex-col gap-0.5">
												<Link
													href={`/sittings/${sitting.slug}` as Route}
													className="font-medium font-mono text-sm hover:underline"
												>
													{sitting.slug}
												</Link>
												{sitting.pollSlug ? (
													<p className="truncate text-muted-foreground text-xs">
														Poll: {sitting.pollSlug}
													</p>
												) : null}
											</div>
										</TableCell>
										<TableCell>
											<SittingStatusBadge status={sitting.status} />
										</TableCell>
										<TableCell className="hidden max-w-56 md:table-cell">
											{sitting.selectedBook ? (
												<div className="flex min-w-0 flex-col gap-1">
													<Link
														href={
															`/books/${sitting.selectedBook.slug}` as Route
														}
														className="line-clamp-2 font-medium text-sm hover:underline"
													>
														{sitting.selectedBook.title}
													</Link>
													<div className="flex flex-wrap items-center gap-2">
														<BookStatusBadge
															status={sitting.selectedBook.status}
														/>
														<span className="text-muted-foreground text-xs tabular-nums">
															{sitting.selectedBook.pages} pp
														</span>
													</div>
												</div>
											) : (
												<span className="text-muted-foreground text-sm">—</span>
											)}
										</TableCell>
										<TableCell className="hidden text-muted-foreground text-xs lg:table-cell">
											{formatDateTime(sitting.deadline)}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{sitting.counts.participants}
											<span className="hidden text-muted-foreground sm:inline">
												{" "}
												/ {sitting.counts.activeParticipants} active
											</span>
										</TableCell>
										<TableCell className="hidden text-right tabular-nums sm:table-cell">
											{sitting.counts.pollVotes}
										</TableCell>
										<TableCell className="hidden text-right tabular-nums xl:table-cell">
											{sitting.counts.completedParticipants}
										</TableCell>
										<TableCell className="hidden text-right tabular-nums xl:table-cell">
											{sitting.counts.dnfParticipants}
										</TableCell>
										<TableCell className="hidden lg:table-cell">
											{sitting.telegramPollAnnounced ? (
												<Badge variant="secondary">Announced</Badge>
											) : (
												<span className="text-muted-foreground text-xs">—</span>
											)}
										</TableCell>
										<TableCell className="hidden text-muted-foreground text-xs lg:table-cell">
											{formatDate(sitting.createdAt)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-muted-foreground text-sm tabular-nums">
							{data.metadata.total} sittings · Page {data.metadata.page} of{" "}
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
				</>
			)}
		</div>
	);
}
