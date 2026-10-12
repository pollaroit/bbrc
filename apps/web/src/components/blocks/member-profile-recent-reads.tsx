"use client";

import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { MemberProfileBookPanel } from "@/components/blocks/member-profile-book-panel";
import { orpc } from "@/utils/orpc";

type MemberProfileRecentReadsProps = {
	username: string;
	embedded?: boolean;
};

export function MemberProfileRecentReads({
	username,
	embedded = false,
}: MemberProfileRecentReadsProps) {
	const { data, isPending, isError } = useQuery(
		orpc.read.listForUser.queryOptions({
			input: { username, limit: 4 },
		}),
	);

	const items =
		data?.items.map((item) => ({
			id: item.book.slug,
			title: item.book.title,
			slug: item.book.slug,
			coverId: item.book.coverId,
		})) ?? [];

	return (
		<MemberProfileBookPanel
			title="Recently read"
			viewAllHref={`/users/${username}/reads` as Route}
			viewAllLabel="All reads"
			items={items}
			isPending={isPending}
			isError={isError}
			embedded={embedded}
		/>
	);
}
