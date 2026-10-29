"use client";

import { Button } from "@bbrc/ui/components/button";
import { Eye } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { ViewCountLabel } from "@/components/blocks/view-count-label";
import { authClient } from "@/lib/auth-client";
import { isPendingSlug } from "@/lib/optimistic/infinite-lists";
import { useViewCounts } from "@/lib/views/use-view-counts";

const compact = new Intl.NumberFormat("en", {
	notation: "compact",
	maximumFractionDigits: 1,
});

type PostViewsActionProps = {
	slug: string;
	authorUsername: string;
	count: number | undefined;
	className?: string;
};

/**
 * The eye beside a post's other actions. For the people who may see insights
 * (the author and admins; the server checks again) it opens them, even before
 * the first view. Everyone else only sees the public count, when there is one.
 */
export function PostViewsAction({
	slug,
	authorUsername,
	count,
	className,
}: PostViewsActionProps) {
	const { data: session } = authClient.useSession();
	const canSeeInsights =
		!isPendingSlug(slug) &&
		Boolean(session?.user) &&
		(session?.user.isAdmin === true ||
			session?.user.username === authorUsername);

	if (!canSeeInsights) {
		return <ViewCountLabel count={count} className={className ?? "px-2"} />;
	}

	const views = count ?? 0;
	return (
		<Button
			render={<Link href={`/posts/${slug}/insights` as Route} />}
			nativeButton={false}
			variant="ghost"
			size="sm"
			className="gap-1.5 tabular-nums"
			aria-label={`Post insights, ${views.toLocaleString("en-US")} ${views === 1 ? "view" : "views"}`}
			title="Insights"
		>
			<Eye className="size-4" aria-hidden />
			{views > 0 ? compact.format(views) : null}
		</Button>
	);
}

/** Same, with the public view count loaded for server-rendered pages. */
export function LivePostViewsAction({
	slug,
	authorUsername,
}: Omit<PostViewsActionProps, "count" | "className">) {
	const counts = useViewCounts("post", [slug]);
	return (
		<PostViewsAction
			slug={slug}
			authorUsername={authorUsername}
			count={counts[slug]}
		/>
	);
}
