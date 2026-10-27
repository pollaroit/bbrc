"use client";

import { InfiniteScroll } from "@bbrc/ui/components/infinite-scroll";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import {
	AuthorTabEmptyContent,
	AuthorTabSkeleton,
} from "@/components/blocks/author/author-tab-shell";
import { PostCard } from "@/components/blocks/post-card";
import { useViewCounts } from "@/lib/views/use-view-counts";
import { orpc } from "@/utils/orpc";

const LIMIT = 10;

export function AuthorTabPosts({
	slug,
	authorName,
}: {
	slug: string;
	authorName: string;
}) {
	const t = useTranslations("authors");
	const query = useInfiniteQuery(
		orpc.author.posts.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (last) => last.metadata.nextCursor ?? undefined,
			input: (cursor) => ({
				slug,
				limit: LIMIT,
				...(cursor != null ? { cursor } : {}),
			}),
		}),
	);
	const posts = query.data?.pages.flatMap((page) => page.items) ?? [];
	const viewCounts = useViewCounts(
		"post",
		posts.map((post) => post.slug),
	);

	return (
		<InfiniteScroll
			className="flex flex-col gap-4"
			hasNextPage={query.hasNextPage}
			isFetchingNextPage={query.isFetchingNextPage}
			fetchNextPage={() => {
				void query.fetchNextPage();
			}}
			isPending={query.isPending}
			isError={query.isError}
			error={query.error}
			onRetry={() => {
				void query.refetch();
			}}
			isEmpty={posts.length === 0}
			emptyContent={
				<AuthorTabEmptyContent
					authorSlug={slug}
					text={t("posts.empty", { name: authorName })}
					linkLabel={t("posts.backToOverview")}
					href={`/authors/${slug}` as Route}
				/>
			}
			loadingContent={<AuthorTabSkeleton variant="list" />}
			endMessage={t("posts.end")}
		>
			<ul className="flex flex-col gap-4">
				{posts.map((post) => (
					<li key={post.slug}>
						<PostCard
							post={post}
							impressionSource="other"
							viewCount={viewCounts[post.slug]}
						/>
					</li>
				))}
			</ul>
		</InfiniteScroll>
	);
}
