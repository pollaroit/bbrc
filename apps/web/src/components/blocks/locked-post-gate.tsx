"use client";

import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { LockedItem } from "@/components/blocks/locked-item";
import { PostDetail } from "@/components/blocks/post-detail";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

/**
 * The shared, cached page of a friends-only post is the locked stub: it is built
 * for an anonymous visitor. A signed-in member who may open the post (a friend)
 * gets it here, per viewer, after load; everyone else keeps the stub.
 */
export function LockedPostGate({
	slug,
	author,
}: {
	slug: string;
	author: { name: string; username: string; image: string | null };
}) {
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const signedIn = Boolean(session?.user);
	const query = useQuery({
		...orpc.post.getPostBySlug.queryOptions({ input: slug }),
		enabled: signedIn,
		retry: false,
	});

	if (query.data) return <PostDetail post={query.data} />;

	if (sessionPending || (signedIn && query.isPending)) {
		return (
			<div className="mx-auto flex max-w-2xl flex-col gap-4" aria-hidden>
				<Skeleton className="h-6 w-40" />
				<Skeleton className="h-40 w-full" />
			</div>
		);
	}

	return <LockedItem kind="post" author={author} />;
}
