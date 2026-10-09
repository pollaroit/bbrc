"use client";

import type { ListAdminCommentsOutput } from "@bbrc/api/modules/admin/admin-comment.schema";
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
import { AdminCommentsToolbar } from "@/components/blocks/admin-comments-toolbar";
import { AdminListTableFooter } from "@/components/blocks/admin-list-table-footer";
import {
	ADMIN_TABLE_MOBILE_MIN_WIDTH,
	AdminListTableScroll,
} from "@/components/blocks/admin-list-table-scroll";
import { adminCommentsExportConfig } from "@/lib/admin-table-export/configs";
import {
	adminCommentContextLabels,
	toAdminCommentsListCallInput,
	useAdminCommentsListingSearchParams,
} from "@/lib/listing/admin-comments-listing";
import { orpc } from "@/utils/orpc";

type CommentItem = ListAdminCommentsOutput["items"][number];

function formatDate(date: Date) {
	return new Intl.DateTimeFormat(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(date);
}

const COMMENT_COLUMN_WIDTH = "w-[min(18rem,38vw)]";

function commentPublicHref(item: CommentItem): Route | null {
	if (item.context.type === "post" && item.context.postSlug) {
		return `/posts/${item.context.postSlug}/comments/${item.slug}` as Route;
	}
	if (
		item.context.type === "feedback" &&
		item.context.feedbackSlug &&
		item.context.bookSlug
	) {
		return `/books/${item.context.bookSlug}/feedbacks/${item.context.feedbackSlug}/comments/${item.slug}` as Route;
	}
	return null;
}

export function AdminCommentsTable() {
	const [params, setParams] = useAdminCommentsListingSearchParams();
	const listInput = toAdminCommentsListCallInput(params);

	const { data, isPending, isError, error, refetch } = useQuery(
		orpc.admin.listComments.queryOptions({
			input: listInput,
		}),
	);

	return (
		<div className="flex flex-col gap-4">
			<AdminCommentsToolbar />

			{isPending ? (
				<Skeleton className="h-120 w-full" />
			) : isError ? (
				<div className="flex flex-col items-start gap-3 border border-dashed p-6">
					<p className="text-sm">
						{error?.message ?? "Could not load comments."}
					</p>
					<Button variant="outline" size="sm" onClick={() => refetch()}>
						Try again
					</Button>
				</div>
			) : data.items.length === 0 ? (
				<>
					<div className="border border-dashed p-8 text-center">
						<p className="font-medium text-sm">
							No comments match these filters
						</p>
						<p className="mt-1 text-muted-foreground text-sm">
							Try clearing search or filters.
						</p>
					</div>
					<AdminListTableFooter
						summary={`${data.metadata.total} comments · Page ${data.metadata.page} of ${Math.max(data.metadata.totalPages, 1)}`}
						metadata={data.metadata}
						onPageChange={(page) => {
							void setParams({ page });
						}}
						exportConfig={adminCommentsExportConfig}
						listInput={listInput as Record<string, unknown>}
						currentPageItems={data.items}
					/>
				</>
			) : (
				<>
					<AdminListTableScroll>
						<Table className={`table-fixed ${ADMIN_TABLE_MOBILE_MIN_WIDTH}`}>
							<TableHeader>
								<TableRow>
									<TableHead className={COMMENT_COLUMN_WIDTH}>
										Comment
									</TableHead>
									<TableHead className="hidden md:table-cell">
										Context
									</TableHead>
									<TableHead className="hidden text-right tabular-nums sm:table-cell">
										Depth
									</TableHead>
									<TableHead className="hidden text-right tabular-nums md:table-cell">
										Likes
									</TableHead>
									<TableHead className="hidden text-right tabular-nums md:table-cell">
										Replies
									</TableHead>
									<TableHead>Author</TableHead>
									<TableHead className="hidden lg:table-cell">Edited</TableHead>
									<TableHead className="hidden xl:table-cell">Posted</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.items.map((comment) => {
									const href = commentPublicHref(comment);
									return (
										<TableRow key={comment.id}>
											<TableCell className={COMMENT_COLUMN_WIDTH}>
												<div className="flex min-w-0 flex-col gap-0.5 overflow-hidden">
													{href ? (
														<Link
															href={href}
															className="block truncate text-sm hover:underline"
															title={comment.content.trim()}
														>
															{comment.content.trim()}
														</Link>
													) : (
														<p
															className="truncate text-sm"
															title={comment.content.trim()}
														>
															{comment.content.trim()}
														</p>
													)}
													<p
														className="truncate font-mono text-muted-foreground text-xs"
														title={comment.slug}
													>
														{comment.slug}
													</p>
												</div>
											</TableCell>
											<TableCell className="hidden md:table-cell">
												<div className="flex flex-col gap-1">
													<Badge variant="secondary">
														{adminCommentContextLabels[comment.context.type]}
													</Badge>
													<p className="line-clamp-2 text-muted-foreground text-xs">
														{comment.context.type === "post" &&
														comment.context.postSlug ? (
															<Link
																href={
																	`/posts/${comment.context.postSlug}` as Route
																}
																className="hover:underline"
															>
																{comment.context.postSlug}
															</Link>
														) : null}
														{comment.context.type === "feedback" &&
														comment.context.feedbackSlug ? (
															<>
																{comment.context.bookSlug ? (
																	<Link
																		href={
																			`/books/${comment.context.bookSlug}` as Route
																		}
																		className="hover:underline"
																	>
																		{comment.context.bookTitle ??
																			comment.context.bookSlug}
																	</Link>
																) : null}
																{" · "}
																{comment.context.feedbackSlug}
															</>
														) : null}
													</p>
												</div>
											</TableCell>
											<TableCell className="hidden text-right tabular-nums sm:table-cell">
												{comment.depth}
											</TableCell>
											<TableCell className="hidden text-right tabular-nums md:table-cell">
												{comment.counts.likes}
											</TableCell>
											<TableCell className="hidden text-right tabular-nums md:table-cell">
												{comment.counts.replies}
											</TableCell>
											<TableCell>
												<Link
													href={`/users/${comment.author.username}` as Route}
													className="text-sm hover:underline"
												>
													@{comment.author.username}
												</Link>
											</TableCell>
											<TableCell className="hidden text-muted-foreground text-xs lg:table-cell">
												{comment.editedAt ? formatDate(comment.editedAt) : "—"}
											</TableCell>
											<TableCell className="hidden text-muted-foreground text-xs xl:table-cell">
												{formatDate(comment.createdAt)}
												{comment.imageUrl ? (
													<span className="ml-2 text-foreground">· image</span>
												) : null}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</AdminListTableScroll>

					<AdminListTableFooter
						summary={`${data.metadata.total} comments · Page ${data.metadata.page} of ${Math.max(data.metadata.totalPages, 1)}`}
						metadata={data.metadata}
						onPageChange={(page) => {
							void setParams({ page });
						}}
						exportConfig={adminCommentsExportConfig}
						listInput={listInput as Record<string, unknown>}
						currentPageItems={data.items}
					/>
				</>
			)}
		</div>
	);
}
