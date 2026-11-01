"use client";

import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { PostDetail } from "@/components/blocks/post-detail";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

/**
 * Published posts are cached for anonymous visitors. Scheduled posts are owner-only
 * and load here after sign-in.
 */
export function ScheduledPostGate({ slug }: { slug: string }) {
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const signedIn = Boolean(session?.user);
	const query = useQuery({
		...orpc.post.getPostBySlug.queryOptions({ input: slug }),
		enabled: signedIn,
		retry: false,
	});

	if (sessionPending) {
		return (
			<div className="mx-auto flex max-w-2xl flex-col gap-4" aria-hidden>
				<Skeleton className="h-6 w-40" />
				<Skeleton className="h-40 w-full" />
			</div>
		);
	}

	if (!signedIn) {
		notFound();
	}

	if (query.isPending) {
		return (
			<div className="mx-auto flex max-w-2xl flex-col gap-4" aria-hidden>
				<Skeleton className="h-6 w-40" />
				<Skeleton className="h-40 w-full" />
			</div>
		);
	}

	if (query.data?.status === "scheduled") {
		return <PostDetail post={query.data} scheduledPreview />;
	}

	if (query.data) {
		return <PostDetail post={query.data} />;
	}

	notFound();
}
