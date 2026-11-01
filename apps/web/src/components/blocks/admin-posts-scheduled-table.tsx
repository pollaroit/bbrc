"use client";

import { useEffect } from "react";
import { AdminPostsTable } from "@/components/blocks/admin-posts-table";
import { useAdminPostsListingSearchParams } from "@/lib/listing/admin-posts-listing";

/** Admin queue of posts with `status=scheduled` (delete via row link to public page / member tools). */
export function AdminPostsScheduledTable() {
	const [, setParams] = useAdminPostsListingSearchParams();

	useEffect(() => {
		void setParams({ status: "scheduled", page: 1 });
	}, [setParams]);

	return (
		<div className="flex flex-col gap-3">
			<p className="text-muted-foreground text-sm">
				Showing scheduled posts only. There is no admin edit; delete removes the
				post before it goes live.
			</p>
			<AdminPostsTable />
		</div>
	);
}
