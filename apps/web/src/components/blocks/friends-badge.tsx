"use client";

import { authClient } from "@/lib/auth-client";
import { useFriendBadge } from "@/lib/friends/use-friends";

/** The number of friend requests waiting for an answer, or nothing. */
export function FriendsBadge() {
	const { data: session } = authClient.useSession();
	const query = useFriendBadge(Boolean(session?.user));
	const count = query.data?.incoming ?? 0;
	if (count === 0) return null;
	const label = `${count} friend ${count === 1 ? "request" : "requests"} waiting`;
	return (
		<span className="ml-auto min-w-5 bg-primary px-1.5 py-0.5 text-center font-medium text-2xs text-primary-foreground tabular-nums">
			<span aria-hidden>{count > 99 ? "99+" : count}</span>
			<span className="sr-only">{label}</span>
		</span>
	);
}
