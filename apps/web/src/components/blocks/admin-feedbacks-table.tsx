"use client";

import { contentPlainText } from "@bbrc/shared";
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
import { AdminFeedbacksToolbar } from "@/components/blocks/admin-feedbacks-toolbar";
import { AdminListTableFooter } from "@/components/blocks/admin-list-table-footer";
import {
	ADMIN_TABLE_MOBILE_MIN_WIDTH,
	AdminListTableScroll,
} from "@/components/blocks/admin-list-table-scroll";
import { BookStatusBadge } from "@/components/blocks/book-status-badge";
import { adminFeedbacksExportConfig } from "@/lib/admin-table-export/configs";
import {
	toAdminFeedbacksListCallInput,
	useAdminFeedbacksListingSearchParams,
} from "@/lib/listing/admin-feedbacks-listing";
import { orpc } from "@/utils/orpc";

function formatDate(date: Date) {
	return new Intl.DateTimeFormat(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(date);
}

function feedbackPublicHref(bookSlug: string, feedbackSlug: string): Route {
	return `/books/${bookSlug}/feedbacks/${feedbackSlug}` as Route;
}

export function AdminFeedbacksTable() {
	const [params, setParams] = useAdminFeedbacksListingSearchParams();
	const listInput = toAdminFeedbacksListCallInput(params);

	const { data, isPending, isError, error, refetch } = useQuery(
		orpc.admin.listFeedbacks.queryOptions({
			input: listInput,
		}),
	);

	return (
		<div className="flex flex-col gap-4">
			<AdminFeedbacksToolbar />

			{isPending ? (
				<Skeleton className="h-120 w-full" />
			) : isError ? (
				<div className="flex flex-col items-start gap-3 border border-dashed p-6">
					<p className="text-sm">
						{error?.message ?? "Could not load feedbacks."}
					</p>
					<Button variant="outline" size="sm" onClick={() => refetch()}>
						Try again
					</Button>
				</div>
			) : data.items.length === 0 ? (
				<>
					<div className="border border-dashed p-8 text-center">
						<p className="font-medium text-sm">
							No feedbacks match these filters
						</p>
						<p className="mt-1 text-muted-foreground text-sm">
							Try clearing search or filters.
						</p>
					</div>
					<AdminListTableFooter
						summary={`${data.metadata.total} feedbacks · Page ${data.metadata.page} of ${Math.max(data.metadata.totalPages, 1)}`}
						metadata={data.metadata}
						onPageChange={(page) => {
							void setParams({ page });
						}}
						exportConfig={adminFeedbacksExportConfig}
						listInput={listInput as Record<string, unknown>}
						currentPageItems={data.items}
					/>
				</>
			) : (
				<>
					<AdminListTableScroll>
						<Table className={ADMIN_TABLE_MOBILE_MIN_WIDTH}>
							<TableHeader>
								<TableRow>
									<TableHead>Book</TableHead>
									<TableHead>Author</TableHead>
									<TableHead className="text-right tabular-nums">
										Rating
									</TableHead>
									<TableHead className="hidden md:table-cell">Review</TableHead>
									<TableHead className="hidden text-right tabular-nums lg:table-cell">
										Likes
									</TableHead>
									<TableHead className="hidden text-right tabular-nums lg:table-cell">
										Comments
									</TableHead>
									<TableHead className="hidden text-right tabular-nums xl:table-cell">
										Posts
									</TableHead>
									<TableHead className="hidden lg:table-cell">
										Submitted
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.items.map((feedback) => {
									const href = feedbackPublicHref(
										feedback.book.slug,
										feedback.slug,
									);

									return (
										<TableRow key={feedback.id}>
											<TableCell>
												<div className="flex min-w-0 flex-col gap-1">
													<Link
														href={`/books/${feedback.book.slug}` as Route}
														className="line-clamp-2 font-medium text-sm hover:underline"
													>
														{feedback.book.title}
													</Link>
													<div className="flex flex-wrap items-center gap-2">
														<BookStatusBadge status={feedback.book.status} />
														<span className="text-muted-foreground text-xs tabular-nums">
															{feedback.book.pages} pp
														</span>
													</div>
												</div>
											</TableCell>
											<TableCell>
												<Link
													href={`/users/${feedback.author.username}` as Route}
													className="font-medium text-sm hover:underline"
												>
													{feedback.author.name ?? feedback.author.username}
												</Link>
												<p className="font-mono text-muted-foreground text-xs">
													@{feedback.author.username}
												</p>
											</TableCell>
											<TableCell className="text-right tabular-nums">
												<Link
													href={href}
													className="font-medium hover:underline"
												>
													{feedback.rating.toFixed(1)}
												</Link>
											</TableCell>
											<TableCell className="hidden max-w-md md:table-cell">
												<Link href={href} className="block hover:underline">
													<p className="line-clamp-2 text-sm">
														{(() => {
															const reviewText = contentPlainText(
																feedback.review ?? "",
															);
															return reviewText.trim()
																? reviewText
																: "No written review";
														})()}
													</p>
													<p className="mt-0.5 text-muted-foreground text-xs tabular-nums">
														{feedback.reviewLength} chars · {feedback.slug}
													</p>
												</Link>
											</TableCell>
											<TableCell className="hidden text-right tabular-nums lg:table-cell">
												{feedback.counts.likes}
											</TableCell>
											<TableCell className="hidden text-right tabular-nums lg:table-cell">
												{feedback.counts.comments}
											</TableCell>
											<TableCell className="hidden text-right tabular-nums xl:table-cell">
												{feedback.counts.postAttachments}
											</TableCell>
											<TableCell className="hidden text-muted-foreground text-xs lg:table-cell">
												{formatDate(feedback.createdAt)}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</AdminListTableScroll>

					<AdminListTableFooter
						summary={`${data.metadata.total} feedbacks · Page ${data.metadata.page} of ${Math.max(data.metadata.totalPages, 1)}`}
						metadata={data.metadata}
						onPageChange={(page) => {
							void setParams({ page });
						}}
						exportConfig={adminFeedbacksExportConfig}
						listInput={listInput as Record<string, unknown>}
						currentPageItems={data.items}
					/>
				</>
			)}
		</div>
	);
}
