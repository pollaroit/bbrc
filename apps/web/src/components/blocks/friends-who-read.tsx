"use client";

import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { authClient } from "@/lib/auth-client";
import { whoReadLabel } from "@/lib/friends/who-read-label";
import { orpc } from "@/utils/orpc";

/** Friends of the signed-in viewer who read or are reading this book. Client-only: the page is cached. */
export function FriendsWhoRead({ bookSlug }: { bookSlug: string }) {
	const { data: session } = authClient.useSession();
	const signedIn = Boolean(session?.user);
	const { data } = useQuery({
		...orpc.friend.whoRead.queryOptions({ input: { bookSlug } }),
		enabled: signedIn,
		staleTime: 60_000,
	});

	if (!signedIn || !data || data.items.length === 0) {
		return null;
	}

	return (
		<div className="flex flex-wrap items-center gap-3">
			<ul className="flex items-center gap-1.5">
				{data.items.map((friend) => (
					<li key={friend.username}>
						<Link
							href={`/users/${friend.username}` as Route}
							title={`${friend.name} ${friend.state === "reading" ? "is reading this" : "read this"}`}
						>
							<UserAvatar user={friend} className="size-8" />
						</Link>
					</li>
				))}
			</ul>
			<p className="text-muted-foreground text-sm">
				{whoReadLabel(data.items, data.total)}
			</p>
		</div>
	);
}
