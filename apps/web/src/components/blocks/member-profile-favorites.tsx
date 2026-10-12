"use client";

import { useQuery } from "@tanstack/react-query";
import { MemberProfileBookPanel } from "@/components/blocks/member-profile-book-panel";
import { orpc } from "@/utils/orpc";

type MemberProfileFavoritesProps = {
	username: string;
	embedded?: boolean;
};

export function MemberProfileFavorites({
	username,
	embedded = false,
}: MemberProfileFavoritesProps) {
	const { data, isPending, isError } = useQuery(
		orpc.favorite.getUserFavorites.queryOptions({
			input: { username },
		}),
	);

	const items =
		data?.map((item) => ({
			id: item.id,
			title: item.book.title,
			slug: item.book.slug,
			coverId: item.book.coverId,
		})) ?? [];

	return (
		<MemberProfileBookPanel
			title="Favorite books"
			items={items.slice(0, 4)}
			isPending={isPending}
			isError={isError}
			embedded={embedded}
		/>
	);
}
