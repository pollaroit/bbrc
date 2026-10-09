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
import { AdminListTableFooter } from "@/components/blocks/admin-list-table-footer";
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

const POST_COLUMN_WIDTH = "w-[min(18rem,38vw)]";

export function AdminPostsTable() {
	const [params, setParams] = useAdminPostsListingSearchParams();
	const listInput = toAdminPostsListCallInput(params);

	const { data, isPending, isError, error, refetch } = useQuery(
		orpc.admin.listPosts.queryOptions({
			input: listInput,
		}),
	);

	return (
		<div className="flex flex-col gap-4">
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
					<div className="overflow-x-auto">
						<Table className="table-fixed">
							<TableHeader>
								<TableRow>
									<TableHead className={POST_COLUMN_WIDTH}>Post</TableHead>
									<TableHead>Author</TableHead>
									<TableHead className="hidden text-right tabular-nums md:table-cell">
										Likes
									</TableHead>
									<TableHead className="hidden text-right tabular-nums md:table-cell">
										Comments
									</TableHead>
									<TableHead className="hidden lg:table-cell">
										Attachment
									</TableHead>
									<TableHead className="hidden lg:table-cell">Book</TableHead>
									<TableHead className="hidden xl:table-cell">Posted</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.items.map((post) => (
									<TableRow key={post.id}>
										<TableCell className={POST_COLUMN_WIDTH}>
											<div className="flex min-w-0 flex-col gap-0.5 overflow-hidden">
												<Link
													href={`/posts/${post.slug}` as Route}
													className="block truncate text-sm hover:underline"
													title={post.content.trim()}
												>
													{post.content.trim()}
												</Link>
												<p
													className="truncate font-mono text-muted-foreground text-xs"
													title={post.slug}
												>
													{post.slug}
													{post.editedAt ? " · edited" : null}
												</p>
											</div>
										</TableCell>
										<TableCell>
											<Link
												href={`/users/${post.author.username}` as Route}
												className="text-sm hover:underline"
											>
												@{post.author.username}
											</Link>
										</TableCell>
										<TableCell className="hidden text-right tabular-nums md:table-cell">
											{post.counts.likes}
										</TableCell>
										<TableCell className="hidden text-right tabular-nums md:table-cell">
											{post.counts.comments}
										</TableCell>
										<TableCell className="hidden lg:table-cell">
											{post.attachmentKind ? (
												<Badge variant="secondary">
													{adminPostAttachmentKindLabels[post.attachmentKind]}
												</Badge>
											) : (
												<span className="text-muted-foreground text-xs">—</span>
											)}
										</TableCell>
										<TableCell className="hidden max-w-48 lg:table-cell">
											{post.attachedBook ? (
												<Link
													href={`/books/${post.attachedBook.slug}` as Route}
													className="line-clamp-2 text-sm hover:underline"
												>
													{post.attachedBook.title}
												</Link>
											) : (
												<span className="text-muted-foreground text-xs">—</span>
											)}
										</TableCell>
										<TableCell className="hidden text-muted-foreground text-xs xl:table-cell">
											{formatDate(post.createdAt)}
											{post.imageUrl ? (
												<span className="ml-2 text-foreground">· image</span>
											) : null}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
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
			)}
		</div>
	);
}
