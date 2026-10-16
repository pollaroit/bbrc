"use client";

import { contentPlainText } from "@bbrc/shared";
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
import { AdminListTableFooter } from "@/components/blocks/admin-list-table-footer";
import {
	ADMIN_TABLE_MOBILE_MIN_WIDTH,
	AdminListTableScroll,
} from "@/components/blocks/admin-list-table-scroll";
import { AdminPostsToolbar } from "@/components/blocks/admin-posts-toolbar";
import { adminPostsExportConfig } from "@/lib/admin-table-export/configs";
import {
	adminPostAttachmentKindLabels,
	toAdminPostsListCallInput,
	useAdminPostsListingSearchParams,
} from "@/lib/listing/admin-posts-listing";
import { orpc } from "@/utils/orpc";

function formatDate(date: Date) {
	return new Intl.DateTimeFormat(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(date);
}

/** Override default table cell nowrap so long post text wraps inside fixed columns. */
const WRAP_CELL =
	"whitespace-normal break-words align-top [overflow-wrap:anywhere]";

export function AdminPostsTable() {
	const [params, setParams] = useAdminPostsListingSearchParams();
	const listInput = toAdminPostsListCallInput(params);

	const { data, isPending, isError, error, refetch } = useQuery(
		orpc.admin.listPosts.queryOptions({
			input: listInput,
		}),
	);

	return (
		<div className="flex min-w-0 flex-col gap-4">
			<AdminPostsToolbar />

			{isPending ? (
				<Skeleton className="h-120 w-full" />
			) : isError ? (
				<div className="flex flex-col items-start gap-3 border border-dashed p-6">
					<p className="text-sm">{error?.message ?? "Could not load posts."}</p>
					<Button variant="outline" size="sm" onClick={() => refetch()}>
						Try again
					</Button>
				</div>
			) : data.items.length === 0 ? (
				<>
					<div className="border border-dashed p-8 text-center">
						<p className="font-medium text-sm">No posts match these filters</p>
						<p className="mt-1 text-muted-foreground text-sm">
							Try clearing search or filters.
						</p>
					</div>
					<AdminListTableFooter
						summary={`${data.metadata.total} posts · Page ${data.metadata.page} of ${Math.max(data.metadata.totalPages, 1)}`}
						metadata={data.metadata}
						onPageChange={(page) => {
							void setParams({ page });
						}}
						exportConfig={adminPostsExportConfig}
						listInput={listInput as Record<string, unknown>}
						currentPageItems={data.items}
					/>
				</>
			) : (
				<>
					<AdminListTableScroll>
						<Table
							className={`w-full table-fixed md:min-w-0 ${ADMIN_TABLE_MOBILE_MIN_WIDTH}`}
						>
							<TableHeader>
								<TableRow>
									<TableHead className={`${WRAP_CELL} w-[34%]`}>Post</TableHead>
									<TableHead className={`${WRAP_CELL} w-[14%]`}>
										Author
									</TableHead>
									<TableHead
										className={`${WRAP_CELL} hidden w-[8%] text-right tabular-nums md:table-cell`}
									>
										Likes
									</TableHead>
									<TableHead
										className={`${WRAP_CELL} hidden w-[8%] text-right tabular-nums md:table-cell`}
									>
										Comments
									</TableHead>
									<TableHead
										className={`${WRAP_CELL} hidden w-[12%] lg:table-cell`}
									>
										Attachment
									</TableHead>
									<TableHead
										className={`${WRAP_CELL} hidden w-[14%] lg:table-cell`}
									>
										Book
									</TableHead>
									<TableHead
										className={`${WRAP_CELL} hidden w-[12%] xl:table-cell`}
									>
										Posted
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.items.map((post) => (
									<TableRow key={post.id}>
										<TableCell className={`${WRAP_CELL} max-w-0`}>
											<div className="flex min-w-0 flex-col gap-0.5 overflow-hidden">
												<Link
													href={`/posts/${post.slug}` as Route}
													className="line-clamp-3 block text-sm hover:underline"
													title={contentPlainText(post.content)}
												>
													{contentPlainText(post.content)}
												</Link>
												<p
													className="line-clamp-1 font-mono text-muted-foreground text-xs [overflow-wrap:anywhere]"
													title={post.slug}
												>
													{post.slug}
													{post.editedAt ? " · edited" : null}
												</p>
											</div>
										</TableCell>
										<TableCell className={`${WRAP_CELL} max-w-0`}>
											<Link
												href={`/users/${post.author.username}` as Route}
												className="line-clamp-2 block text-sm [overflow-wrap:anywhere] hover:underline"
											>
												@{post.author.username}
											</Link>
										</TableCell>
										<TableCell
											className={`${WRAP_CELL} hidden text-right tabular-nums md:table-cell`}
										>
											{post.counts.likes}
										</TableCell>
										<TableCell
											className={`${WRAP_CELL} hidden text-right tabular-nums md:table-cell`}
										>
											{post.counts.comments}
										</TableCell>
										<TableCell className={`${WRAP_CELL} hidden lg:table-cell`}>
											{post.attachmentKind ? (
												<Badge
													variant="secondary"
													className="whitespace-normal"
												>
													{adminPostAttachmentKindLabels[post.attachmentKind]}
												</Badge>
											) : (
												<span className="text-muted-foreground text-xs">—</span>
											)}
										</TableCell>
										<TableCell
											className={`${WRAP_CELL} hidden max-w-0 lg:table-cell`}
										>
											{post.attachedBook ? (
												<Link
													href={`/books/${post.attachedBook.slug}` as Route}
													className="line-clamp-2 block text-sm [overflow-wrap:anywhere] hover:underline"
												>
													{post.attachedBook.title}
												</Link>
											) : (
												<span className="text-muted-foreground text-xs">—</span>
											)}
										</TableCell>
										<TableCell
											className={`${WRAP_CELL} hidden text-muted-foreground text-xs xl:table-cell`}
										>
											{formatDate(post.createdAt)}
											{post.imageUrl ? (
												<span className="ml-2 text-foreground">· image</span>
											) : null}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</AdminListTableScroll>

					<AdminListTableFooter
						summary={`${data.metadata.total} posts · Page ${data.metadata.page} of ${Math.max(data.metadata.totalPages, 1)}`}
						metadata={data.metadata}
						onPageChange={(page) => {
							void setParams({ page });
						}}
						exportConfig={adminPostsExportConfig}
						listInput={listInput as Record<string, unknown>}
						currentPageItems={data.items}
					/>
				</>
			)}
		</div>
	);
}
