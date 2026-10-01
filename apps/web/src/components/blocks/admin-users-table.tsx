"use client";

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
import { Crown } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { AdminUserRowActions } from "@/components/blocks/admin-user-row-actions";
import { AdminUsersToolbar } from "@/components/blocks/admin-users-toolbar";
import { UserStatusBadge } from "@/components/blocks/user-status-badge";
import {
	toAdminUsersListCallInput,
	useAdminUsersListingSearchParams,
} from "@/lib/listing/admin-users-listing";
import { orpc } from "@/utils/orpc";

function formatJoined(date: Date) {
	return new Intl.DateTimeFormat(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(date);
}

export function AdminUsersTable() {
	const [params, setParams] = useAdminUsersListingSearchParams();
	const listInput = toAdminUsersListCallInput(params);

	const { data, isPending, isError, error, refetch } = useQuery(
		orpc.admin.listUsers.queryOptions({
			input: listInput,
		}),
	);

	return (
		<div className="flex flex-col gap-4">
			<AdminUsersToolbar />

			{isPending ? (
				<Skeleton className="h-[480px] w-full" />
			) : isError ? (
				<div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-6">
					<p className="text-sm">
						{error?.message ?? "Could not load members."}
					</p>
					<Button variant="outline" size="sm" onClick={() => refetch()}>
						Try again
					</Button>
				</div>
			) : data.items.length === 0 ? (
				<div className="rounded-lg border border-dashed p-8 text-center">
					<p className="font-medium text-sm">No members match these filters</p>
					<p className="mt-1 text-muted-foreground text-sm">
						Try clearing search or filters.
					</p>
				</div>
			) : (
				<>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Member</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="text-right tabular-nums">XP</TableHead>
								<TableHead className="text-right tabular-nums">RP</TableHead>
								<TableHead className="hidden text-right tabular-nums lg:table-cell">
									Posts
								</TableHead>
								<TableHead className="hidden text-right tabular-nums md:table-cell">
									Comments
								</TableHead>
								<TableHead className="hidden text-right tabular-nums xl:table-cell">
									Likes
								</TableHead>
								<TableHead className="hidden text-right tabular-nums xl:table-cell">
									Feedbacks
								</TableHead>
								<TableHead className="w-12">
									<span className="sr-only">Actions</span>
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.items.map((user) => (
								<TableRow key={user.id}>
									<TableCell>
										<div className="flex min-w-0 flex-col gap-0.5">
											<Link
												href={`/users/${user.username}` as Route}
												className="flex min-w-0 items-center gap-1.5 font-medium hover:underline"
											>
												<span className="truncate">{user.name}</span>
												{user.isAdmin ? (
													<Crown
														className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400"
														aria-label="Administrator"
													/>
												) : null}
											</Link>
											<p className="truncate text-muted-foreground text-xs">
												@{user.username}, {user.email}
											</p>
											<p className="text-muted-foreground text-xs lg:hidden">
												Joined {formatJoined(user.createdAt)}
											</p>
										</div>
									</TableCell>
									<TableCell>
										<div className="flex flex-col gap-1">
											<UserStatusBadge status={user.status} />
										</div>
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{user.xp}
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{user.rp}
									</TableCell>
									<TableCell className="hidden text-right tabular-nums lg:table-cell">
										{user.counts.posts}
									</TableCell>
									<TableCell className="hidden text-right tabular-nums md:table-cell">
										{user.counts.comments}
									</TableCell>
									<TableCell className="hidden text-right tabular-nums xl:table-cell">
										{user.counts.likes}
									</TableCell>
									<TableCell className="hidden text-right tabular-nums xl:table-cell">
										{user.counts.feedbacks}
									</TableCell>
									<TableCell>
										<AdminUserRowActions user={user} />
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>

					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-muted-foreground text-sm tabular-nums">
							{data.metadata.total} members · Page {data.metadata.page} of{" "}
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
